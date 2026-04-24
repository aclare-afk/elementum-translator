// RelatedList — a single related-records block on a Salesforce record page.
//
// On a record's "Related" tab (or in the right rail of a record page), every
// child relationship renders as its own RelatedList card: header with the
// child object's entity chip + plural label + row count + New button, then
// ~3 preview rows, then "View All (N)" at the bottom that would open the
// full list view.
//
// Layout is intentionally conservative: header row / body rows / footer.
// Real SLDS related lists can be configured to show different column sets
// per parent; we let callers pass the columns they want shown.
//
// Fidelity anchor: PLATFORMS/salesforce.md § UI PATTERNS > Record page >
// Related lists.

import type { ReactNode } from "react";
import { ObjectIcon } from "./ObjectIcon";
import type { SalesforceEntity } from "./design-tokens";
import { salesforceColors, salesforceFont, salesforceLayout } from "./design-tokens";

export type RelatedRow = {
  /** Required row key. Typically the child record ID. */
  id: string;
  /** Cells in the order `columns` declares them. ReactNode so links/chips drop in. */
  cells: ReactNode[];
};

type RelatedListProps = {
  /** Entity of the child object, e.g., "Contact" on an Account's Contacts list. */
  entity: SalesforceEntity;
  /** Plural label shown in the header, e.g., "Contacts (6)". */
  pluralLabel: string;
  /** Total count of related records. Used in the header and "View All (N)" footer. */
  totalCount: number;
  /** Column headers. Length must match each row's cells. */
  columns: string[];
  /** Preview rows. Cap at salesforceLayout.relatedListPreviewRows (3) for realism. */
  rows: RelatedRow[];
  /** Optional New button handler. If omitted the button is suppressed. */
  onNew?: () => void;
  /** Optional View All handler. If omitted the footer link still renders but is a no-op. */
  onViewAll?: () => void;
  /** Override the entity chip color (custom objects). */
  entityColorOverride?: string;
  /** Override the entity chip glyph (custom objects). */
  entityGlyphOverride?: string;
};

export function RelatedList({
  entity,
  pluralLabel,
  totalCount,
  columns,
  rows,
  onNew,
  onViewAll,
  entityColorOverride,
  entityGlyphOverride,
}: RelatedListProps) {
  const previewRows = rows.slice(0, salesforceLayout.relatedListPreviewRows);

  return (
    <section
      className="rounded-[4px] border bg-white"
      style={{
        borderColor: salesforceColors.border,
        fontFamily: salesforceFont.family,
      }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between border-b px-4 py-2"
        style={{ borderColor: salesforceColors.border }}
      >
        <div className="flex items-center gap-2">
          <ObjectIcon
            entity={entity}
            size={24}
            colorOverride={entityColorOverride}
            glyphOverride={entityGlyphOverride}
          />
          <h3
            className="text-[13px] font-bold"
            style={{ color: salesforceColors.textHeading }}
          >
            {pluralLabel} ({totalCount})
          </h3>
        </div>
        {onNew && (
          <button
            type="button"
            onClick={onNew}
            className="rounded border px-2 py-1 text-[12px]"
            style={{
              borderColor: salesforceColors.border,
              color: salesforceColors.textLink,
            }}
          >
            New
          </button>
        )}
      </header>

      {/* Table */}
      {previewRows.length === 0 ? (
        <div
          className="px-4 py-6 text-center text-[12px]"
          style={{ color: salesforceColors.textWeak }}
        >
          No {pluralLabel.toLowerCase()} yet.
        </div>
      ) : (
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  className="border-b px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-wide"
                  style={{
                    borderColor: salesforceColors.border,
                    color: salesforceColors.textWeak,
                  }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-neutral-50"
                style={{ borderColor: salesforceColors.border }}
              >
                {row.cells.map((cell, i) => (
                  <td
                    key={i}
                    className="border-b px-3 py-2 align-top"
                    style={{
                      borderColor: salesforceColors.border,
                      color: salesforceColors.textBody,
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Footer — View All */}
      {totalCount > previewRows.length && (
        <footer
          className="border-t px-4 py-2 text-[12px]"
          style={{ borderColor: salesforceColors.border }}
        >
          <button
            type="button"
            onClick={onViewAll}
            className="hover:underline"
            style={{ color: salesforceColors.textLink }}
          >
            View All ({totalCount})
          </button>
        </footer>
      )}
    </section>
  );
}
