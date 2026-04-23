// ServiceNow form view shell — the single-record editor.
// Source: PLATFORMS/servicenow.md § UI PATTERNS > Form view.
// Structure mimics the real classic UI:
//   - Record number badge + title at top
//   - Right-aligned action buttons
//   - Two-column field sections
//   - Related Lists tabs below
//   - Activity stream panel on the right

"use client";

import { useState, type ReactNode } from "react";
import { snowColors, snowFont } from "./design-tokens";

type Action = { label: string; primary?: boolean; onClick?: () => void };

type Section = {
  title: string;
  fields: Array<{ label: string; value: ReactNode }>;
};

type RelatedList = {
  label: string;
  count?: number;
  content: ReactNode;
};

type ActivityEntry = {
  who: string;
  when: string; // preformatted (e.g., "2024-03-15 08:12:47")
  kind: "note" | "field" | "system";
  body: ReactNode;
};

type FormShellProps = {
  recordNumber: string;
  title: string;
  actions?: Action[];
  sections: Section[];
  related?: RelatedList[];
  activity?: ActivityEntry[];
};

export function FormShell({
  recordNumber,
  title,
  actions = [],
  sections,
  related = [],
  activity = [],
}: FormShellProps) {
  const [tab, setTab] = useState<number>(0);

  return (
    <div
      className="flex h-full flex-col"
      style={{ fontSize: snowFont.sizeBody, color: snowColors.textPrimary }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-4 border-b px-6 py-3"
        style={{ borderColor: snowColors.divider, background: snowColors.surface }}
      >
        <div className="flex items-baseline gap-3">
          <span
            className="rounded-sm border px-2 py-0.5 font-mono text-[12px]"
            style={{ borderColor: snowColors.divider, color: snowColors.textMuted }}
          >
            {recordNumber}
          </span>
          <h1 className="text-[18px] font-semibold">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              className="rounded-sm px-3 py-1.5 text-[13px]"
              style={{
                background: a.primary ? snowColors.charcoal : snowColors.surfaceAlt,
                color: a.primary ? snowColors.textOnDark : snowColors.textPrimary,
                border: `1px solid ${a.primary ? snowColors.charcoal : snowColors.divider}`,
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body: form on left, activity stream on right */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ background: snowColors.page }}>
          {sections.map((s) => (
            <section
              key={s.title}
              className="mb-5 rounded-sm border"
              style={{ borderColor: snowColors.divider, background: snowColors.surface }}
            >
              <h2
                className="border-b px-4 py-2 text-[13px] font-semibold uppercase tracking-wide"
                style={{ borderColor: snowColors.divider, color: snowColors.textMuted }}
              >
                {s.title}
              </h2>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-3 sm:grid-cols-2">
                {s.fields.map((f) => (
                  <div key={f.label} className="flex flex-col gap-0.5">
                    <dt
                      className="text-[11px] uppercase tracking-wide"
                      style={{ color: snowColors.textMuted }}
                    >
                      {f.label}
                    </dt>
                    <dd className="text-[13px]">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          {/* Related lists */}
          {related.length > 0 && (
            <section
              className="rounded-sm border"
              style={{ borderColor: snowColors.divider, background: snowColors.surface }}
            >
              <div
                className="flex items-center border-b"
                style={{ borderColor: snowColors.divider }}
              >
                {related.map((r, i) => (
                  <button
                    key={r.label}
                    onClick={() => setTab(i)}
                    className="px-4 py-2 text-[12px] font-medium"
                    style={{
                      color:
                        tab === i ? snowColors.textPrimary : snowColors.textMuted,
                      borderBottom:
                        tab === i ? `2px solid ${snowColors.brandGreen}` : "2px solid transparent",
                    }}
                  >
                    {r.label}
                    {typeof r.count === "number" && (
                      <span
                        className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]"
                        style={{
                          background: snowColors.surfaceAlt,
                          color: snowColors.textMuted,
                        }}
                      >
                        {r.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="p-4">{related[tab]?.content}</div>
            </section>
          )}
        </div>

        {/* Activity stream */}
        {activity.length > 0 && (
          <aside
            className="w-80 shrink-0 overflow-y-auto border-l"
            style={{
              borderColor: snowColors.divider,
              background: snowColors.surface,
            }}
          >
            <h2
              className="border-b px-4 py-2 text-[13px] font-semibold uppercase tracking-wide"
              style={{ borderColor: snowColors.divider, color: snowColors.textMuted }}
            >
              Activity
            </h2>
            <ol className="divide-y" style={{ borderColor: snowColors.divider }}>
              {activity.map((a, i) => (
                <li key={i} className="px-4 py-3 text-[12px]">
                  <div
                    className="mb-1 flex items-center justify-between text-[11px]"
                    style={{ color: snowColors.textMuted }}
                  >
                    <span className="font-medium">{a.who}</span>
                    <span>{a.when}</span>
                  </div>
                  <div>{a.body}</div>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>
    </div>
  );
}
