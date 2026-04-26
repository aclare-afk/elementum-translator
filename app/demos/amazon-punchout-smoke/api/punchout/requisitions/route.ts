// GET /demos/amazon-punchout-smoke/api/punchout/requisitions
//
// Lists requisitions that landed on the buyer system from prior cart-returns.
// Real punchout doesn't expose "list requisitions" over Amazon's API — that
// surface lives on the buyer system (SAP/Coupa/Ariba/etc.). The mock plays
// both halves, so this endpoint sits where the buyer system would: handy for
// SE demos that want to verify a prior cart-return without round-tripping
// through the procurement-portal UI, or for an Elementum automation that
// polls for newly-arrived PRs.
//
// Query params:
//   - status   — filter by RequisitionStatus (Pending Approval / Approved / ...)
//   - submitter — filter by submitter email (case-insensitive substring)
//   - start    — offset pagination, defaults to 0
//   - limit    — page size, defaults to 50
//
// Response envelope mirrors the JSM smoke for consistency: `{ size, start,
// limit, isLastPage, values }`. Real procurement systems each have their own
// envelope shape — we standardize because nothing in the wild matches anyway.

import { NextRequest, NextResponse } from "next/server";
import { listRequisitions } from "../../../_lib/store";

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");
  const submitterFilter = url.searchParams.get("submitter")?.toLowerCase();
  const start = parseInt(url.searchParams.get("start") ?? "0", 10);
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

  let reqs = await listRequisitions();
  if (statusFilter) {
    reqs = reqs.filter((r) => r.status === statusFilter);
  }
  if (submitterFilter) {
    reqs = reqs.filter((r) =>
      r.submitter.email.toLowerCase().includes(submitterFilter),
    );
  }

  const paged = reqs.slice(start, start + limit);
  const root = baseUrl(req);

  return NextResponse.json({
    size: paged.length,
    start,
    limit,
    isLastPage: start + paged.length >= reqs.length,
    values: paged.map((r) => ({
      ...r,
      // Absolute URL for chat-replyable deep linking — same affordance the
      // cart-return response gives back.
      _mockViewUrl: `${root}${r.buyerSystemUrl}`,
    })),
  });
}
