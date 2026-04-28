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

// Defensive value handling per SKILL.md § "Search/filter endpoints —
// defensive value handling". Elementum's api_task chip system renders
// unset on-demand trigger inputs as the parameter NAME (literal string)
// when the calling agent doesn't pass a value. So a URL templated as
//   ?status=${status}&submitter=${submitter}&limit=${limit}
// resolves at runtime to
//   ?status=status&submitter=submitter&limit=limit
// when those inputs aren't supplied. Without this guard the mock would
// filter for records where status="status" / submitter substring "submitter"
// and zero out results — exactly the bug we burned an hour on with
// ServiceNow before codifying this pattern.
const NO_FILTER_VALUES = new Set([
  "",
  "null",
  "undefined",
  // Likely chip-names for Amazon search automations:
  "status",
  "submitter",
  "limit",
  "start",
  "top",
]);

function isNoFilter(v: string | null | undefined): boolean {
  if (v === null || v === undefined) return true;
  return NO_FILTER_VALUES.has(v.trim().toLowerCase());
}

// Safe integer parse: defaults when raw is null/empty/non-numeric so an
// agent passing a chip-name string for `start`/`limit` doesn't silently
// zero the pagination window.
function intParam(raw: string | null, dflt: number): number {
  if (raw === null || raw === "") return dflt;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : dflt;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const statusRaw = url.searchParams.get("status");
  const submitterRaw = url.searchParams.get("submitter");
  const start = intParam(url.searchParams.get("start"), 0);
  const limit = intParam(url.searchParams.get("limit"), 50);

  let reqs = await listRequisitions();
  if (!isNoFilter(statusRaw)) {
    reqs = reqs.filter((r) => r.status === statusRaw);
  }
  if (!isNoFilter(submitterRaw)) {
    const needle = submitterRaw!.toLowerCase();
    reqs = reqs.filter((r) =>
      r.submitter.email.toLowerCase().includes(needle),
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
