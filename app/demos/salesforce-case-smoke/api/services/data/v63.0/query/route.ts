// Salesforce SOQL query endpoint mock.
//
// Real path: `/services/data/v63.0/query/?q=<URL-encoded SOQL>`
// Mock path: `/demos/salesforce-case-smoke/api/services/data/v63.0/query`
//
// SOQL is the canonical pattern Elementum's `api_task` uses to read
// Salesforce data — far more common than the per-Id `GET /sobjects/Case/<id>`.
// A typical Elementum automation does something like:
//
//   GET /services/data/v63.0/query/?q=SELECT+Id,CaseNumber,Subject,Status
//                                    +FROM+Case+WHERE+Status='New'+LIMIT+50
//
// What's implemented:
//   - `SELECT <fields> FROM Case [WHERE <field> = '<value>'] [LIMIT <n>]`
//     — only equality filters on top-level Case fields. Real SOQL has a much
//     richer grammar (nested SELECT for child relationships, JOIN-style
//     parent-child traversal, AND/OR composition, LIKE, IN, NOT, date
//     literals like LAST_N_DAYS:7) — the smoke does enough for the common
//     SE polling pattern and falls through to the unfiltered list for
//     anything more exotic. Documented in the README.
//   - `done: true` with no `nextRecordsUrl` (no pagination — the smoke
//     never has more than a few dozen records).
//   - Error envelope on malformed query: `[{message, errorCode: "MALFORMED_QUERY"}]`
//     matching the real wire format.
//
// Auth: lenient — any bearer (or none) accepted. See the sObject route for
// the rationale.
//
// Fidelity anchor: PLATFORMS/salesforce.md § API SURFACE > SOQL query
// endpoint.

import { NextRequest, NextResponse } from "next/server";
import {
  listCases,
  shapeQueryResponse,
  shapeError,
} from "../../../../../_lib/store";
import type { SalesforceCase } from "../../../../../data/types";

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");

  if (!q) {
    return NextResponse.json(
      shapeError(
        "MALFORMED_QUERY",
        "Missing required query parameter 'q' (SOQL string).",
      ),
      { status: 400 },
    );
  }

  // Only `SELECT ... FROM Case ...` is in scope. Any other object → 400.
  // Real Salesforce returns `INVALID_TYPE: sObject type 'Account' is not
  // supported` style errors but for a single-object mock, a malformed
  // error is honest enough.
  const parsed = parseSoql(q);
  if (!parsed) {
    return NextResponse.json(
      shapeError(
        "MALFORMED_QUERY",
        `Could not parse SOQL: ${q}`,
      ),
      { status: 400 },
    );
  }

  if (parsed.fromObject !== "Case") {
    return NextResponse.json(
      shapeError(
        "INVALID_TYPE",
        `sObject type '${parsed.fromObject}' is not supported in this mock.`,
      ),
      { status: 400 },
    );
  }

  const all = await listCases();
  let filtered: SalesforceCase[] = all;

  if (parsed.where) {
    filtered = filtered.filter((c) =>
      matchesEquality(c, parsed.where!.field, parsed.where!.value),
    );
  }

  if (parsed.limit !== undefined) {
    filtered = filtered.slice(0, parsed.limit);
  }

  const root = baseUrl(req);
  return NextResponse.json(shapeQueryResponse(filtered, root));
}

// Real Salesforce's `/query` also accepts POST with `{q: "..."}` as a JSON
// body, used by integration tools that hit URL-length limits on long SOQL
// strings. Mocks the same shape.
export async function POST(req: NextRequest) {
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

  const q = typeof body.q === "string" ? body.q : null;
  if (!q) {
    return NextResponse.json(
      shapeError(
        "MALFORMED_QUERY",
        "Body must include a 'q' field with the SOQL query string.",
      ),
      { status: 400 },
    );
  }

  // Re-route through the same parser as GET by faking a URL.
  const synthetic = new URL(req.url);
  synthetic.searchParams.set("q", q);
  return GET(
    new NextRequest(synthetic.toString(), {
      headers: req.headers,
    }),
  );
}

// ---- SOQL parser ----------------------------------------------------------

type ParsedSoql = {
  /** Always present — required by SOQL grammar. */
  fields: string[];
  fromObject: string;
  where?: { field: string; value: string };
  limit?: number;
};

/**
 * Tiny SOQL parser supporting:
 *   SELECT <field>, <field>, ... FROM <object>
 *   [WHERE <field> = '<value>']
 *   [LIMIT <n>]
 *
 * Tolerant of `+` URL encoding (Salesforce SOQL is conventionally URL-
 * encoded with `+` for spaces and `%27` for apostrophes; both forms
 * are handled). Case-insensitive on keywords.
 *
 * What's NOT handled (and falls through to a no-op-style match):
 *   - AND/OR composition
 *   - IN(...), LIKE, NOT
 *   - Nested SELECT (parent-child relationships)
 *   - ORDER BY, GROUP BY, OFFSET
 *   - Aggregate functions (COUNT, SUM)
 *   - Date literals (TODAY, LAST_N_DAYS:7)
 *
 * For the SE demo, equality filters cover the common polling pattern.
 * Anything more exotic returns the unfiltered list, which is honest
 * and predictable.
 */
function parseSoql(raw: string): ParsedSoql | null {
  // Normalize: replace `+` with spaces (URL-encoding artifact), collapse
  // whitespace, trim.
  const q = raw.replace(/\+/g, " ").replace(/\s+/g, " ").trim();

  const m = q.match(
    /^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+LIMIT\s+(\d+))?\s*$/i,
  );
  if (!m) return null;

  const [, rawFields, rawFrom, rawWhere, rawLimit] = m;
  const fields = rawFields.split(",").map((s) => s.trim());

  const out: ParsedSoql = {
    fields,
    fromObject: rawFrom,
  };

  if (rawWhere) {
    // Single equality clause: `<field> = '<value>'`
    const eqMatch = rawWhere.match(/^(\w+)\s*=\s*'([^']*)'$/);
    if (eqMatch) {
      out.where = { field: eqMatch[1], value: eqMatch[2] };
    }
    // Anything else: silently dropped — falls through to unfiltered.
  }

  if (rawLimit) {
    const n = parseInt(rawLimit, 10);
    if (Number.isFinite(n) && n > 0) out.limit = n;
  }

  return out;
}

/**
 * Equality match against a top-level Case field. We compare against the
 * stored field directly (which is already in the wire format the API
 * exposes) — Status, Priority, Origin, etc. all match by string compare.
 *
 * For Id we accept both 15-char and 18-char variants (real SOQL behaves
 * the same — the platform normalizes Id comparisons).
 */
function matchesEquality(
  c: SalesforceCase,
  field: string,
  value: string,
): boolean {
  switch (field) {
    case "Id":
      return c.Id === value || c.Id.slice(0, 15) === value.slice(0, 15);
    case "CaseNumber":
      return c.CaseNumber === value;
    case "Subject":
      return c.Subject === value;
    case "Status":
      return c.Status === value;
    case "Priority":
      return c.Priority === value;
    case "Origin":
      return c.Origin === value;
    case "Reason":
      return (c.Reason ?? "") === value;
    case "AccountId":
      return (c.AccountId ?? "") === value;
    case "ContactId":
      return (c.ContactId ?? "") === value;
    case "OwnerId":
      return c.OwnerId === value;
    case "IsClosed":
      return String(c.IsClosed) === value.toLowerCase();
    default:
      // Unknown field — real Salesforce errors with INVALID_FIELD; the
      // smoke is forgiving and treats it as "no records match" so the
      // SOQL still resolves cleanly.
      return false;
  }
}
