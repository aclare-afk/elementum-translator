// Mock cart-return endpoint for the Amazon Business punchout smoke.
//
// Real cXML cart-return: Amazon serves a self-posting HTML form that POSTs
// a `cxml-urlencoded` body (a URL-encoded `PunchOutOrderMessage` XML
// document) to the buyer's BrowserFormPost URL. The buyer system parses it,
// creates a requisition, and redirects the browser to the PR.
// See PLATFORMS/amazon-business.md § API SURFACE > cXML PunchOutOrderMessage.
//
// For a smoke, we accept JSON (what the page component sends) instead of
// form-encoded cXML. That keeps the mock simple while still modeling the
// round-trip: the browser submits items, the server returns a requisition id.
// A future fidelity pass can swap the body parser for real cXML — the page
// contract and response shape stay the same.
//
// PERSISTENCE: writes go through `_lib/store.ts` so the requisition shows up
// in the buyer-system surface (and via GET /api/punchout/requisitions). KV
// when configured, globalThis fallback locally.

import { NextResponse } from "next/server";
import { createRequisition } from "../../../_lib/store";

type CartReturnBody = {
  sessionId: string;
  buyerSystem?: string;
  items: Array<{
    asin: string;
    title: string;
    quantity: number;
    unitPrice: number;
    currency: string;
  }>;
  // Optional submitter override — useful when an Elementum automation wants
  // to attribute the PR to a specific user instead of the demo default.
  submitter?: {
    name: string;
    email: string;
    department: string;
  };
};

function baseUrl(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  let body: CartReturnBody;
  try {
    body = (await request.json()) as CartReturnBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (!body.sessionId) {
    return NextResponse.json(
      { error: "Missing sessionId" },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "Cart is empty" },
      { status: 400 },
    );
  }

  const created = await createRequisition({
    sessionId: body.sessionId,
    buyerSystem: body.buyerSystem ?? "Elementum",
    items: body.items,
    submitter: body.submitter,
  });

  // Response shape kept compatible with the previous fire-and-forget version
  // so existing CartPanel callers continue to work — but we now also expose
  // a `_mockViewUrl` (matching the JSM convention) for chat-replyable deep
  // linking, and the canonical procurement-portal URL via `buyerSystemUrl`.
  return NextResponse.json({
    requisitionId: created.id,
    total: created.total,
    currency: created.currency,
    itemCount: created.itemCount,
    receivedAt: created.submittedAt,
    redirectTo: `/demos/amazon-punchout-smoke?submitted=${created.id}`,
    buyerSystemUrl: created.buyerSystemUrl,
    _mockViewUrl: `${baseUrl(request)}${created.buyerSystemUrl}`,
  });
}
