// Amazon Business punchout smoke mock.
//
// Smoke-level: one page that exercises AmazonShell + ProductGrid +
// ProductCard + CartPanel against 6 seed business products. The point is to
// render the Amazon chrome on Vercel and exercise the full punchout loop:
// shop → add to cart → submit → receive a fake requisition id.
//
// Fidelity anchor: PLATFORMS/amazon-business.md § COMMON SE SCENARIOS >
// "[REAL] Buyer punches out from PR, shops, returns cart, PR is populated".
// The cart-return POST is a simplified JSON variant of the real cXML
// PunchOutOrderMessage — see the route handler comment for the trade-off.

"use client";

import { useMemo, useState } from "react";
import {
  AmazonShell,
  ProductGrid,
  CartPanel,
  type CartItem,
  type Product,
} from "@/components/platforms/amazon-business";
import { seedProducts } from "./data/products";

// Realistic-looking punchout session id for the banner. In a real session
// this comes from the buyer's PunchOutSetupRequest BuyerCookie.
const SESSION_ID = "ab-punchout-sess-7f3a2c1e9d4b5";
const BUYER_SYSTEM = "Elementum";

export default function AmazonPunchoutSmokePage() {
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Client-side product filter so the search bar in the shell feels alive.
  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return seedProducts;
    return seedProducts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.brand?.toLowerCase().includes(q) ?? false),
    );
  }, [search]);

  const totalQty = cart.reduce((acc, i) => acc + i.quantity, 0);

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.asin === p.asin);
      if (existing) {
        return prev.map((i) =>
          i.product.asin === p.asin
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [...prev, { product: p, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const changeQty = (asin: string, qty: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.product.asin === asin ? { ...i, quantity: Math.max(1, qty) } : i,
      ),
    );
  };

  const removeItem = (asin: string) => {
    setCart((prev) => prev.filter((i) => i.product.asin !== asin));
  };

  // Cart-return flow: POST cart to /api/punchout/cart-return, receive a real
  // (KV-persisted) requisition id, then redirect the browser to the buyer
  // system's PR detail page — same shape as a real punchout, where the
  // browser ends the session by landing on the buyer system's PR. The mock's
  // "buyer system" is the Procurement Portal at /buyer-system/...
  //
  // Real cXML would POST a form-encoded PunchOutOrderMessage; the mock
  // trades that for JSON. See the route handler for fidelity notes.
  const submit = async () => {
    const res = await fetch(
      "/demos/amazon-punchout-smoke/api/punchout/cart-return",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: SESSION_ID,
          buyerSystem: BUYER_SYSTEM,
          items: cart.map((i) => ({
            asin: i.product.asin,
            title: i.product.title,
            quantity: i.quantity,
            unitPrice: i.product.businessPrice ?? i.product.price,
            currency: i.product.currency ?? "USD",
          })),
        }),
      },
    );
    if (!res.ok) {
      throw new Error(`Cart return failed: ${res.status}`);
    }
    const data = (await res.json()) as {
      requisitionId: string;
      buyerSystemUrl: string;
    };
    // Show the success overlay briefly (CartPanel renders this off the
    // resolved promise), then redirect to the procurement-portal PR detail
    // page so the demo lands somewhere clickable instead of just resetting.
    setTimeout(() => {
      window.location.href = data.buyerSystemUrl;
    }, 1800);
    return data;
  };

  return (
    <>
      <AmazonShell
        punchout={{ buyerSystem: BUYER_SYSTEM, sessionId: SESSION_ID }}
        cartCount={totalQty}
        onCartClick={() => setCartOpen(true)}
        searchValue={search}
        onSearchChange={setSearch}
        onSearchSubmit={setSearch}
      >
        <ProductGrid
          products={visibleProducts}
          onAddToCart={addToCart}
          resultsHeader={
            <>
              {visibleProducts.length} of {seedProducts.length} results
              {search ? (
                <>
                  {" "}
                  for <strong>&ldquo;{search}&rdquo;</strong>
                </>
              ) : (
                " · Business-only catalog"
              )}
            </>
          }
          sidebar={<FiltersSidebar />}
        />
      </AmazonShell>

      <CartPanel
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onQuantityChange={changeQty}
        onRemove={removeItem}
        buyerSystem={BUYER_SYSTEM}
        onSubmit={submit}
      />
    </>
  );
}

// Lightweight faceted filters — visual only in the smoke. A real Amazon
// punchout has server-driven facets from the catalog search API.
function FiltersSidebar() {
  return (
    <div className="space-y-4 text-[12px]">
      <section>
        <h3 className="mb-1 text-[12px] font-bold">Department</h3>
        <ul className="space-y-1">
          {[
            "Office Products",
            "Facilities",
            "IT & Electronics",
            "Medical & Lab",
            "Breakroom",
            "Safety",
          ].map((c) => (
            <li key={c}>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" />
                <span>{c}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-1 text-[12px] font-bold">Delivery</h3>
        <ul className="space-y-1">
          <li>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" defaultChecked /> Get it Tomorrow
            </label>
          </li>
          <li>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" /> Prime eligible
            </label>
          </li>
        </ul>
      </section>
      <section>
        <h3 className="mb-1 text-[12px] font-bold">Avg. Customer Review</h3>
        <ul className="space-y-1 text-[11px]">
          {[4, 3, 2].map((s) => (
            <li key={s}>
              <label className="flex items-center gap-1.5">
                <input type="radio" name="stars" /> {s}★ &amp; up
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
