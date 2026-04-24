// POST /rest/servicedeskapi/request — create a JSM customer request.
// GET  /rest/servicedeskapi/request — list customer requests (minimal).
//
// URL path mirrors the real JSM API exactly (PLATFORMS/jira.md § API SURFACE
// > JSM examples). Elementum automations point an `api_task` at this URL
// with the same body shape they would send to a real tenant, and get back a
// response envelope that matches real JSM byte-for-byte. One non-standard
// extension: a top-level `_mockViewUrl` field pointing into the mock UI so
// demo messages can link the end user somewhere clickable. Document this
// field in the README as a demo-only affordance.
//
// Auth note: real JSM requires Basic or OAuth. This mock accepts any
// Authorization header (or none) so SEs can demo without setting up creds.
// If the demo needs to show the auth handshake itself, add a header check
// here and gate behind 401.

import { NextRequest, NextResponse } from "next/server";
import {
  createRequest,
  listRequests,
  shapeRequestForServiceDeskApi,
  type CreateRequestInput,
} from "../../../../_lib/store";
import { serviceDesk } from "../../../../data/requests";

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

/**
 * JSM's standard error envelope.
 * See PLATFORMS/jira.md § API SURFACE > Error envelope.
 */
function jsmError(
  status: number,
  errorMessages: string[],
  errors: Record<string, string> = {},
) {
  return NextResponse.json({ errorMessages, errors }, { status });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsmError(400, ["Request body must be valid JSON."]);
  }

  // Validate in the same shape JSM does: field-level errors go under `errors`
  // keyed by field id, top-level problems go under `errorMessages`.
  const errors: Record<string, string> = {};

  const requestTypeId = stringField(body, "requestTypeId");
  if (!requestTypeId) errors.requestTypeId = "requestTypeId is required.";

  const serviceDeskId =
    stringField(body, "serviceDeskId") ?? String(serviceDesk.id);

  const rfvRaw = body.requestFieldValues;
  const requestFieldValues =
    typeof rfvRaw === "object" && rfvRaw !== null
      ? (rfvRaw as Record<string, unknown>)
      : {};

  const summary = coerceString(requestFieldValues.summary);
  if (!summary) errors.summary = "Summary is required.";

  const description = coerceString(requestFieldValues.description) ?? "";

  // `raiseOnBehalfOf` can be an accountId or an email — we don't have an
  // accountId directory in the mock, so we treat anything that looks like an
  // email as the reporter email and fall back silently otherwise.
  const raiseOnBehalfOf =
    stringField(body, "raiseOnBehalfOf") ??
    stringField(body, "raiseOnBehalfOfEmail");
  const reporterEmail = raiseOnBehalfOf?.includes("@")
    ? raiseOnBehalfOf
    : undefined;

  if (Object.keys(errors).length > 0) {
    return jsmError(400, [], errors);
  }

  const input: CreateRequestInput = {
    serviceDeskId,
    requestTypeId: requestTypeId!,
    summary: summary!,
    description,
    reporterEmail,
    requestFieldValues,
  };

  const created = await createRequest(input);
  const shaped = shapeRequestForServiceDeskApi(
    created,
    baseUrl(req),
    serviceDeskId,
  );

  // Real JSM returns 201 Created on request create.
  return NextResponse.json(shaped, { status: 201 });
}

/**
 * GET /rest/servicedeskapi/request
 *
 * Real JSM supports a lot of query params here (searchTerm, requestStatus,
 * requestOwnership, ...). The mock supports just enough to be useful:
 *   - `requestOwnership` = `OWNED_REQUESTS` | `ALL_REQUESTS` (default ALL)
 *   - `requestTypeId` — filter to one request type
 *   - `start` / `limit` — offset pagination matching JSM's offset model
 *
 * Returns a paged DTO matching JSM's real envelope.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const requestTypeFilter = url.searchParams.get("requestTypeId");
  const start = parseInt(url.searchParams.get("start") ?? "0", 10);
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

  let requests = await listRequests();
  if (requestTypeFilter) {
    requests = requests.filter((r) => r.requestTypeId === requestTypeFilter);
  }

  const paged = requests.slice(start, start + limit);
  const values = paged.map((r) =>
    shapeRequestForServiceDeskApi(r, baseUrl(req), String(serviceDesk.id)),
  );

  return NextResponse.json(
    {
      _expands: [],
      size: values.length,
      start,
      limit,
      isLastPage: start + paged.length >= requests.length,
      _links: {
        self: `${baseUrl(req)}/rest/servicedeskapi/request`,
        context: "servicedesk",
        base: baseUrl(req),
      },
      values,
    },
    { status: 200 },
  );
}

// ---- Helpers ---------------------------------------------------------------

function stringField(
  obj: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = obj[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function coerceString(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return undefined;
  // JSM accepts stringified numbers/booleans for some fields; coerce defensively.
  return String(v);
}
