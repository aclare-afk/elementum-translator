// Amazon product grid — the three-column shopping layout with an optional
// left-rail filters sidebar.
// Source: PLATFORMS/amazon-business.md § VISUAL IDENTITY > Layout primitives:
// "Main content: left sidebar 220px (filters), right content flex.
//  Product grid: 3 columns at desktop, 16px gutter."
//
// The grid is presentational; the page owns the products array and the
// add-to-cart behavior.

"use client";

import type { ReactNode } from "react";
import { ProductCard, type Product } from "./ProductCard";
import { amazonColors, amazonFont, amazonLayout } from "./design-tokens";

type ProductGridProps = {
  products: Product[];
  onAddToCart: (p: Product) => void;
  /**
   * Optional left-rail filter content. Common use: category checkboxes,
   * price range, delivery options. Pass null / undefined to render the grid
   * full-width.
   */
  sidebar?: ReactNode;
  /** Header line above the grid (e.g., "1-12 of 248 results for Toner"). */
  resultsHeader?: ReactNode;
  /** Column count override. Defaults to 3 at desktop. */
  columns?: number;
};

export function ProductGrid({
  products,
  onAddToCart,
  sidebar,
  resultsHeader,
  columns = 3,
}: ProductGridProps) {
  return (
    <div
      className="flex gap-4 px-4 py-4"
      style={{
        background: amazonColors.page,
        fontFamily: amazonFont.family,
      }}
    >
      {sidebar !== undefined && sidebar !== null && (
        <aside
          className="hidden shrink-0 rounded px-3 py-3 md:block"
          style={{
            width: amazonLayout.sidebarWidth,
            background: amazonColors.surface,
            border: `1px solid ${amazonColors.divider}`,
            fontSize: "12px",
          }}
        >
          {sidebar}
        </aside>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        {resultsHeader && (
          <div
            className="mb-3 text-[13px]"
            style={{ color: amazonColors.textMuted }}
          >
            {resultsHeader}
          </div>
        )}

        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {products.map((p) => (
            <ProductCard key={p.asin} product={p} onAddToCart={onAddToCart} />
          ))}
        </div>

        {products.length === 0 && (
          <div
            className="rounded px-4 py-8 text-center text-[13px]"
            style={{
              background: amazonColors.surface,
              color: amazonColors.textMuted,
              border: `1px solid ${amazonColors.divider}`,
            }}
          >
            No products match your search.
          </div>
        )}
      </section>
    </div>
  );
}
