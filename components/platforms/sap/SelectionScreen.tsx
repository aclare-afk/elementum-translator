// SAP GUI selection screen — the collapsible label/input panel that sits
// above the ALV grid on ME5A and other report transactions.
// Source: PLATFORMS/sap.md § UI PATTERNS > ME5A / ME51N / ME21N report pattern
// > Selection screen:
//   "Collapsible panel with label / input pairs in a two-column grid. Each
//    input is either a single value, a range (two boxes + `to` label), or a
//    multi-value button. At the bottom: Execute (F8), Get Variant, Save as
//    Variant, Reset. Status checkboxes for processing filters."
//
// This component is intentionally presentational. The page that hosts it owns
// the filter state; the selection screen just renders the controls.

"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Play, RotateCcw, Star } from "lucide-react";
import { sapColors, sapFont } from "./design-tokens";

export type SelectionField =
  | { kind: "single"; label: string; value: string; onChange: (v: string) => void }
  | {
      kind: "range";
      label: string;
      from: string;
      to: string;
      onFromChange: (v: string) => void;
      onToChange: (v: string) => void;
    }
  | { kind: "multi"; label: string; count: number; onClick?: () => void };

export type SelectionCheckbox = {
  label: string; // e.g., "Open", "Released", "Closed"
  checked: boolean;
  onChange: (v: boolean) => void;
};

type SelectionScreenProps = {
  title: string; // e.g., "ME5A — List Display of Purchase Requisitions"
  fields: SelectionField[];
  statusFilters?: SelectionCheckbox[];
  onExecute?: () => void; // F8
  onReset?: () => void;
  onSaveVariant?: () => void;
  onGetVariant?: () => void;
  /** Starts expanded; collapses like a real ME5A panel. */
  defaultOpen?: boolean;
  /** Optional extra content (e.g., variant picker row). */
  extras?: ReactNode;
};

export function SelectionScreen({
  title,
  fields,
  statusFilters = [],
  onExecute,
  onReset,
  onSaveVariant,
  onGetVariant,
  defaultOpen = true,
  extras,
}: SelectionScreenProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className="mx-3 mt-3 border"
      style={{
        background: sapColors.surfaceAlt,
        borderColor: sapColors.divider,
        fontFamily: sapFont.family,
        fontSize: sapFont.sizeBody,
        color: sapColors.textPrimary,
      }}
    >
      {/* Collapse header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between border-b px-2 py-1 text-left"
        style={{
          background: sapColors.surface,
          borderColor: sapColors.divider,
        }}
      >
        <span className="flex items-center gap-1.5">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <span className="text-[11px] font-bold uppercase tracking-wide">
            {title}
          </span>
        </span>
        <span className="text-[10px] font-mono" style={{ color: sapColors.textMuted }}>
          Selection screen
        </span>
      </button>

      {open && (
        <div className="px-3 py-2">
          {/* Label / input grid */}
          <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 sm:grid-cols-[max-content_1fr_max-content_1fr]">
            {fields.map((f, i) => (
              <FieldRow key={i} field={f} />
            ))}
          </dl>

          {/* Status checkbox row */}
          {statusFilters.length > 0 && (
            <div className="mt-3 flex items-center gap-4 border-t pt-2"
              style={{ borderColor: sapColors.divider }}
            >
              <span
                className="text-[11px] font-bold uppercase"
                style={{ color: sapColors.textMuted }}
              >
                Processing status
              </span>
              {statusFilters.map((c) => (
                <label
                  key={c.label}
                  className="flex items-center gap-1 text-[12px]"
                >
                  <input
                    type="checkbox"
                    checked={c.checked}
                    onChange={(e) => c.onChange(e.target.checked)}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          )}

          {extras && <div className="mt-2">{extras}</div>}

          {/* Action row — Execute / Reset / Variants */}
          <div className="mt-3 flex items-center gap-2 border-t pt-2"
            style={{ borderColor: sapColors.divider }}
          >
            <button
              onClick={onExecute}
              className="flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-semibold text-white"
              style={{ background: sapColors.brandBlue }}
              title="Execute (F8)"
            >
              <Play size={11} /> Execute (F8)
            </button>
            <button
              onClick={onReset}
              className="flex items-center gap-1 rounded-sm border px-2 py-1 text-[11px]"
              style={{
                borderColor: sapColors.divider,
                background: sapColors.surface,
              }}
            >
              <RotateCcw size={11} /> Reset
            </button>
            <button
              onClick={onGetVariant}
              className="rounded-sm border px-2 py-1 text-[11px]"
              style={{
                borderColor: sapColors.divider,
                background: sapColors.surface,
              }}
            >
              Get variant…
            </button>
            <button
              onClick={onSaveVariant}
              className="flex items-center gap-1 rounded-sm border px-2 py-1 text-[11px]"
              style={{
                borderColor: sapColors.divider,
                background: sapColors.surface,
              }}
            >
              <Star size={11} /> Save as variant
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function FieldRow({ field }: { field: SelectionField }) {
  const labelNode = (
    <dt
      className="text-[11px] font-medium"
      style={{ color: sapColors.textPrimary }}
    >
      {field.label}
    </dt>
  );

  const inputStyle = {
    background: sapColors.surface,
    borderColor: sapColors.divider,
    color: sapColors.textPrimary,
    fontFamily: sapFont.familyMono,
    fontSize: sapFont.sizeBody,
  } as const;

  if (field.kind === "single") {
    return (
      <>
        {labelNode}
        <dd>
          <input
            type="text"
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            className="w-full max-w-[220px] rounded-sm border px-1.5 py-0.5"
            style={inputStyle}
          />
        </dd>
      </>
    );
  }

  if (field.kind === "range") {
    return (
      <>
        {labelNode}
        <dd className="flex items-center gap-1.5">
          <input
            type="text"
            value={field.from}
            onChange={(e) => field.onFromChange(e.target.value)}
            className="w-full max-w-[140px] rounded-sm border px-1.5 py-0.5"
            style={inputStyle}
            placeholder="From"
          />
          <span className="text-[11px]" style={{ color: sapColors.textMuted }}>
            to
          </span>
          <input
            type="text"
            value={field.to}
            onChange={(e) => field.onToChange(e.target.value)}
            className="w-full max-w-[140px] rounded-sm border px-1.5 py-0.5"
            style={inputStyle}
            placeholder="To"
          />
        </dd>
      </>
    );
  }

  // multi
  return (
    <>
      {labelNode}
      <dd>
        <button
          onClick={field.onClick}
          className="flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px]"
          style={{
            background: sapColors.surface,
            borderColor: sapColors.divider,
          }}
        >
          <span>Multiple values</span>
          <span
            className="rounded-sm px-1 text-[10px]"
            style={{
              background: sapColors.brandBlue,
              color: sapColors.textOnDark,
            }}
          >
            {field.count}
          </span>
        </button>
      </dd>
    </>
  );
}
