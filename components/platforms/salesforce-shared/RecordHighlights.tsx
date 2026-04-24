// RecordHighlights — the Highlights Panel at the top of every record page.
//
// Anatomy (left to right):
//   1. Object entity chip (ObjectIcon, 32px)
//   2. Object label + Name column:
//        - small weak label: "Account" (the object's plural is used on list
//          views; singular on the record page)
//        - large heading: the record Name (with an optional record-type
//          suffix)
//   3. Compact-layout field strip: up to 7 key/value pairs laid out
//      horizontally. The compact layout is per-object + per-Record-Type in
//      real Salesforce. We don't enforce the 7-cap here — callers are
//      responsible for passing a sensible number.
//   4. Action buttons (right side): Edit, Follow, + / overflow. Buttons are
//      visual only unless a handler is wired.
//
// Fidelity anchor: PLATFORMS/salesforce.md § UI PATTERNS > Record page >
// Highlights panel.

import type { ReactNode } from "react";
import { ObjectIcon } from "./ObjectIcon";
import type { SalesforceEntity } from "./design-tokens";
import { salesforceColors, salesforceFont, salesforceLayout } from "./design-tokens";

type CompactField = {
  label: string;
  /** Field value. Pass a ReactNode to embed links (e.g., Owner as UserChip). */
  value: ReactNode;
};

type HighlightsAction = {
  label: string;
  onClick?: () => void;
  /** If true, renders as the emphasized primary button. */
  primary?: boolean;
};

type RecordHighlightsProps = {
  entity: SalesforceEntity;
  /** Object label shown as the small grey line above the record Name (e.g., "Opportunity"). */
  entityLabel: string;
  /** The record's Name field. The big line. */
  recordName: string;
  /** Optional record-type name (renders as " · Record Type" after the Name). */
  recordTypeName?: string;
  /** Up to 7 key/value pairs; don't pass more or the row will wrap awkwardly. */
  compactFields?: CompactField[];
  /** Right-side action buttons. Typical set: Edit, Follow, Delete. */
  actions?: HighlightsAction[];
  /** Override the chip color (custom objects). */
  entityColorOverride?: string;
  /** Override the chip glyph (custom objects). */
  entityGlyphOverride?: string;
};

export function RecordHighlights({
  entity,
  entityLabel,
  recordName,
  recordTypeName,
  compactFields = [],
  actions = [],
  entityColorOverride,
  entityGlyphOverride,
}: RecordHighlightsProps) {
  const fields = compactFields.slice(0, salesforceLayout.highlightsCompactFieldsMax);

  return (
    <section
      className="flex items-start justify-between gap-4 rounded-[4px] border bg-white px-4 py-3"
      style={{
        borderColor: salesforceColors.border,
        fontFamily: salesforceFont.family,
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ObjectIcon
          entity={entity}
          size={32}
          colorOverride={entityColorOverride}
          glyphOverride={entityGlyphOverride}
        />
        <div className="min-w-0">
          <div
            className="text-[11px]"
            style={{ color: salesforceColors.textWeak }}
          >
            {entityLabel}
            {recordTypeName && (
              <span> · {recordTypeName}</span>
            )}
          </div>
          <h1
            className="mt-0.5 truncate text-[20px] font-bold"
            style={{ color: salesforceColors.textHeading }}
          >
            {recordName}
          </h1>
          {fields.length > 0 && (
            <dl
              className="mt-3 flex flex-wrap gap-x-6 gap-y-2"
              aria-label="Highlights"
            >
              {fields.map((f) => (
                <div key={f.label} className="flex flex-col">
                  <dt
                    className="text-[11px]"
                    style={{ color: salesforceColors.textWeak }}
                  >
                    {f.label}
                  </dt>
                  <dd
                    className="text-[13px]"
                    style={{ color: salesforceColors.textBody }}
                  >
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {actions.length > 0 && (
        <div className="flex shrink-0 items-center gap-2">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className="rounded border px-3 py-1.5 text-[13px] hover:bg-neutral-50"
              style={{
                borderColor: a.primary
                  ? salesforceColors.brandBlue
                  : salesforceColors.border,
                background: a.primary
                  ? salesforceColors.brandBlue
                  : salesforceColors.surface,
                color: a.primary
                  ? salesforceColors.textOnBrand
                  : salesforceColors.textLink,
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
