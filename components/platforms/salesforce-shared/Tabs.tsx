// Tabs — the tab strip that appears below the Highlights panel (and below
// the Path component, when present) on a Lightning record page.
//
// Standard tabs shipped by Salesforce include: Details, Related, News,
// Activity, Chatter. The exact set is admin-configured in Lightning App
// Builder per object + per Record-Type + per Form-Factor (desktop / mobile).
//
// The active tab renders with a brand-blue underline and bold text.
// Inactive tabs render in body color. Clicking swaps the panel. We keep the
// component controlled so the parent owns the active state (makes it easy
// to bookmark or URL-sync later).
//
// Fidelity anchor: PLATFORMS/salesforce.md § UI PATTERNS > Record page >
// Tabs row.

"use client";

import type { ReactNode } from "react";
import { salesforceColors, salesforceFont } from "./design-tokens";

export type TabItem = {
  id: string;
  label: string;
  /** Optional right-hand badge count (e.g., "Chatter (4)" — pass `4`). */
  count?: number;
};

type TabsProps = {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** Panel content for the active tab — the consumer renders the right body. */
  children?: ReactNode;
};

export function Tabs({ items, activeId, onChange, children }: TabsProps) {
  return (
    <div style={{ fontFamily: salesforceFont.family }}>
      <nav
        className="flex items-center gap-4 border-b"
        role="tablist"
        style={{ borderColor: salesforceColors.border }}
      >
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.id)}
              className="-mb-px border-b-2 px-1 pb-2 pt-3 text-[13px]"
              style={{
                borderColor: active
                  ? salesforceColors.brandBlue
                  : "transparent",
                color: active
                  ? salesforceColors.textHeading
                  : salesforceColors.textBody,
                fontWeight: active ? 700 : 400,
              }}
            >
              {item.label}
              {typeof item.count === "number" && (
                <span
                  className="ml-1"
                  style={{ color: salesforceColors.textWeak }}
                >
                  ({item.count})
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {children && <div className="pt-4">{children}</div>}
    </div>
  );
}
