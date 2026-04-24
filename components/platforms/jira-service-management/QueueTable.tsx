// JSM agent queue table. Only renders the columns the queue is configured to
// show (matches the real /rest/servicedeskapi/servicedesk/{id}/queue/{qid}/issue
// behavior — see PLATFORMS/jira.md § API SURFACE > JSM Queue endpoints).
//
// Rows:
//   - Click -> opens the request detail (passed via onOpen).
//   - SLA cells render <SLAChip />.
//   - Status cells render <StatusPill />.
//   - Reporter / Assignee render <AccountChip compact />.

"use client";

import type { ReactNode } from "react";
import {
  IssueKey,
  StatusPill,
  AccountChip,
  PriorityIcon,
  jiraColors,
  jiraFont,
  type JiraStatusCategory,
  type JiraPriorityName,
} from "@/components/platforms/jira-shared";
import { SLAChip } from "./SLAChip";

/**
 * Columns this queue renders. A real JSM queue is admin-configured; here we
 * pass the set in as a prop. Supported column keys map to fields on the row.
 */
export type QueueColumn =
  | "key"
  | "summary"
  | "reporter"
  | "assignee"
  | "priority"
  | "status"
  | "sla-response"
  | "sla-resolution"
  | "created";

export type QueueRow = {
  id: string;
  key: string; // PROJ-42
  summary: string;
  status: { name: string; category: JiraStatusCategory };
  priority: JiraPriorityName;
  reporter?: { accountId: string; displayName: string };
  assignee?: { accountId: string; displayName: string };
  /** Time to first response — remaining ms (negative = breached). */
  slaResponseRemainingMs?: number;
  slaResponseTargetMs?: number;
  slaResponsePaused?: boolean;
  slaResponseCompleted?: boolean;
  /** Time to resolution. */
  slaResolutionRemainingMs?: number;
  slaResolutionTargetMs?: number;
  slaResolutionPaused?: boolean;
  slaResolutionCompleted?: boolean;
  createdText?: string; // pre-formatted, e.g., "2h ago" or "23/Apr/26"
};

type QueueTableProps = {
  /** The queue's display name (shown above the table). */
  queueName: string;
  /** Optional helper line under the name (e.g., "All open incidents · 12 issues"). */
  summary?: string;
  columns: QueueColumn[];
  rows: QueueRow[];
  onOpen?: (rowKey: string) => void;
};

const COLUMN_LABELS: Record<QueueColumn, string> = {
  key: "Key",
  summary: "Summary",
  reporter: "Reporter",
  assignee: "Assignee",
  priority: "Priority",
  status: "Status",
  "sla-response": "Time to first response",
  "sla-resolution": "Time to resolution",
  created: "Created",
};

function cellFor(col: QueueColumn, row: QueueRow, onOpen?: (k: string) => void): ReactNode {
  switch (col) {
    case "key":
      return <IssueKey issueKey={row.key} onClick={() => onOpen?.(row.key)} />;
    case "summary":
      return (
        <span className="block truncate" title={row.summary}>
          {row.summary}
        </span>
      );
    case "reporter":
      return row.reporter ? (
        <AccountChip
          accountId={row.reporter.accountId}
          displayName={row.reporter.displayName}
          compact
          size={22}
        />
      ) : (
        <span className="text-[12px]" style={{ color: jiraColors.textSecondary }}>
          —
        </span>
      );
    case "assignee":
      return row.assignee ? (
        <AccountChip
          accountId={row.assignee.accountId}
          displayName={row.assignee.displayName}
          compact
          size={22}
        />
      ) : (
        <span className="text-[12px]" style={{ color: jiraColors.textSecondary }}>
          Unassigned
        </span>
      );
    case "priority":
      return <PriorityIcon priority={row.priority} showLabel />;
    case "status":
      return <StatusPill name={row.status.name} category={row.status.category} />;
    case "sla-response":
      return (
        <SLAChip
          remainingMs={row.slaResponseRemainingMs}
          targetMs={row.slaResponseTargetMs}
          paused={row.slaResponsePaused}
          completed={row.slaResponseCompleted}
        />
      );
    case "sla-resolution":
      return (
        <SLAChip
          remainingMs={row.slaResolutionRemainingMs}
          targetMs={row.slaResolutionTargetMs}
          paused={row.slaResolutionPaused}
          completed={row.slaResolutionCompleted}
        />
      );
    case "created":
      return (
        <span className="text-[12px]" style={{ color: jiraColors.textSecondary }}>
          {row.createdText ?? "—"}
        </span>
      );
  }
}

export function QueueTable({
  queueName,
  summary,
  columns,
  rows,
  onOpen,
}: QueueTableProps) {
  return (
    <div
      className="rounded border bg-white"
      style={{ borderColor: jiraColors.divider, fontFamily: jiraFont.family }}
    >
      <div
        className="flex items-baseline justify-between border-b px-4 py-3"
        style={{ borderColor: jiraColors.divider }}
      >
        <h2 className="text-[18px] font-semibold" style={{ color: jiraColors.textPrimary }}>
          {queueName}
        </h2>
        {summary && (
          <span className="text-[12px]" style={{ color: jiraColors.textSecondary }}>
            {summary}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead
            className="border-b"
            style={{
              borderColor: jiraColors.divider,
              background: jiraColors.page,
            }}
          >
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: jiraColors.textSecondary }}
                >
                  {COLUMN_LABELS[col]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-[13px]"
                  style={{ color: jiraColors.textSecondary }}
                >
                  No issues in this queue.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b transition hover:bg-neutral-50"
                  style={{ borderColor: jiraColors.divider }}
                  onClick={() => onOpen?.(row.key)}
                >
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-2 align-middle">
                      {cellFor(col, row, onOpen)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
