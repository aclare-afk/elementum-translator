// Salesforce sObject REST API — Case.
//
// One catch-all route handler for the whole sObject because Salesforce REST
// uses positional Id segments — `/sobjects/Case/<Id>` and (rarely)
// `/sobjects/Case/<externalIdField>/<value>` for upserts. The catch-all
// gets the raw segments and we parse them.
//
// URL path mirrors real Salesforce exactly (PLATFORMS/salesforce.md § API
// SURFACE > sObject REST endpoints):
//
//   /demos/salesforce-case-smoke/api/services/data/v63.0/sobjects/Case
//     POST                                                    # create
//     GET                                                     # basic info
//     /<Id>                            GET                    # retrieve
//     /<Id>                            PATCH                  # update (not implemented)
//     /<Id>                            DELETE                 # delete (not implemented)
//
// On a real Salesforce tenant the prefix would be
// `https://<my-domain>.my.salesforce.com` (no `/demos/salesforce-case-smoke/`),
// but the suffix from `/services/data/v63.0/...` onward is byte-identical.
// Elementum's `api_task` doesn't care about the prefix; it just needs the
// body and headers right.
//
// Auth note: real Salesforce requires `Authorization: Bearer <access_token>`
// with a valid session. The mock is lenient — any bearer (or none) is
// accepted, mirroring what the OAuth token endpoint mints. Strict bearer
// validation would surprise SEs in demo prep — this is the pragmatic shape.

import { NextRequest, NextResponse } from "next/server";
import {
  listCases,
  getCaseById,
  createCase,
  shapeCaseForApi,
  shapeCreateResponse,
  shapeError,
  type CreateCaseInput,
} from "../../../../../../../_lib/store";
import type {
  CasePriority,
  CaseOrigin,
  CaseReason,
  SalesforceCaseStatus,
} from "../../../../../../../data/types";

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

const VALID_STATUSES: SalesforceCaseStatus[] = [
  "New",
  "Working",
  "Escalated",
  "Closed",
];
const VALID_PRIORITIES: CasePriority[] = ["Low", "Medium", "High"];
const VALID_ORIGINS: CaseOrigin[] = ["Phone", "Email", "Web", "Chat"];
const VALID_REASONS: CaseReason[] = [
  "Installation",
  "Equipment Complexity",
  "Performance",
  "Breakdown",
  "Equipment Design",
  "Feedback",
  "Other",
];

// ---- Path parsing ---------------------------------------------------------

type ParsedPath =
  | { kind: "object-root" }
  | { kind: "record"; id: string }
  | { kind: "unknown"; raw: string };

/**
 * Parse the path segments after `/sobjects/Case/`. Examples:
 *   []                                  -> object-root (POST=create, GET=basic info)
 *   ["5005g00000K9aP1AAJ"]               -> record (GET=retrieve)
 *
 * Note: `/sobjects/Case/<externalIdField>/<value>` upsert IS a real path
 * but rare in demo flows. We don't implement it; it falls through to
 * `unknown`.
 */
function parsePath(segments: string[]): ParsedPath {
  if (segments.length === 0) return { kind: "object-root" };
  if (segments.length === 1) {
    return { kind: "record", id: segments[0] };
  }
  return { kind: "unknown", raw: segments.join("/") };
}

// ---- GET ------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params;
  const parsed = parsePath(path ?? []);
  const root = baseUrl(req);

  switch (parsed.kind) {
    case "object-root": {
      // `GET /sobjects/Case/` returns object-level basic info per § API
      // SURFACE. Real Salesforce returns `objectDescribe` + `recentItems`;
      // the smoke trims to the most-used fields.
      const all = await listCases();
      return NextResponse.json({
        objectDescribe: {
          name: "Case",
          label: "Case",
          labelPlural: "Cases",
          keyPrefix: "500",
          custom: false,
          activateable: false,
          createable: true,
          deletable: true,
          updateable: true,
          queryable: true,
          searchable: true,
          urls: {
            sobject: `/services/data/v63.0/sobjects/Case`,
            describe: `/services/data/v63.0/sobjects/Case/describe`,
            rowTemplate: `/services/data/v63.0/sobjects/Case/{ID}`,
          },
        },
        // Real Salesforce returns the 3-5 most recently viewed records
        // for the current user. The mock returns the 3 most recent in
        // store-order — a reasonable proxy and useful for "did the
        // create work?" smoke checks.
        recentItems: all
          .slice(0, 3)
          .map((c) => shapeCaseForApi(c, root)),
      });
    }

    case "record": {
      const c = await getCaseById(parsed.id);
      if (!c) {
        return NextResponse.json(
          shapeError(
            "NOT_FOUND",
            `Provided external ID field does not exist or is not accessible: ${parsed.id}`,
          ),
          { status: 404 },
        );
      }
      return NextResponse.json(shapeCaseForApi(c, root));
    }

    case "unknown":
      return NextResponse.json(
        shapeError(
          "NOT_FOUND",
          `Could not resolve path '/${parsed.raw}' against Case sObject.`,
        ),
        { status: 404 },
      );
  }
}

// ---- POST -----------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path } = await params;
  const parsed = parsePath(path ?? []);

  if (parsed.kind !== "object-root") {
    return NextResponse.json(
      shapeError(
        "METHOD_NOT_ALLOWED",
        "POST is only supported on /sobjects/Case (no record id).",
      ),
      { status: 405 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      shapeError(
        "JSON_PARSER_ERROR",
        "Request body could not be parsed as JSON.",
      ),
      { status: 400 },
    );
  }

  // Real Salesforce uses Salesforce-API-flavored field names — pascalCase
  // for standard fields, `<api>__c` for custom. The mock accepts the real
  // pascalCase shape AND a friendly camelCase shorthand (subject vs Subject)
  // because SEs writing api_task config by hand commonly mix conventions
  // and we'd rather forgive that than fail silently.
  const subject = pickString(body.Subject, body.subject);
  const description =
    pickString(body.Description, body.description) ?? "";

  const statusRaw =
    pickString(body.Status, body.status);
  const priorityRaw =
    pickString(body.Priority, body.priority);
  const originRaw =
    pickString(body.Origin, body.origin);
  const reasonRaw =
    pickString(body.Reason, body.reason);

  const accountId =
    pickString(body.AccountId, body.accountId);
  const accountName =
    pickString(body.AccountName, body.accountName);
  const contactId =
    pickString(body.ContactId, body.contactId);
  const contactName =
    pickString(body.ContactName, body.contactName);
  const contactEmail =
    pickString(body.ContactEmail, body.contactEmail);
  const ownerId =
    pickString(body.OwnerId, body.ownerId);
  const ownerName =
    pickString(body.OwnerName, body.ownerName);

  // Validation -------------------------------------------------------------
  // Subject is the only truly-required field on real Salesforce Case.
  // Everything else has org-level defaults or is nullable.
  if (!subject) {
    return NextResponse.json(
      shapeError(
        "REQUIRED_FIELD_MISSING",
        "Required fields are missing: [Subject]",
        ["Subject"],
      ),
      { status: 400 },
    );
  }

  let status: SalesforceCaseStatus | undefined;
  if (statusRaw) {
    if (!VALID_STATUSES.includes(statusRaw as SalesforceCaseStatus)) {
      return NextResponse.json(
        shapeError(
          "INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST",
          `Status: bad value for restricted picklist field: ${statusRaw}`,
          ["Status"],
        ),
        { status: 400 },
      );
    }
    status = statusRaw as SalesforceCaseStatus;
  }

  let priority: CasePriority | undefined;
  if (priorityRaw) {
    if (!VALID_PRIORITIES.includes(priorityRaw as CasePriority)) {
      return NextResponse.json(
        shapeError(
          "INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST",
          `Priority: bad value for restricted picklist field: ${priorityRaw}`,
          ["Priority"],
        ),
        { status: 400 },
      );
    }
    priority = priorityRaw as CasePriority;
  }

  let origin: CaseOrigin | undefined;
  if (originRaw) {
    if (!VALID_ORIGINS.includes(originRaw as CaseOrigin)) {
      return NextResponse.json(
        shapeError(
          "INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST",
          `Origin: bad value for restricted picklist field: ${originRaw}`,
          ["Origin"],
        ),
        { status: 400 },
      );
    }
    origin = originRaw as CaseOrigin;
  }

  let reason: CaseReason | undefined;
  if (reasonRaw) {
    if (!VALID_REASONS.includes(reasonRaw as CaseReason)) {
      return NextResponse.json(
        shapeError(
          "INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST",
          `Reason: bad value for restricted picklist field: ${reasonRaw}`,
          ["Reason"],
        ),
        { status: 400 },
      );
    }
    reason = reasonRaw as CaseReason;
  }

  const input: CreateCaseInput = {
    Subject: subject,
    Description: description,
    Status: status,
    Priority: priority,
    Origin: origin,
    Reason: reason,
    AccountId: accountId,
    AccountName: accountName,
    ContactId: contactId,
    ContactName: contactName,
    ContactEmail: contactEmail,
    OwnerId: ownerId,
    OwnerName: ownerName,
  };

  const created = await createCase(input);

  // Real Salesforce returns 201 Created with `{id, success, errors}` and
  // a Location header at the new record's retrieve URL. Integrations
  // typically ignore Location and follow up with a GET if they want the
  // full record — but the header is part of the contract.
  const root = baseUrl(req);
  const recordUrl = `${root}/services/data/v63.0/sobjects/Case/${created.Id}`;

  // Salesforce ALSO does not natively return the deep-link to the
  // Lightning record page in the response. We extend the body with a
  // non-standard `_mockViewUrl` (and merge in the full shaped record
  // under `record`) so the api_task can chat-reply with a clickable URL
  // without making a follow-up GET. Documented in the README.
  const responseBody = {
    ...shapeCreateResponse(created),
    _mockViewUrl: `${root}/demos/salesforce-case-smoke/lightning/r/Case/${created.Id}/view`,
    record: shapeCaseForApi(created, root),
  };

  return NextResponse.json(responseBody, {
    status: 201,
    headers: {
      Location: recordUrl,
    },
  });
}

// ---- Helpers --------------------------------------------------------------

// Defensive value handling per SKILL.md § "Search/filter endpoints —
// defensive value handling". Filter out chip-name literals like
// "ContactName", "ContactEmail", "OwnerName" — when the agent wires a
// chip but doesn't populate it, Elementum substitutes the chip's
// parameter name as the literal value. Drop those so the case isn't
// stored with bogus "ContactName" as the actual contact name.
const CHIP_NAME_LITERALS = new Set([
  "subject",
  "description",
  "status",
  "priority",
  "origin",
  "reason",
  "accountid",
  "account_id",
  "accountname",
  "account_name",
  "contactid",
  "contact_id",
  "contactname",
  "contact_name",
  "contactemail",
  "contact_email",
  "ownerid",
  "owner_id",
  "ownername",
  "owner_name",
  "submittername",
  "submitter_name",
  "submitteremail",
  "submitter_email",
]);

function pickString(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    if (typeof c !== "string") continue;
    const trimmed = c.trim();
    if (trimmed.length === 0) continue;
    const lc = trimmed.toLowerCase();
    if (lc === "null" || lc === "undefined") continue;
    if (CHIP_NAME_LITERALS.has(lc)) continue;
    return c;
  }
  return undefined;
}
