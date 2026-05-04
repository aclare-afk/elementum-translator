// Worklet grid — the iconic Workday home-page surface.
//
// A grid of clickable square tiles, each branded with an icon and a
// numeric badge. Real Workday calls these "worklets" and gates them by
// security group; for demos we render whatever the mock declares.
//
// Use as the body of a WorkdayShell on a home / landing page. For a
// worklet-detail page (e.g., the Time Off worklet's deeper view), use
// WorkletPage instead.
//
// Fidelity anchor: PLATFORMS/workday.md § UI PATTERNS > Home page.

import type { ReactNode } from "react";
import Link from "next/link";
import { workdayColors, workdayFont, workdayLayout } from "./design-tokens";

export type Worklet = {
  id: string;
  /** Display label below the icon. */
  label: string;
  /** Optional sublabel — typically a short status phrase ("3 hrs left this year"). */
  sublabel?: string;
  /** Optional badge count rendered top-right of the tile. */
  count?: number;
  /** Click target. If omitted, the tile is visual only. */
  href?: string;
  /** Lucide icon (or any ReactNode) rendered centered in the tile. */
  icon: ReactNode;
  /** Brand-tinted accent for the icon background. Defaults to a soft orange. */
  accent?: string;
};

export function WorkletGrid({ worklets }: { worklets: Worklet[] }) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      style={{
        gap: workdayLayout.workletGap,
        fontFamily: workdayFont.family,
      }}
    >
      {worklets.map((w) => (
        <WorkletTile key={w.id} worklet={w} />
      ))}
    </div>
  );
}

function WorkletTile({ worklet }: { worklet: Worklet }) {
  const tile = (
    <div
      className="flex h-full flex-col items-start justify-between rounded border bg-white p-4 transition-shadow hover:shadow-md"
      style={{
        height: workdayLayout.workletCardSize,
        borderColor: workdayColors.divider,
      }}
    >
      <div className="flex w-full items-start justify-between">
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded"
          style={{
            background: worklet.accent ?? "#FFE9D1",
            color: workdayColors.brandOrange,
          }}
        >
          {worklet.icon}
        </span>
        {worklet.count !== undefined && worklet.count > 0 && (
          <span
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
            style={{
              background: workdayColors.brandOrange,
              color: workdayColors.textOnDark,
            }}
          >
            {worklet.count}
          </span>
        )}
      </div>
      <div className="w-full">
        <div
          className="text-[15px] font-semibold leading-tight"
          style={{ color: workdayColors.textPrimary }}
        >
          {worklet.label}
        </div>
        {worklet.sublabel && (
          <div
            className="mt-1 text-[12px] leading-tight"
            style={{ color: workdayColors.textSecondary }}
          >
            {worklet.sublabel}
          </div>
        )}
      </div>
    </div>
  );

  if (!worklet.href) return tile;
  return (
    <Link href={worklet.href} className="block">
      {tile}
    </Link>
  );
}

// ── Worklet detail page header ──────────────────────────────────────────────

/**
 * Header band shown at the top of every worklet detail page (Time Off,
 * Expenses, etc.). Matches the heavy-title Workday treatment with an icon
 * tile on the left and an action affordance on the right.
 */
export function WorkletPageHeader({
  title,
  subtitle,
  icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header
      className="mb-5 flex items-start justify-between gap-4"
      style={{ fontFamily: workdayFont.family }}
    >
      <div className="flex items-start gap-3">
        <span
          className="inline-flex h-12 w-12 items-center justify-center rounded"
          style={{
            background: "#FFE9D1",
            color: workdayColors.brandOrange,
          }}
        >
          {icon}
        </span>
        <div>
          <h1
            className="text-[22px] font-semibold leading-tight"
            style={{ color: workdayColors.textPrimary }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="mt-1 text-[13px]"
              style={{ color: workdayColors.textSecondary }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
