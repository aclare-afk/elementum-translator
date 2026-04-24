// Amazon product card — single tile inside the shopping grid.
// Source: PLATFORMS/amazon-business.md § UI PATTERNS > Shopping grid.
// Renders per-card:
//   - Product image (or emoji placeholder — emoji scans well at demo scale)
//   - Star rating + review count
//   - Title (teal link color)
//   - Consumer price, strikethrough list price (optional)
//   - Business price callout (light-blue tinted box with teal border)
//   - Delivery estimate
//   - Add-to-Cart button (yellow Amazon-standard)
//   - Optional badge (top-left): "Best Seller" / "Business Choice" / etc.

"use client";

import { Plus } from "lucide-react";
import { amazonColors, amazonFont } from "./design-tokens";

export type BadgeKind = "best-seller" | "business-choice" | "prime-only";

export type Product = {
  asin: string; // 10-char Amazon Standard Identification Number
  title: string;
  brand?: string;
  /** Emoji (preferred for demos) or image URL. */
  image: string;
  /** Whether `image` is an emoji. If false, treated as a URL. */
  imageIsEmoji?: boolean;
  price: number; // consumer / retail price
  listPrice?: number; // strikethrough list price if on deal
  businessPrice?: number; // business-prime price
  currency?: string; // default "USD"
  rating?: number; // 0..5, typically in 0.1 steps
  reviewCount?: number;
  deliveryText?: string; // e.g., "FREE delivery Tomorrow, Mar 15"
  badge?: BadgeKind;
  /** Short line (e.g., "In Stock", "Only 3 left"). */
  availability?: string;
};

type ProductCardProps = {
  product: Product;
  onAddToCart: (p: Product) => void;
};

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const currency = product.currency ?? "USD";
  const priceFmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  });

  return (
    <article
      className="relative flex flex-col rounded p-3"
      style={{
        background: amazonColors.surface,
        border: `1px solid ${amazonColors.divider}`,
        fontFamily: amazonFont.family,
      }}
    >
      {product.badge && <Badge kind={product.badge} />}

      {/* Image area */}
      <div
        className="mb-2 flex items-center justify-center rounded"
        style={{
          height: 140,
          background: "#F7F7F7",
        }}
      >
        {product.imageIsEmoji ?? true ? (
          <span
            className="text-[64px] leading-none"
            aria-hidden
            style={{ filter: "saturate(1.05)" }}
          >
            {product.image}
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.title}
            className="max-h-[120px] max-w-full object-contain"
          />
        )}
      </div>

      {/* Brand + title */}
      {product.brand && (
        <div
          className="text-[11px]"
          style={{ color: amazonColors.textMuted }}
        >
          {product.brand}
        </div>
      )}
      <a
        href="#"
        onClick={(e) => e.preventDefault()}
        className="line-clamp-2 leading-snug hover:underline"
        style={{
          color: amazonColors.businessTeal,
          fontSize: amazonFont.sizeTitle,
          minHeight: "2.6em",
        }}
      >
        {product.title}
      </a>

      {/* Rating */}
      {typeof product.rating === "number" && (
        <div
          className="mt-1 flex items-center gap-1"
          style={{ fontSize: amazonFont.sizeRating }}
        >
          <StarBar rating={product.rating} />
          {typeof product.reviewCount === "number" && (
            <span style={{ color: amazonColors.businessTeal }}>
              {product.reviewCount.toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Price block */}
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className="font-bold"
          style={{ fontSize: amazonFont.sizePrice }}
        >
          {priceFmt.format(product.price)}
        </span>
        {product.listPrice && product.listPrice > product.price && (
          <span
            className="text-[12px] line-through"
            style={{ color: amazonColors.textMuted }}
          >
            {priceFmt.format(product.listPrice)}
          </span>
        )}
      </div>

      {/* Business price callout */}
      {typeof product.businessPrice === "number" && (
        <div
          className="mt-1 rounded px-2 py-1 text-[12px]"
          style={{
            background: "#E7F5F8",
            border: `1px solid ${amazonColors.businessTeal}`,
            color: amazonColors.textPrimary,
          }}
        >
          <span aria-hidden>💼 </span>
          <span className="font-semibold">
            {priceFmt.format(product.businessPrice)}
          </span>{" "}
          <span style={{ color: amazonColors.textMuted }}>
            with Business Prime
          </span>
        </div>
      )}

      {/* Delivery */}
      {product.deliveryText && (
        <div
          className="mt-1"
          style={{
            color: amazonColors.deliveryGreen,
            fontSize: amazonFont.sizeDelivery,
          }}
        >
          {product.deliveryText}
        </div>
      )}

      {product.availability && (
        <div
          className="mt-0.5 text-[11px]"
          style={{ color: amazonColors.deliveryGreen }}
        >
          {product.availability}
        </div>
      )}

      {/* Add to Cart */}
      <button
        onClick={() => onAddToCart(product)}
        className="mt-3 flex items-center justify-center gap-1 rounded-full py-1.5 text-[12px] font-semibold"
        style={{
          background: amazonColors.brandYellow,
          color: amazonColors.textPrimary,
          border: "1px solid #FCD200",
        }}
      >
        <Plus size={13} /> Add to Cart
      </button>
    </article>
  );
}

function Badge({ kind }: { kind: BadgeKind }) {
  const meta =
    kind === "best-seller"
      ? { label: "Best Seller", bg: amazonColors.priceRed }
      : kind === "business-choice"
      ? { label: "Business Choice", bg: amazonColors.businessTeal }
      : { label: "Prime Only", bg: amazonColors.navMedium };
  return (
    <span
      className="absolute left-2 top-2 z-10 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ background: meta.bg, color: amazonColors.textOnDark }}
    >
      {meta.label}
    </span>
  );
}

function StarBar({ rating }: { rating: number }) {
  const clamped = Math.max(0, Math.min(5, rating));
  const pct = `${(clamped / 5) * 100}%`;
  // Five empty stars behind, filled stars masked to `pct`.
  return (
    <span
      className="relative inline-block"
      style={{ width: "5em", height: "1em", lineHeight: 1 }}
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          color: "#D5D9D9",
          letterSpacing: 0,
        }}
        aria-hidden
      >
        ★★★★★
      </span>
      <span
        style={{
          position: "absolute",
          inset: 0,
          width: pct,
          overflow: "hidden",
          color: amazonColors.brandOrange,
          letterSpacing: 0,
        }}
        aria-hidden
      >
        ★★★★★
      </span>
    </span>
  );
}
