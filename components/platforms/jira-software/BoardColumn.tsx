// Jira Software board column — a vertical swimlane on the Board view.
//
// Column header: [Name] [count] optional [WIP limit]
// Body: vertical stack of <IssueCard> components.
//
// Column color is driven by its mapped status category (not its literal name).
// To Do columns use blue-gray tint, In Progress blue tint, Done green tint.
// This matches PLATFORMS/jira.md § VISUAL IDENTITY where status category
// drives the visual regardless of the status's text.

"use client";

import type { ReactNode } from "react";
import {
  jiraColors,
  jiraFont,
  jiraStatusCategory,
  type JiraStatusCategory,
} from "@/components/platforms/jira-shared";

type BoardColumnProps = {
  /** Column display name, e.g., "To Do", "In Progress", "Done", "Waiting for support". */
  name: string;
  /** Which of the three category buckets this column maps to — drives color. */
  category: JiraStatusCategory;
  /** Current item count (shown in the header). */
  count: number;
  /** Optional WIP limit. If set and count > limit, header shows red warning. */
  wipLimit?: number;
  /** Cards — typically <IssueCard /> instances. */
  children: ReactNode;
};

export function BoardColumn({
  name,
  category,
  count,
  wipLimit,
  children,
}: BoardColumnProps) {
  const overLimit = typeof wipLimit === "number" && count > wipLimit;
  const cat = jiraStatusCategory[category];

  return (
    <div
      className="flex w-[280px] shrink-0 flex-col rounded"
      style={{
        background: jiraColors.page,
        fontFamily: jiraFont.family,
      }}
    >
      <div
        className="flex items-center justify-between rounded-t px-3 py-2"
        style={{
          background: cat.bg,
          color: cat.text,
        }}
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide">
          <span>{name}</span>
          <span
            className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/60 px-1.5 text-[10px] font-semibold"
            style={{ color: cat.text }}
          >
            {count}
          </span>
        </div>
        {typeof wipLimit === "number" && (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
            style={{
              background: overLimit
                ? jiraColors.statusErrorBg
                : "rgba(255,255,255,0.6)",
              color: overLimit
                ? jiraColors.statusErrorText
                : cat.text,
            }}
            title={overLimit ? "Over WIP limit" : "WIP limit"}
          >
            WIP {wipLimit}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-2">{children}</div>
    </div>
  );
}
