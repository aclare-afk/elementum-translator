// Amazon Business storefront chrome: dark-blue top header + medium-blue
// sub-nav + optional punchout banner.
// Source: PLATFORMS/amazon-business.md § VISUAL IDENTITY > Layout primitives
// and § UI PATTERNS > Punchout session banner.
//
// Every Amazon Business mock layout.tsx wraps its page with this. The
// punchout banner is the one piece that distinguishes a sanctioned business
// session from a normal Amazon session — always render it when the mock is
// in punchout mode.

"use client";

import type { ReactNode } from "react";
import { MapPin, Search, ChevronDown, ShoppingCart, Zap } from "lucide-react";
import { DemoBanner } from "./DemoBanner";
import { amazonColors, amazonFont, amazonLayout } from "./design-tokens";

type Punchout = {
  /**
   * Name of the procurement system shown in the banner and cart CTA.
   * Most common: "Elementum", but supports "SAP", "Coupa", etc.
   */
  buyerSystem: string;
  /** The punchout session id — shown monospace on the right of the banner. */
  sessionId: string;
};

type AmazonShellProps = {
  /**
   * If omitted, the storefront renders without the punchout banner. In a real
   * Amazon Business punchout demo this should almost always be set — that's
   * the entire point of the mock.
   */
  punchout?: Punchout;
  /**
   * Optional cart indicator. The header always renders a cart icon; pass
   * `cartCount` to show a badge. Click behavior is owned by the page.
   */
  cartCount?: number;
  onCartClick?: () => void;
  /** Controlled search input. The shell is happy to render uncontrolled too. */
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  onSearchSubmit?: (v: string) => void;
  /** Category tabs shown in the medium-blue sub-nav. Override for vertical-
   * specific category sets (e.g., a Facilities demo might show "Break Room",
   * "Janitorial", "Office Products"). */
  categories?: string[];
  children: ReactNode;
};

const DEFAULT_CATEGORIES = [
  "Today's Deals",
  "Business Prime",
  "Office Products",
  "Facilities",
  "IT & Electronics",
  "Medical & Lab",
  "Breakroom",
  "Furniture",
  "Safety",
];

export function AmazonShell({
  punchout,
  cartCount = 0,
  onCartClick,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  categories = DEFAULT_CATEGORIES,
  children,
}: AmazonShellProps) {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: amazonColors.page,
        color: amazonColors.textPrimary,
        fontFamily: amazonFont.family,
        fontSize: amazonFont.sizeBody,
      }}
    >
      <DemoBanner />

      {/* Top header (dark blue) */}
      <header
        className="flex items-center gap-4 px-4"
        style={{
          height: amazonLayout.headerHeight,
          background: amazonColors.headerDark,
          color: amazonColors.textOnDark,
        }}
      >
        {/* Logo */}
        <div className="flex shrink-0 items-baseline gap-1">
          <span className="text-[20px] font-extrabold tracking-tight">
            amazon
          </span>
          <span
            className="text-[14px] font-semibold italic"
            style={{ color: amazonColors.brandOrange }}
          >
            business
          </span>
        </div>

        {/* Deliver-to pill */}
        <div
          className="hidden shrink-0 items-center gap-1 text-[12px] sm:flex"
          style={{ color: amazonColors.textOnDark }}
          title="Deliver to HQ"
        >
          <MapPin size={14} style={{ color: "#BBB" }} />
          <div className="leading-tight">
            <div className="text-[10px] text-neutral-400">Deliver to</div>
            <div className="text-[12px] font-semibold">HQ · 94107</div>
          </div>
        </div>

        {/* Search bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit?.(searchValue ?? "");
          }}
          className="flex h-10 flex-1 items-stretch overflow-hidden rounded"
          style={{ maxWidth: amazonLayout.searchMaxWidth }}
        >
          <select
            className="px-2 text-[12px]"
            style={{
              background: "#F3F3F3",
              color: amazonColors.textPrimary,
              borderRight: `1px solid ${amazonColors.divider}`,
            }}
            aria-label="Search category"
            defaultValue="All"
          >
            <option>All</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search Amazon Business"
            className="flex-1 px-3 text-[14px]"
            style={{
              background: "#FFFFFF",
              color: amazonColors.textPrimary,
            }}
          />
          <button
            type="submit"
            className="flex w-12 items-center justify-center"
            style={{
              background: amazonColors.brandOrange,
              color: amazonColors.textPrimary,
            }}
            aria-label="Search"
          >
            <Search size={18} />
          </button>
        </form>

        {/* Account + cart */}
        <div className="ml-auto flex items-center gap-4 text-[12px]">
          <div className="hidden leading-tight md:block">
            <div className="text-[10px] text-neutral-400">Hello,</div>
            <div className="flex items-center gap-0.5 text-[12px] font-semibold">
              Procurement <ChevronDown size={11} />
            </div>
          </div>
          <button
            onClick={onCartClick}
            className="relative flex items-center gap-1 rounded px-1 py-1 hover:ring-1 hover:ring-white/40"
            aria-label="Cart"
          >
            <ShoppingCart size={22} />
            <span
              className="absolute -top-1 left-3 min-w-[18px] rounded-full text-center text-[11px] font-bold leading-[18px]"
              style={{
                background: amazonColors.brandOrange,
                color: amazonColors.headerDark,
              }}
            >
              {cartCount}
            </span>
            <span className="ml-3 mt-3 text-[12px] font-semibold">Cart</span>
          </button>
        </div>
      </header>

      {/* Sub-nav (medium blue) */}
      <nav
        className="flex items-center gap-4 overflow-x-auto px-4 text-[12px]"
        style={{
          height: amazonLayout.subNavHeight,
          background: amazonColors.navMedium,
          color: amazonColors.textOnDark,
        }}
      >
        <span className="flex shrink-0 items-center gap-1 font-semibold">
          <span className="text-[14px]">☰</span> All
        </span>
        {categories.map((c) => (
          <button
            key={c}
            className="shrink-0 whitespace-nowrap rounded px-1 py-0.5 hover:ring-1 hover:ring-white/40"
          >
            {c}
          </button>
        ))}
      </nav>

      {/* Punchout banner */}
      {punchout && <PunchoutBanner {...punchout} />}

      {/* Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}

function PunchoutBanner({ buyerSystem, sessionId }: Punchout) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-4"
      style={{
        height: amazonLayout.punchoutBannerHeight,
        background: `linear-gradient(90deg, ${amazonColors.punchoutGradientFrom}, ${amazonColors.punchoutGradientTo})`,
        borderBottom: `3px solid ${amazonColors.punchoutAccent}`,
        color: amazonColors.textOnDark,
      }}
    >
      <div className="flex items-center gap-2 text-[13px]">
        <Zap
          size={16}
          style={{ color: amazonColors.brandOrange }}
          fill={amazonColors.brandOrange}
        />
        <span className="font-semibold">
          {buyerSystem} Punchout Session Active
        </span>
        <span className="hidden text-[12px] opacity-90 md:inline">
          — Items added to cart will be sent back to {buyerSystem} for approval
          &amp; requisition creation
        </span>
      </div>
      <span
        className="rounded px-2 py-0.5 font-mono text-[11px]"
        style={{
          background: "rgba(0,0,0,0.3)",
          color: "#DDD",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
        title="Punchout session ID"
      >
        session: {sessionId}
      </span>
    </div>
  );
}
