// GET / POST /api/now/table/incident
//
// Matches PLATFORMS/servicenow.md § API SURFACE > Table API byte-for-byte:
//   - Response envelope is { "result": [...] } for GET, { "result": {...} } for POST
//   - Reference fields render as { link, value }
//   - All field values are strings
//   - sysparm_query, sysparm_limit, sysparm_offset, sysparm_fields honored
//   - 201 Created on POST, 200 OK on GET
//   - Errors use { error: { message, detail }, status: "failure" }
//
// Auth note: a real Table API requires Basic or OAuth. This mock accepts any
// Authorization header (or none) so SEs can demo without setting up creds.
// If you need to demo the auth flow itself, wire a pre-request check here.

import { NextRequest, NextResponse } from "next/server";
import {
  listIncidents,
  createIncident,
  shapeIncidentForTableApi,
  applySysparmQuery,
  paginate,
  type StoredIncident,
} from "../../../../_lib/db";

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

function errorResponse(status: number, message: string, detail: string) {
  return NextResponse.json(
    { error: { message, detail }, status: "failure" },
    { status },
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const query = url.searchParams.get("sysparm_query");
  const limit = parseInt(url.searchParams.get("sysparm_limit") ?? "100", 10);
  const offset = parseInt(url.searchParams.get("sysparm_offset") ?? "0", 10);
  const fields = url.searchParams.get("sysparm_fields");

  const all = await listIncidents();
  const filtered = applySysparmQuery<StoredIncident>(all, query);
  const paged = paginate(filtered, limit, offset);

  const shaped = paged.map((inc) => {
    const full = shapeIncidentForTableApi(inc, baseUrl(req));
    if (!fields) return full;
    const keep = fields.split(",").map((s) => s.trim());
    return Object.fromEntries(Object.entries(full).filter(([k]) => keep.includes(k)));
  });

  return NextResponse.json(
    { result: shaped },
    {
      status: 200,
      headers: {
        "X-Total-Count": String(filtered.length),
      },
    },
  );
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(400, "Invalid body", "Request body must be JSON");
  }

  // Coerce obvious booleans/numbers into strings so the response matches the
  // ServiceNow convention of all-strings JSON.
  const patch: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v === null || v === undefined) continue;
    patch[k] = typeof v === "string" ? v : String(v);
  }

  const created = await createIncident(patch);
  const shaped = shapeIncidentForTableApi(created, baseUrl(req));
  return NextResponse.json({ result: shaped }, { status: 201 });
}
