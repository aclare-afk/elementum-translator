// GET / PATCH / PUT / DELETE /api/now/table/incident/{sys_id}
//
// Matches the real ServiceNow Table API single-record shape per
// PLATFORMS/servicenow.md:
//   - GET returns { result: {...} } with 200
//   - PATCH/PUT return updated record wrapped in { result: {...} } with 200
//   - DELETE returns 204 No Content
//   - Missing record returns 404 with { error: { message, detail }, status: "failure" }

import { NextRequest, NextResponse } from "next/server";
import {
  getIncident,
  updateIncident,
  deleteIncident,
  shapeIncidentForTableApi,
} from "../../../../../_lib/db";

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

function notFound() {
  return NextResponse.json(
    {
      error: {
        message: "No Record found",
        detail: "Record doesn't exist or ACL restricts the record retrieval",
      },
      status: "failure",
    },
    { status: 404 },
  );
}

type RouteContext = { params: Promise<{ sys_id: string }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { sys_id } = await ctx.params;
  const inc = await getIncident(sys_id);
  if (!inc) return notFound();
  return NextResponse.json(
    { result: shapeIncidentForTableApi(inc, baseUrl(req)) },
    { status: 200 },
  );
}

async function applyUpdate(req: NextRequest, sysId: string) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      {
        error: { message: "Invalid body", detail: "Request body must be JSON" },
        status: "failure",
      },
      { status: 400 },
    );
  }

  const patch: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v === null || v === undefined) continue;
    patch[k] = typeof v === "string" ? v : String(v);
  }

  const updated = await updateIncident(sysId, patch);
  if (!updated) return notFound();
  return NextResponse.json(
    { result: shapeIncidentForTableApi(updated, baseUrl(req)) },
    { status: 200 },
  );
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { sys_id } = await ctx.params;
  return applyUpdate(req, sys_id);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { sys_id } = await ctx.params;
  return applyUpdate(req, sys_id);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { sys_id } = await ctx.params;
  const ok = await deleteIncident(sys_id);
  if (!ok) return notFound();
  return new NextResponse(null, { status: 204 });
}
