// GET /demos/amazon-punchout-smoke/api/punchout/requisitions/{id}
//
// Returns a single requisition by 10-digit id. Same caveat as the list
// endpoint: this is the buyer-system's surface, not Amazon's. We expose it
// because Elementum automations frequently want to GET-back the record they
// just POSTed to confirm fields landed correctly.
//
// 404 is shaped to roughly mirror SAP-style PR error envelopes — a top-level
// `error` object with `code` and `message`. Most procurement systems have
// their own envelope; this one is simple and clearly-fake-ish, which is what
// SE demos actually want.

import { NextRequest, NextResponse } from "next/server";
import { getRequisition } from "../../../../_lib/store";

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rec = await getRequisition(id);
  if (!rec) {
    return NextResponse.json(
      {
        error: {
          code: "PR_NOT_FOUND",
          message: `No requisition with id ${id}.`,
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ...rec,
    _mockViewUrl: `${baseUrl(req)}${rec.buyerSystemUrl}`,
  });
}
