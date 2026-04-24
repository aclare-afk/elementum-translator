// SAP ALV Grid — the zebra-striped result table used by ME5A, ME23N, and
// every other SAP list transaction.
// Source: PLATFORMS/sap.md § UI PATTERNS > ALV Grid result pane:
//   "Toolbar above grid: Find, Print, Display, Change, Create, Export
//    (CSV / XLSX), Layout change, Sum / Subtotal, Filter, Sort. Column
//    headers are bold, uppercase, left-aligned. Rows are zebra-striped;
//    selected rows highlight blue. Status column uses a colored dot + text
//    label. Double-click on a row: opens the detail transaction."
//
// This component is presentational — pass pre-sorted rows. Row selection is
// local (single-row, matching the real ALV default); `onOpen` is fired on
// double-click to emulate the "open detail transaction" behavior.

"use client";

import { useState, type ReactNode } from "react";
import {
  Search,
  Printer,
  Eye,
  Pencil,
  Plus,
  Download,
  LayoutGrid,
  SigmaSquare,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { sapColors, sapFont, sapLayout } from "./design-tokens";

export type AlvColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  width?: string;
  /** Use monospaced (Courier) rendering for this cell. Default true — ALV cells
   * are monospace by convention. Set false for a status column that uses
   * StatusDot. */
  mono?: boolean;
  align?: "left" | "right";
};

type AlvGridProps<T> = {
  columns: AlvColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onOpen?: (row: T) => void; // double-click action
  /**
   * Title line above the toolbar. In real SAP this is the report title (e.g.,
   * "Purchase Requisitions — List Display").
   */
  title?: string;
  /** Optional status line shown to the right of the toolbar (e.g., "142
   * requisitions, 37 open"). */
  summary?: string;
};

export function AlvGrid<T>({
  columns,
  rows,
  rowKey,
  onOpen,
  title,
  summary,
}: AlvGridProps<T>) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <section
      className="mx-3 my-3 border"
      style={{
        background: sapColors.surface,
        borderColor: sapColors.divider,
        fontFamily: sapFont.family,
        fontSize: sapFont.sizeBody,
      }}
    >
      {/* Title line */}
      {(title || summary) && (
        <div
          className="flex items-center justify-between border-b px-2 py-1"
          style={{
            background: sapColors.surfaceAlt,
            borderColor: sapColors.divider,
          }}
        >
          <span className="text-[11px] font-bold uppercase tracking-wide">
            {title}
          </span>
          {summary && (
            <span
              className="font-mono text-[10px]"
              style={{ color: sapColors.textMuted }}
            >
              {summary}
            </span>
          )}
        </div>
      )}

      {/* ALV toolbar — icon-only buttons with tooltips */}
      <div
        className="flex items-center gap-1 border-b px-2 py-1"
        style={{
          background: sapColors.surfaceAlt,
          borderColor: sapColors.divider,
        }}
      >
        <AlvIcon label="Find" icon={<Search size={13} />} />
        <AlvIcon label="Print" icon={<Printer size={13} />} />
        <Sep />
        <AlvIcon label="Display (F2)" icon={<Eye size={13} />} />
        <AlvIcon label="Change (F6)" icon={<Pencil size={13} />} />
        <AlvIcon label="Create" icon={<Plus size={13} />} />
        <Sep />
        <AlvIcon label="Export" icon={<Download size={13} />} />
        <AlvIcon label="Layout change" icon={<LayoutGrid size={13} />} />
        <AlvIcon label="Subtotals" icon={<SigmaSquare size={13} />} />
        <AlvIcon label="Filter" icon={<Filter size={13} />} />
        <AlvIcon label="Sort" icon={<ArrowUpDown size={13} />} />
        <span
          className="ml-auto font-mono text-[10px]"
          style={{ color: sapColors.textMuted }}
        >
          {rows.length} entries
        </span>
      </div>

      {/* Grid */}
      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr
              style={{
                background: sapColors.surfaceAlt,
                borderBottom: `1px solid ${sapColors.divider}`,
              }}
            >
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="border-r px-2 py-1 text-left"
                  style={{
                    width: c.width,
                    borderColor: sapColors.divider,
                    color: sapColors.textPrimary,
                    fontSize: sapFont.sizeLabel,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    textAlign: c.align === "right" ? "right" : "left",
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center"
                  style={{ color: sapColors.textMuted }}
                >
                  No entries found
                </td>
              </tr>
            )}
            {rows.map((row, idx) => {
              const k = rowKey(row);
              const isSelected = selected === k;
              const zebra = idx % 2 === 1;
              return (
                <tr
                  key={k}
                  onClick={() => setSelected(k)}
                  onDoubleClick={() => onOpen?.(row)}
                  style={{
                    height: sapLayout.alvRowHeight,
                    background: isSelected
                      ? `${sapColors.statusInProcess}22`
                      : zebra
                      ? sapColors.zebra
                      : sapColors.surface,
                    borderBottom: `1px solid ${sapColors.divider}`,
                    cursor: onOpen ? "pointer" : "default",
                  }}
                >
                  {columns.map((c) => {
                    const mono = c.mono ?? true;
                    return (
                      <td
                        key={c.key}
                        className="border-r px-2"
                        style={{
                          borderColor: sapColors.divider,
                          fontFamily: mono
                            ? sapFont.familyMono
                            : sapFont.family,
                          fontSize: sapFont.sizeBody,
                          textAlign: c.align === "right" ? "right" : "left",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.render(row)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AlvIcon({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <button
      title={label}
      aria-label={label}
      className="flex h-6 w-6 items-center justify-center rounded-sm hover:bg-black/10"
      style={{ color: sapColors.textPrimary }}
    >
      {icon}
    </button>
  );
}

function Sep() {
  return (
    <span
      className="mx-1 h-4 w-px"
      style={{ background: sapColors.divider }}
    />
  );
}
