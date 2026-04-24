// Amazon cart panel — the slide-out (right) cart used inside a punchout
// session. The critical bit is the Submit-to-<system> button that triggers
// the cart-return flow, which in the real protocol is a self-posting HTML
// form that POSTs the cXML `PunchOutOrderMessage` to the buyer's
// `BrowserFormPost` URL.
//
// Source: PLATFORMS/amazon-business.md § UI PATTERNS > Cart sidebar /
// cart page, and § UI PATTERNS > Cart-return transition.
//
// In a punchout session the normal "Proceed to Checkout" button is hidden
// or disabled — the buyer does NOT check out on Amazon, they send the cart
// back. The Submit-to-<system> button uses the dark-blue/orange treatment
// (not consumer yellow) to signal the business action.

"use client";

import { useState } from "react";
import { Minus, Plus, Trash2, X, Zap, CheckCircle2 } from "lucide-react";
import { amazonColors, amazonFont, amazonLayout } from "./design-tokens";
import type { Product } from "./ProductCard";

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartPanelProps = {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onQuantityChange: (asin: string, qty: number) => void;
  onRemove: (asin: string) => void;
  /** Name of the procurement system (e.g., "Elementum"). Shown on the
   * submit button and in the success overlay. */
  buyerSystem: string;
  /**
   * Called when the user clicks "Submit to <buyerSystem>". The parent owns
   * the cart-return POST (to `/api/punchout/cart-return` in mocks). The
   * panel shows a local success overlay after this promise resolves.
   */
  onSubmit: () => Promise<{ requisitionId: string }>;
  /** If true, the consumer Proceed-to-Checkout button is hidden. Default true
   * — in a punchout session that button is always hidden/disabled. */
  hideCheckout?: boolean;
};

export function CartPanel({
  open,
  onClose,
  items,
  onQuantityChange,
  onRemove,
  buyerSystem,
  onSubmit,
  hideCheckout = true,
}: CartPanelProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ requisitionId: string } | null>(
    null,
  );

  const subtotal = items.reduce(
    (acc, i) =>
      acc + (i.product.businessPrice ?? i.product.price) * i.quantity,
    0,
  );
  const currency = items[0]?.product.currency ?? "USD";
  const priceFmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  });
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.35)" }}
      />

      {/* Panel */}
      <aside
        className="fixed right-0 top-0 z-50 flex h-full flex-col shadow-2xl"
        style={{
          width: amazonLayout.cartPanelWidth,
          background: amazonColors.surface,
          fontFamily: amazonFont.family,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4"
          style={{
            height: amazonLayout.headerHeight,
            background: amazonColors.headerDark,
            color: amazonColors.textOnDark,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold">Your Cart</span>
            <span
              className="rounded-full px-2 text-[11px] font-bold"
              style={{
                background: amazonColors.brandOrange,
                color: amazonColors.headerDark,
              }}
            >
              {itemCount}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="rounded p-1 hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <ol className="flex-1 overflow-y-auto px-3 py-2">
          {items.length === 0 && (
            <li
              className="px-2 py-6 text-center text-[13px]"
              style={{ color: amazonColors.textMuted }}
            >
              Your cart is empty. Add a product to continue.
            </li>
          )}
          {items.map((i) => (
            <li
              key={i.product.asin}
              className="flex gap-3 border-b py-3"
              style={{ borderColor: amazonColors.divider }}
            >
              {/* Thumbnail */}
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded"
                style={{ background: "#F7F7F7" }}
              >
                <span className="text-[28px]" aria-hidden>
                  {i.product.image}
                </span>
              </div>

              {/* Body */}
              <div className="flex min-w-0 flex-1 flex-col text-[12px]">
                <div
                  className="line-clamp-2 leading-snug"
                  style={{ color: amazonColors.businessTeal }}
                >
                  {i.product.title}
                </div>
                <div
                  className="font-mono text-[10px]"
                  style={{ color: amazonColors.textMuted }}
                  title="ASIN"
                >
                  {i.product.asin}
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <QtyStepper
                    value={i.quantity}
                    onChange={(v) => onQuantityChange(i.product.asin, v)}
                  />
                  <span className="text-[13px] font-semibold">
                    {priceFmt.format(
                      (i.product.businessPrice ?? i.product.price) *
                        i.quantity,
                    )}
                  </span>
                </div>
                <button
                  onClick={() => onRemove(i.product.asin)}
                  className="mt-1 flex items-center gap-1 self-start text-[11px] hover:underline"
                  style={{ color: amazonColors.businessTeal }}
                >
                  <Trash2 size={11} /> Remove
                </button>
              </div>
            </li>
          ))}
        </ol>

        {/* Footer */}
        <div
          className="border-t px-4 py-3"
          style={{ borderColor: amazonColors.divider }}
        >
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[13px]">Subtotal</span>
            <span className="text-[18px] font-bold">
              {priceFmt.format(subtotal)}
            </span>
          </div>

          {!hideCheckout && (
            <button
              disabled
              className="mb-2 w-full rounded-full py-2 text-[13px] font-semibold opacity-60"
              style={{
                background: amazonColors.brandYellow,
                color: amazonColors.textPrimary,
                border: "1px solid #FCD200",
              }}
              title="Disabled during punchout session"
            >
              Proceed to Checkout
            </button>
          )}

          <button
            onClick={async () => {
              if (items.length === 0 || submitting) return;
              setSubmitting(true);
              try {
                const res = await onSubmit();
                setSuccess(res);
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={items.length === 0 || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[13px] font-semibold disabled:opacity-50"
            style={{
              background: amazonColors.headerDark,
              color: amazonColors.textOnDark,
              border: `2px solid ${amazonColors.brandOrange}`,
            }}
          >
            {submitting ? (
              <>
                <Zap size={14} className="animate-pulse" /> Submitting…
              </>
            ) : (
              <>
                <Zap size={14} /> Submit to {buyerSystem} →
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Success overlay — shown after onSubmit resolves */}
      {success && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: "rgba(15, 25, 35, 0.85)" }}
        >
          <div
            className="w-[420px] rounded-lg p-6 text-center"
            style={{
              background: amazonColors.surface,
              border: `3px solid ${amazonColors.brandOrange}`,
            }}
          >
            <CheckCircle2
              size={48}
              className="mx-auto mb-3"
              style={{ color: amazonColors.deliveryGreen }}
            />
            <h3 className="mb-1 text-[18px] font-bold">
              Cart Submitted to {buyerSystem}
            </h3>
            <p
              className="text-[13px]"
              style={{ color: amazonColors.textMuted }}
            >
              Requisition <span className="font-mono">{success.requisitionId}</span>{" "}
              has been created. Redirecting…
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div
      className="flex items-center overflow-hidden rounded"
      style={{ border: `1px solid ${amazonColors.divider}` }}
    >
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Decrease quantity"
        className="flex h-6 w-6 items-center justify-center hover:bg-black/5"
      >
        <Minus size={11} />
      </button>
      <span
        className="w-8 text-center text-[12px] tabular-nums"
        aria-label="Quantity"
      >
        {value}
      </span>
      <button
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
        className="flex h-6 w-6 items-center justify-center hover:bg-black/5"
      >
        <Plus size={11} />
      </button>
    </div>
  );
}
