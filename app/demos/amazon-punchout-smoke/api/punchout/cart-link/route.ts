// GET /demos/amazon-punchout-smoke/api/punchout/cart-link
//
// Builds a punchout cart hand-off URL with items pre-loaded into the
// Amazon Business mock's shopping page. The Elementum agent calls this
// when a user asks to order specific items from Amazon — the response
// gives the agent a single URL to drop in chat, and clicking it opens
// the cart UI with everything already in the basket so the user can
// review and submit (which fires the existing /cart-return flow and
// creates the buyer-system requisition).
//
// Why a separate endpoint vs. just constructing the URL inside the
// agent's automation? Two reasons:
//   1. The mock looks each ASIN up in the seed catalog and returns a
//      fully-itemized summary (titles, prices, totals) — the agent uses
//      that to write a natural-sounding chat reply ("12 boxes of Nitrile
//      Exam Gloves at $18.75/box, total $225") instead of just dumping
//      a URL.
//   2. Validation lives in one place — unknown ASINs get rejected with
//      a real error envelope instead of silently producing a half-broken
//      cart link.
//
// Query params:
//   - items   — comma-separated `ASIN:QUANTITY` pairs, e.g.
//               `B0FAKE0003:12,B0FAKE0001:1`. Required; quantity defaults
//               to 1 if `:N` is omitted.
//
// Response shape:
//   {
//     "cartUrl":   "https://.../demos/amazon-punchout-smoke?items=...",
//     "sessionId": "ab-punchout-sess-...",
//     "items": [
//       { "asin", "title", "quantity", "unitPrice", "currency", "lineTotal" }
//     ],
//     "subtotal":  225.00,
//     "currency":  "USD",
//     "itemCount": 13
//   }

import { NextRequest, NextResponse } from "next/server";
import { seedProducts } from "../../../data/products";

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

// Defensive value handling per SKILL.md § "Search/filter endpoints —
// defensive value handling". An agent that wires the chip but forgets to
// pass a value would otherwise hit us with `?items=items` (the chip
// literal) — handle it the same way we treat an empty string.
const NO_FILTER_VALUES = new Set(["", "null", "undefined", "items"]);

function isEffectivelyEmpty(v: string | null): boolean {
  if (v === null) return true;
  return NO_FILTER_VALUES.has(v.trim().toLowerCase());
}

type ParsedItem = {
  asin: string;
  quantity: number;
};

type ParseResult =
  | { ok: true; items: ParsedItem[] }
  | { ok: false; error: string };

function parseItemsParam(raw: string): ParseResult {
  const items: ParsedItem[] = [];
  for (const pairRaw of raw.split(",")) {
    const pair = pairRaw.trim();
    if (!pair) continue;
    const [asin, qtyRaw] = pair.split(":").map((s) => s.trim());
    if (!asin) {
      return { ok: false, error: `Empty ASIN in items pair: '${pairRaw}'` };
    }
    const qty = qtyRaw === undefined ? 1 : parseInt(qtyRaw, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      return {
        ok: false,
        error: `Quantity must be a positive integer; got '${qtyRaw}' for ASIN ${asin}`,
      };
    }
    items.push({ asin, quantity: qty });
  }
  if (items.length === 0) {
    return { ok: false, error: "No valid items provided." };
  }
  return { ok: true, items };
}

function errorResponse(status: number, message: string) {
  return NextResponse.json(
    { error: { code: "PUNCHOUT/CART-LINK", message } },
    { status },
  );
}

const MOCK_SESSION_ID = "ab-punchout-sess-7f3a2c1e9d4b5";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const itemsRaw = url.searchParams.get("items");

  if (isEffectivelyEmpty(itemsRaw)) {
    return errorResponse(
      400,
      "Missing required `items` query param. Format: items=ASIN:QUANTITY,ASIN:QUANTITY",
    );
  }

  const parsed = parseItemsParam(itemsRaw!);
  if (!parsed.ok) {
    return errorResponse(400, parsed.error);
  }

  // Look each ASIN up in the seed catalog. Unknown ASINs are a 400 — we
  // surface that to the agent so it can ask the user for clarification
  // instead of handing them a half-broken cart.
  const itemized: Array<{
    asin: string;
    title: string;
    quantity: number;
    unitPrice: number;
    currency: string;
    lineTotal: number;
  }> = [];
  for (const { asin, quantity } of parsed.items) {
    const product = seedProducts.find((p) => p.asin === asin);
    if (!product) {
      return errorResponse(
        400,
        `Unknown ASIN '${asin}'. Use one of: ${seedProducts
          .map((p) => p.asin)
          .join(", ")}`,
      );
    }
    const unitPrice = product.businessPrice ?? product.price;
    itemized.push({
      asin: product.asin,
      title: product.title,
      quantity,
      unitPrice,
      currency: product.currency ?? "USD",
      lineTotal: round2(unitPrice * quantity),
    });
  }

  const subtotal = round2(itemized.reduce((acc, i) => acc + i.lineTotal, 0));
  const itemCount = itemized.reduce((acc, i) => acc + i.quantity, 0);
  const currency = itemized[0]?.currency ?? "USD";

  // Cart URL preserves the `items=` shape the cart page parses on mount.
  // Re-encoding here lets us tolerate raw input like `B0FAKE0003 : 12 ,
  // B0FAKE0001:1` and emit a clean canonical URL the user can paste.
  const itemsCanonical = parsed.items
    .map((i) => `${i.asin}:${i.quantity}`)
    .join(",");
  const cartUrl = `${baseUrl(req)}/demos/amazon-punchout-smoke?items=${encodeURIComponent(itemsCanonical)}`;

  return NextResponse.json({
    cartUrl,
    sessionId: MOCK_SESSION_ID,
    items: itemized,
    subtotal,
    currency,
    itemCount,
  });
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}
