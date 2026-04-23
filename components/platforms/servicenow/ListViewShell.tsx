// ServiceNow list view shell — the filterable, sortable data grid.
// Source: PLATFORMS/servicenow.md § UI PATTERNS > List view.
// Renders:
//   - Breadcrumb filter row with removable chips
//   - Column headers (no sort logic here; pass pre-sorted rows)
//   - Rows with a row-action chevron + checkbox
//   - Paginator at the bottom ("1 to N of M")
// The shell is presentational; data lives in the page that uses it.

"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, X, Settings } from "lucide-react";
import { snowColors, snowLayout, snowFont } from "./design-tokens";

export type ListColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  width?: string; // e.g., "120px"
};

export type ListBreadcrumb = {
  label: string; // e.g., "Active = true"
  onRemove?: () => void;
};

type ListViewShellProps<T> = {
  tableLabel: string; // e.g., "Incidents"
  tableName: string; // e.g., "incident"
  breadcrumbs?: ListBreadcrumb[];
  columns: ListColumn<T>[];
  rows: T[];
  rowHref?: (row: T) => string;
  rowKey: (row: T) => string;
  total?: number; // used in paginator; defaults to rows.length
};

export function ListViewShell<T>({
  tableLabel,
  tableName,
  breadcrumbs = [],
  columns,
  rows,
  rowHref,
  rowKey,
  total,
}: ListViewShellProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const totalCount = total ?? rows.length;

  const toggle = (k: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map(rowKey)),
    );
  };

  return (
    <section
      className="flex h-full flex-col"
      style={{ fontSize: snowFont.sizeTable }}
    >
      {/* Title strip */}
      <div
        className="flex items-center justify-between border-b px-4 py-2"
        style={{ borderColor: snowColors.divider, background: snowColors.surface }}
      >
        <div className="flex items-baseline gap-2">
          <h1 className="text-[16px] font-semibold" style={{ color: snowColors.textPrimary }}>
            {tableLabel}
          </h1>
          <span className="text-[12px]" style={{ color: snowColors.textMuted }}>
            [{tableName}]
          </span>
        </div>
        <div className="flex items-center gap-2 text-[12px]" style={{ color: snowColors.textMuted }}>
          <span>{totalCount} records</span>
        </div>
      </div>

      {/* Breadcrumb filter row */}
      {breadcrumbs.length > 0 && (
        <div
          className="flex items-center gap-1 border-b px-4 py-1.5 text-[12px]"
          style={{ borderColor: snowColors.divider, background: snowColors.surfaceAlt }}
        >
          <span style={{ color: snowColors.textMuted }}>All</span>
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              <span style={{ color: snowColors.textMuted }}>&gt;</span>
              <span
                className="flex items-center gap-1 rounded-sm px-1.5 py-0.5"
                style={{ background: snowColors.surface, border: `1px solid ${snowColors.divider}` }}
              >
                <span>{b.label}</span>
                {b.onRemove && (
                  <button
                    onClick={b.onRemove}
                    className="opacity-60 hover:opacity-100"
                    aria-label={`Remove filter ${b.label}`}
                  >
                    <X size={11} />
                  </button>
                )}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto" style={{ background: snowColors.surface }}>
        <table className="w-full border-collapse">
          <thead>
            <tr
              className="border-b text-left uppercase tracking-wide"
              style={{
                borderColor: snowColors.divider,
                color: snowColors.textMuted,
                fontSize: "11px",
                background: snowColors.surfaceAlt,
              }}
            >
              <th className="w-10 px-2 py-2">
                <button
                  aria-label="Personalize list"
                  title="Personalize list"
                  className="opacity-70 hover:opacity-100"
                >
                  <Settings size={13} />
                </button>
              </th>
              <th className="w-8 py-2 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className="px-3 py-2 font-medium"
                  style={{ width: c.width }}
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
                  colSpan={columns.length + 2}
                  className="px-4 py-8 text-center"
                  style={{ color: snowColors.textMuted }}
                >
                  No records to display
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const k = rowKey(row);
              const href = rowHref?.(row);
              return (
                <tr
                  key={k}
                  className="border-b hover:bg-neutral-50"
                  style={{
                    borderColor: snowColors.divider,
                    height: snowLayout.listRowHeight,
                  }}
                >
                  <td className="px-2 text-center">
                    {href ? (
                      <Link
                        href={href}
                        aria-label="Open record"
                        style={{ color: snowColors.textMuted }}
                      >
                        <ChevronRight size={14} />
                      </Link>
                    ) : (
                      <ChevronRight
                        size={14}
                        style={{ color: snowColors.textMuted }}
                      />
                    )}
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      checked={selected.has(k)}
                      onChange={() => toggle(k)}
                      aria-label={`Select ${k}`}
                    />
                  </td>
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-1.5 align-middle">
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginator */}
      <div
        className="flex items-center justify-between border-t px-4 py-2 text-[12px]"
        style={{ borderColor: snowColors.divider, background: snowColors.surfaceAlt }}
      >
        <span style={{ color: snowColors.textMuted }}>
          « &lt; 1 to {rows.length} of {totalCount} &gt; »
        </span>
        <span style={{ color: snowColors.textMuted }}>
          {selected.size > 0 ? `${selected.size} selected` : ""}
        </span>
      </div>
    </section>
  );
}

// Small helper: render a reference field (blue link style).
export function RefLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="hover:underline" style={{ color: snowColors.linkBlue }}>
      {children}
    </Link>
  );
}

// Small helper: priority pill.
export function PriorityBadge({ code, label, color }: { code: string; label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-medium"
      style={{ background: `${color}22`, color }}
      title={`Priority ${code}`}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}
