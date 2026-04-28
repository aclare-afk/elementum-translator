// SAP OData v2 — API_PURCHASEREQ_PROCESS_SRV.
//
// One catch-all route handler for the entire service because OData URLs use
// a key syntax — `PurchaseRequisitionHeader('0010001234')` — that doesn't
// translate cleanly to Next.js dynamic segments. Vanilla Next.js would
// require a folder literally named `PurchaseRequisitionHeader('0010001234')`
// per key, which obviously doesn't work. The catch-all gets the raw segments
// and we parse them ourselves.
//
// URL path mirrors real SAP exactly (PLATFORMS/sap.md § ENDPOINTS):
//
//   /demos/sap-me5a-smoke/api/sap/opu/odata/sap/API_PURCHASEREQ_PROCESS_SRV/
//     PurchaseRequisitionHeader                                    # list
//     PurchaseRequisitionHeader('<PR>')                            # single
//     PurchaseRequisitionHeader('<PR>')/to_PurchaseReqnItem        # items
//     PurchaseRequisitionHeader                            POST    # create
//
// On a real SAP tenant the prefix would be `https://<host>` (no
// `/demos/sap-me5a-smoke/`), but the suffix from `/sap/opu/odata/sap/...`
// onward is byte-identical. Elementum's `api_task` doesn't care about the
// prefix; it just needs the body and headers right.
//
// Auth note: real SAP requires Basic + CSRF or OAuth + CSRF. The mock is
// lenient: any Authorization (or none) is accepted, and `x-csrf-token: fetch`
// roundtrips a token but the POST handler accepts any value back. Strict
// CSRF enforcement would surprise SEs in demo prep — this is the
// pragmatic shape.

import { NextRequest, NextResponse } from "next/server";
import {
  listPRs,
  getPRByNumber,
  createPR,
  shapePRForOData,
  shapeItemForOData,
  shapeCreateResponse,
  shapeError,
  type CreatePRInput,
  type StoredPR,
} from "../../../../../../../_lib/store";
import type { SapPrStatus } from "../../../../../../../data/types";
import type { PurchaseRequisition } from "../../../../../../../data/prs";

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

/** Stable pseudo-random CSRF token. Real SAP returns a base64-ish 24-char
 *  string; the value doesn't matter for the mock since we don't validate it
 *  on POST. We use a stable token so demos that intentionally roundtrip it
 *  through chat output stay readable. */
const MOCK_CSRF_TOKEN = "MOCKCSRF1234567890ABCDEF";

const VALID_STATUSES: SapPrStatus[] = [
  "OPEN",
  "RELEASED",
  "IN_PROCESS",
  "BLOCKED",
  "CLOSED",
];

const VALID_CURRENCIES: PurchaseRequisition["currency"][] = ["USD", "EUR", "GBP"];

// ---- Path parsing ---------------------------------------------------------

type ParsedPath =
  | { kind: "service-root" }
  | { kind: "header-list" }
  | { kind: "header-single"; key: string }
  | { kind: "header-items"; key: string }
  | { kind: "unknown"; raw: string };

/**
 * Pull the entity-set + key out of an OData path. Examples:
 *   ["PurchaseRequisitionHeader"]                                   -> header-list
 *   ["PurchaseRequisitionHeader('0010001234')"]                      -> header-single
 *   ["PurchaseRequisitionHeader('0010001234')", "to_PurchaseReqnItem"] -> header-items
 *
 * Real OData v2 URLs land segments URL-decoded by the time Next.js routes
 * them, so the apostrophes inside `('0010001234')` survive intact.
 */
function parsePath(segments: string[]): ParsedPath {
  if (segments.length === 0) return { kind: "service-root" };

  const first = segments[0];
  const headerMatch = first.match(/^PurchaseRequisitionHeader(\('([^']+)'\))?$/);

  if (headerMatch) {
    const key = headerMatch[2];
    if (!key) {
      // Bare entity set, no key.
      return { kind: "header-list" };
    }
    if (segments.length === 1) {
      return { kind: "header-single", key };
    }
    if (segments.length === 2 && segments[1] === "to_PurchaseReqnItem") {
      return { kind: "header-items", key };
    }
  }

  return { kind: "unknown", raw: segments.join("/") };
}

// ---- GET ------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const parsed = parsePath(path);
  const root = baseUrl(req);

  // Real SAP responds to a `HEAD` (or `GET`) with `x-csrf-token: fetch` by
  // putting the token in the response header. The catch-all sees both verbs;
  // we treat them the same. The body is irrelevant for a fetch — real SAP
  // typically returns the service document or 200 with an empty body.
  if (req.headers.get("x-csrf-token")?.toLowerCase() === "fetch") {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "x-csrf-token": MOCK_CSRF_TOKEN,
        "cache-control": "no-store",
      },
    });
  }

  switch (parsed.kind) {
    case "service-root": {
      // Minimal service document. Real SAP returns a much richer EDMX/XML or
      // JSON service document, but this stub is enough for "did the GET
      // succeed?" smoke tests.
      return NextResponse.json({
        d: {
          EntitySets: ["PurchaseRequisitionHeader", "PurchaseRequisitionItem"],
        },
      });
    }

    case "header-list": {
      const url = new URL(req.url);
      const top = parseIntOrUndefined(url.searchParams.get("$top"));
      const skip = parseIntOrUndefined(url.searchParams.get("$skip")) ?? 0;
      const inlineCount = url.searchParams.get("$inlinecount");
      const filter = url.searchParams.get("$filter");

      let prs = await listPRs();
      if (filter) {
        prs = applyFilter(prs, filter);
      }

      const total = prs.length;
      const sliced =
        top !== undefined ? prs.slice(skip, skip + top) : prs.slice(skip);

      const body: Record<string, unknown> = {
        d: {
          results: sliced.map((p) => shapePRForOData(p, root)),
        },
      };
      if (inlineCount === "allpages") {
        (body.d as Record<string, unknown>).__count = String(total);
      }
      return NextResponse.json(body);
    }

    case "header-single": {
      const pr = await getPRByNumber(parsed.key);
      if (!pr) {
        return NextResponse.json(
          shapeError(
            "MM_PUR/006",
            `Purchase requisition ${parsed.key} does not exist`,
          ),
          { status: 404 },
        );
      }
      return NextResponse.json({ d: shapePRForOData(pr, root) });
    }

    case "header-items": {
      const pr = await getPRByNumber(parsed.key);
      if (!pr) {
        return NextResponse.json(
          shapeError(
            "MM_PUR/006",
            `Purchase requisition ${parsed.key} does not exist`,
          ),
          { status: 404 },
        );
      }
      // Smoke carries one item per PR. Real SAP can have many — the
      // `results` array contract is what callers expect either way.
      return NextResponse.json({
        d: { results: [shapeItemForOData(pr, root)] },
      });
    }

    case "unknown":
      return NextResponse.json(
        shapeError(
          "GW/404",
          `Resource not found for the segment '${parsed.raw}'`,
        ),
        { status: 404 },
      );
  }
}

// ---- POST -----------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const parsed = parsePath(path);

  if (parsed.kind !== "header-list") {
    return NextResponse.json(
      shapeError(
        "GW/405",
        "POST is only supported on the PurchaseRequisitionHeader entity set.",
      ),
      { status: 405 },
    );
  }

  // Real SAP rejects writes without a valid `x-csrf-token`. The mock is
  // lenient — any value is accepted (or none) — but we still honor the
  // standard header name so SE-built integrations that are doing the right
  // thing don't get surprised by silent acceptance of obviously wrong
  // tokens. If a header is present, just take it; if not, no enforcement.

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      shapeError("GW/400", "Request body must be valid JSON."),
      { status: 400 },
    );
  }

  // Real SAP accepts a deep-create where header fields live at the top level
  // and items live under `to_PurchaseReqnItem.results[]`. The smoke supports
  // that shape AND a flat shorthand where item-level fields live alongside
  // header fields — easier for SEs writing api_task config by hand.
  const items =
    extractItems(body.to_PurchaseReqnItem) ??
    extractItems((body as Record<string, unknown>).items) ??
    null;
  const firstItem = items?.[0] ?? null;

  // Defensive value handling per SKILL.md § "Search/filter endpoints —
  // defensive value handling", extended to body fields. When the calling
  // agent doesn't pass a value for an optional field, Elementum's chip
  // system substitutes the parameter NAME as the literal value (e.g.
  // {plant: "plant"}, {currency: "currency"}). Without this guard, a
  // create call from an agent that skips optional fields would land bad
  // data ("Plant: plant") on otherwise-valid PRs, or fail validation
  // outright (currency="currency" upcased to "CURRENCY" isn't in the
  // valid currency set). Coerce known chip-name strings back to the
  // documented defaults.
  const BODY_CHIP_NAMES = new Set([
    "plant",
    "unit",
    "purchasinggroup",
    "purchasing_group",
    "requester",
    "currency",
    "company_code",
    "companycode",
    "delivery_date",
    "deliverydate",
  ]);
  const cleanOptional = (raw: string | undefined): string | undefined => {
    if (raw === undefined) return undefined;
    if (BODY_CHIP_NAMES.has(raw.trim().toLowerCase())) return undefined;
    return raw;
  };

  // Pull from item if provided, falling back to top-level body for shorthand.
  const description = pickString(
    body.PurReqnDescription,
    body.description,
    firstItem?.PurchaseRequisitionItemText,
  );
  const material = pickString(firstItem?.Material, body.material, body.Material);
  const unit =
    cleanOptional(
      pickString(firstItem?.BaseUnit, body.unit, body.BaseUnit),
    ) ?? "EA";
  const plant =
    cleanOptional(pickString(firstItem?.Plant, body.plant, body.Plant)) ??
    "US01";
  const purchasingGroup =
    cleanOptional(
      pickString(
        firstItem?.PurchasingGroup,
        body.PurchasingGroup,
        body.purchasingGroup,
      ),
    ) ?? "IT1";
  const requester =
    cleanOptional(pickString(body.CreatedByUser, body.requester)) ?? "JDAVIS";
  const currencyRaw =
    cleanOptional(
      pickString(
        firstItem?.NetPriceCurrency,
        firstItem?.DocumentCurrency,
        body.NetPriceCurrency,
        body.currency,
      ),
    ) ?? "USD";
  const statusRaw = pickString(body.status);
  const companyCode = pickString(body.CompanyCode, body.companyCode);
  const deliveryDate = pickString(
    firstItem?.DeliveryDate,
    body.deliveryDate,
    body.DeliveryDate,
  );
  const quantityRaw =
    firstItem?.RequestedQuantity ?? body.quantity ?? body.RequestedQuantity;
  const netPriceRaw =
    firstItem?.NetPriceAmount ?? body.netPrice ?? body.NetPriceAmount;

  // Validation ----------------------------------------------------------
  if (!description) {
    return NextResponse.json(
      shapeError("MEPO/052", "PR description (header text) is required."),
      { status: 400 },
    );
  }
  if (!material) {
    return NextResponse.json(
      shapeError("MEPO/032", "Material is required on the requisition item."),
      { status: 400 },
    );
  }
  if (!plant) {
    return NextResponse.json(
      shapeError("MEPO/036", "Plant is required on the requisition item."),
      { status: 400 },
    );
  }
  if (!purchasingGroup) {
    return NextResponse.json(
      shapeError(
        "MEPO/047",
        "Purchasing group (EKGRP) is required on the requisition.",
      ),
      { status: 400 },
    );
  }

  const quantity = coerceNumber(quantityRaw);
  if (quantity === undefined || quantity <= 0) {
    return NextResponse.json(
      shapeError(
        "MEPO/061",
        "Requested quantity must be a positive number.",
      ),
      { status: 400 },
    );
  }

  const netPrice = coerceNumber(netPriceRaw);
  if (netPrice === undefined || netPrice < 0) {
    return NextResponse.json(
      shapeError(
        "MEPO/062",
        "Net price must be a non-negative number.",
      ),
      { status: 400 },
    );
  }

  const currency = currencyRaw?.toUpperCase() as PurchaseRequisition["currency"];
  if (!VALID_CURRENCIES.includes(currency)) {
    return NextResponse.json(
      shapeError(
        "MEPO/063",
        `Currency must be one of ${VALID_CURRENCIES.join(", ")}.`,
      ),
      { status: 400 },
    );
  }

  let status: SapPrStatus | undefined;
  if (statusRaw) {
    if (!VALID_STATUSES.includes(statusRaw as SapPrStatus)) {
      return NextResponse.json(
        shapeError(
          "MEPO/064",
          `Status must be one of ${VALID_STATUSES.join(", ")}.`,
        ),
        { status: 400 },
      );
    }
    status = statusRaw as SapPrStatus;
  }

  // Delivery date — accept DD.MM.YYYY (matches what the GUI shows) and
  // OData-flavored `/Date(<ms>)/`. If neither parses, default to two weeks
  // from today (a common SAP default for unspecified delivery).
  const normalizedDelivery = normalizeDeliveryDate(deliveryDate);

  const input: CreatePRInput = {
    description,
    material,
    quantity,
    unit,
    deliveryDate: normalizedDelivery,
    plant,
    purchasingGroup,
    requester,
    netPrice,
    currency,
    status,
    companyCode,
  };

  const created = await createPR(input);

  // Real SAP returns 201 Created with the persisted entity in `{d: ...}`.
  // The `Location` header points at the new entity URI, also standard.
  const root = baseUrl(req);
  const entityUri = `${root}/demos/sap-me5a-smoke/api/sap/opu/odata/sap/API_PURCHASEREQ_PROCESS_SRV/PurchaseRequisitionHeader('${created.prNumber}')`;

  return NextResponse.json(shapeCreateResponse(created, root), {
    status: 201,
    headers: {
      Location: entityUri,
    },
  });
}

// ---- Helpers --------------------------------------------------------------

function parseIntOrUndefined(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

function pickString(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return undefined;
}

function coerceNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/**
 * Real SAP wraps deep-create children as either `{ results: [...] }`
 * (collection-like) or as a bare array. Either is valid wire format.
 */
function extractItems(v: unknown): Record<string, unknown>[] | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  if (typeof v === "object" && v !== null) {
    const r = (v as Record<string, unknown>).results;
    if (Array.isArray(r)) return r as Record<string, unknown>[];
  }
  return undefined;
}

/**
 * Coerce a delivery date into the DD.MM.YYYY display format the seeds use.
 * Accepts:
 *   - "DD.MM.YYYY" (already correct)
 *   - "/Date(<ms>)/" (OData v2)
 *   - ISO 8601 ("2026-05-15" or full)
 *   - undefined → default to 14 days from today
 */
function normalizeDeliveryDate(input: string | undefined): string {
  const fallback = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return formatDdMmYyyy(d);
  };

  if (!input) return fallback();

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(input)) return input;

  const odataMatch = input.match(/^\/Date\((-?\d+)\)\/$/);
  if (odataMatch) {
    return formatDdMmYyyy(new Date(parseInt(odataMatch[1], 10)));
  }

  const iso = new Date(input);
  if (!Number.isNaN(iso.getTime())) {
    return formatDdMmYyyy(iso);
  }

  return fallback();
}

function formatDdMmYyyy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Lightweight `$filter` evaluator. Real OData supports a rich expression
 * grammar (`eq`, `ne`, `gt`, `ge`, `lt`, `le`, `and`, `or`, `not`, plus
 * functions like `substringof`, `startswith`). The smoke implements the
 * handful that the SE demo flows actually hit; everything else falls
 * through and the caller sees the unfiltered list. Documented in the
 * README so SEs aren't surprised when an exotic filter is no-op.
 *
 * Defensive value handling per SKILL.md § "Search/filter endpoints —
 * defensive value handling". Elementum's api_task chip system renders
 * unset on-demand trigger inputs as the parameter NAME (literal string)
 * when the calling agent doesn't pass a value. So a URL templated as
 *   ?$filter=PurReqnReleaseStatus eq '${status}'
 * resolves at runtime to
 *   ?$filter=PurReqnReleaseStatus eq 'status'
 * when status isn't supplied. Without this guard the mock would search
 * for records where PurReqnReleaseStatus="status", find none, and zero
 * out the result set — exactly the bug we burned an hour on with
 * ServiceNow before codifying this pattern.
 */
const NO_FILTER_VALUES = new Set([
  "",
  "null",
  "undefined",
  // Likely chip-names for SAP search automations:
  "status",
  "statuscode",
  "limit",
  "top",
  "purchasinggroup",
  "createdbyuser",
  "requester",
]);

function applyFilter(prs: StoredPR[], filter: string): StoredPR[] {
  // `eq` on a few well-known fields. Tokens look like:
  //   PurReqnReleaseStatus eq '03'
  //   CreatedByUser eq 'JDAVIS'
  //   PurchasingGroup eq 'IT1'
  //   CompanyCode eq '1000'
  // Real OData supports a much richer expression grammar (`ne`, `gt`,
  // `substringof`, boolean composition); the smoke does enough for the
  // common SE polling pattern and documents the rest in the README.
  const eqMatch = filter.match(/^\s*(\w+)\s+eq\s+'([^']*)'\s*$/);
  if (eqMatch) {
    const [, field, value] = eqMatch;
    if (NO_FILTER_VALUES.has(value.trim().toLowerCase())) {
      // Agent didn't actually filter on this field; chip resolved to its
      // own param name or empty. Treat as "no filter" and return all rows.
      return prs;
    }
    return prs.filter((p) => {
      // shapePRForOData maps internal fields → OData wire names. Comparing
      // against the shaped record keeps the filter language consistent with
      // the response envelope. The baseUrl arg is irrelevant for top-level
      // string comparison, so any placeholder works.
      const shaped = shapePRForOData(p, "https://x");
      const got = shaped[field];
      return typeof got === "string" && got === value;
    });
  }
  return prs;
}
