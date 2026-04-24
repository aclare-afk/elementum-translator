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

import { NextResponse } from "next/server";

type CartReturnBody = {
  sessionId: string;
  items: Array<{
    asin: string;
    title: string;
    quantity: number;
    unitPrice: number;
    currency: string;
  }>;
};

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

  // Fake PR number following the 10-digit SAP-style convention from
  // PLATFORMS/sap.md § HYGIENE. Elementum's own purchaserequests namespace
  // uses a different id shape, but 10-digit left-padded reads correctly for
  // a procurement demo.
  const requisitionId = `0010${String(
    Math.floor(Math.random() * 900000) + 100000,
  )}`;

  const total = body.items.reduce(
    (acc, i) => acc + i.unitPrice * i.quantity,
    0,
  );

  return NextResponse.json({
    requisitionId,
    total: Number(total.toFixed(2)),
    currency: body.items[0]?.currency ?? "USD",
    itemCount: body.items.reduce((acc, i) => acc + i.quantity, 0),
    receivedAt: new Date().toISOString(),
    // In the real protocol this is the URL the browser gets redirected to.
    // The smoke mock's CartPanel shows a success overlay instead of actually
    // redirecting, to keep the buyer on the page for the demo.
    redirectTo: `/demos/amazon-punchout-smoke?submitted=${requisitionId}`,
  });
}
