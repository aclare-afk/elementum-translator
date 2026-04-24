// Jira Software board card — single issue representation on a kanban/scrum
// board. Shape:
//   [type-icon] [summary.................]
//                                   [key] [priority] [points] [avatar]
//
// See PLATFORMS/jira.md § UI PATTERNS > Jira Software > Board.

"use client";

import {
  AccountChip,
  IssueKey,
  PriorityIcon,
  jiraColors,
  jiraFont,
  jiraLayout,
  type JiraPriorityName,
} from "@/components/platforms/jira-shared";

/**
 * Shape of an issue as presented on a board card. This is a UI-layer type,
 * not the REST API shape. Mocks that fetch from a mock API should transform
 * the API shape into this.
 */
export type BoardIssue = {
  id: string; // internal numeric ID as a string, e.g. "10042"
  key: string; // PROJ-42
  summary: string;
  issueType: "Story" | "Task" | "Bug" | "Epic" | "Subtask" | "Service Request" | "Incident";
  priority: JiraPriorityName;
  assignee?: {
    accountId: string;
    displayName: string;
    avatarUrl?: string;
  };
  /** Scrum-only. */
  storyPoints?: number;
  /** Color-code the left edge for Epic links. */
  epicColor?: string;
};

type IssueCardProps = {
  issue: BoardIssue;
  onOpen?: (key: string) => void;
};

const TYPE_ICONS: Record<
  BoardIssue["issueType"],
  { color: string; glyph: string; label: string }
> = {
  Story: { color: "#65BA43", glyph: "S", label: "Story" },
  Task: { color: "#4BADE8", glyph: "T", label: "Task" },
  Bug: { color: "#E5493A", glyph: "B", label: "Bug" },
  Epic: { color: "#904EE2", glyph: "E", label: "Epic" },
  Subtask: { color: "#4BADE8", glyph: "s", label: "Subtask" },
  "Service Request": { color: "#0052CC", glyph: "R", label: "Service Request" },
  Incident: { color: "#E5493A", glyph: "I", label: "Incident" },
};

function IssueTypeIcon({ type }: { type: BoardIssue["issueType"] }) {
  const t = TYPE_ICONS[type];
  return (
    <span
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold text-white"
      style={{ background: t.color }}
      title={t.label}
      aria-label={t.label}
    >
      {t.glyph}
    </span>
  );
}

export function IssueCard({ issue, onOpen }: IssueCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(issue.key)}
      className="w-full rounded border bg-white p-3 text-left shadow-sm transition hover:shadow"
      style={{
        borderColor: jiraColors.divider,
        borderLeft: issue.epicColor
          ? `3px solid ${issue.epicColor}`
          : `1px solid ${jiraColors.divider}`,
        minHeight: jiraLayout.boardCardMinHeight,
        fontFamily: jiraFont.family,
      }}
    >
      <div
        className="mb-2 text-[13px] leading-snug"
        style={{ color: jiraColors.textPrimary }}
      >
        {issue.summary}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <IssueTypeIcon type={issue.issueType} />
          <IssueKey issueKey={issue.key} />
        </div>
        <div className="flex items-center gap-2">
          <PriorityIcon priority={issue.priority} />
          {typeof issue.storyPoints === "number" && (
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold"
              style={{
                background: jiraColors.statusTodoBg,
                color: jiraColors.statusTodoText,
              }}
              title={`${issue.storyPoints} story points`}
            >
              {issue.storyPoints}
            </span>
          )}
          {issue.assignee ? (
            <AccountChip
              accountId={issue.assignee.accountId}
              displayName={issue.assignee.displayName}
              avatarUrl={issue.assignee.avatarUrl}
              compact
              size={22}
            />
          ) : (
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed text-[11px]"
              style={{
                borderColor: jiraColors.divider,
                color: jiraColors.textSecondary,
              }}
              title="Unassigned"
              aria-label="Unassigned"
            >
              ?
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
