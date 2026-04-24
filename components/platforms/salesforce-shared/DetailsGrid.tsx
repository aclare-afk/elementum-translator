// DetailsGrid — the two-column label/value grid that makes up the Details
// tab on every record page.
//
// In real Salesforce, the Details tab is driven by the object's Page Layout
// (Classic) or the Record Detail component in a Lightning Record Page
// (Lightning App Builder). Fields are grouped into Sections with a 2-column
// default. Fields are read-only by default; a pencil icon appears on hover
// for inline-editable fields when the viewer has permission.
//
// Required fields get a red asterisk next to the label.
// Empty fields render as "—" (em-dash), not an empty string.
//
// Fidelity anchor: PLATFORMS/salesforce.md § UI PATTERNS > Record page >
// Details tab.

import type { ReactNode } from "react";
import { salesforceColors, salesforceFont } from "./design-tokens";

export type DetailField = {
  label: string;
  /** Field value. Pass ReactNode so callers can embed UserChips, RecordKeys, StatusBadges, etc. */
  value: ReactNode;
  /** Shows a red asterisk next to the label. */
  required?: boolean;
  /** Visually hint that this field is inline-editable. Does not actually wire an editor. */
  editable?: boolean;
};

export type DetailSection = {
  title: string;
  fields: DetailField[];
  /** Section can be collapsed by the user. Mocks default to open. */
  defaultCollapsed?: boolean;
};

type DetailsGridProps = {
  sections: DetailSection[];
};

export function DetailsGrid({ sections }: DetailsGridProps) {
  return (
    <div
      className="flex flex-col gap-4"
      style={{ fontFamily: salesforceFont.family }}
    >
      {sections.map((section) => (
        <section
          key={section.title}
          className="rounded-[4px] border bg-white"
          style={{ borderColor: salesforceColors.border }}
        >
          <header
            className="flex items-center justify-between border-b px-4 py-2"
            style={{ borderColor: salesforceColors.border }}
          >
            <h2
              className="text-[13px] font-bold uppercase tracking-wide"
              style={{ color: salesforceColors.textHeading }}
            >
              {section.title}
            </h2>
            <button
              type="button"
              className="text-[12px]"
              style={{ color: salesforceColors.textWeak }}
              aria-label="Collapse section"
            >
              ▾
            </button>
          </header>
          <dl
            className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-3 md:grid-cols-2"
          >
            {section.fields.map((f) => (
              <div key={f.label} className="flex flex-col">
                <dt
                  className="mb-0.5 text-[11px]"
                  style={{ color: salesforceColors.textWeak }}
                >
                  {f.label}
                  {f.required && (
                    <span
                      aria-hidden
                      className="ml-0.5"
                      style={{ color: salesforceColors.requiredRed }}
                    >
                      *
                    </span>
                  )}
                </dt>
                <dd
                  className="flex items-center gap-1.5 text-[13px]"
                  style={{ color: salesforceColors.textBody }}
                >
                  <span className="min-w-0 flex-1">
                    {f.value ?? (
                      <span style={{ color: salesforceColors.textWeak }}>
                        —
                      </span>
                    )}
                  </span>
                  {f.editable && (
                    <button
                      type="button"
                      aria-label="Edit field"
                      className="shrink-0 rounded p-1 text-[12px] opacity-50 hover:opacity-100"
                      style={{ color: salesforceColors.textWeak }}
                    >
                      ✎
                    </button>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
