// JSM Approval panel — appears on the agent's request detail view when the
// request is in an approval step. Shows the approval question, the list of
// named approvers with their current decision, and (if the current viewer is
// an approver) Approve / Decline buttons.
//
// Matches PLATFORMS/jira.md § UI PATTERNS > JSM Request detail > Approvals
// panel. Note: real JSM approvals are single-step. Multi-step / branching
// approvals are KNOWN-IMPOSSIBLE natively — do not pretend otherwise in
// downstream mocks.

"use client";

import {
  AccountChip,
  jiraColors,
  jiraFont,
} from "@/components/platforms/jira-shared";

export type ApprovalDecision = "pending" | "approved" | "declined";

export type Approver = {
  accountId: string;
  displayName: string;
  decision: ApprovalDecision;
  decidedAt?: string; // display-formatted
};

type ApprovalPanelProps = {
  /** Natural-language prompt, e.g., "Approve access to production database?". */
  question: string;
  approvers: Approver[];
  /**
   * If the current viewer is an approver with a pending decision, pass their
   * accountId here to show the Approve/Decline buttons.
   */
  viewerAccountId?: string;
  /** One of the `finalDecision` values a panel can reach. */
  finalDecision?: "pending" | "approved" | "declined";
  onDecision?: (decision: "approved" | "declined") => void;
};

function DecisionBadge({ decision }: { decision: ApprovalDecision }) {
  const map = {
    pending: {
      label: "Pending",
      bg: jiraColors.statusTodoBg,
      text: jiraColors.statusTodoText,
    },
    approved: {
      label: "Approved",
      bg: jiraColors.statusDoneBg,
      text: jiraColors.statusDoneText,
    },
    declined: {
      label: "Declined",
      bg: jiraColors.statusErrorBg,
      text: jiraColors.statusErrorText,
    },
  }[decision];
  return (
    <span
      className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: map.bg, color: map.text }}
    >
      {map.label}
    </span>
  );
}

export function ApprovalPanel({
  question,
  approvers,
  viewerAccountId,
  finalDecision = "pending",
  onDecision,
}: ApprovalPanelProps) {
  const viewerIsPendingApprover = approvers.some(
    (a) => a.accountId === viewerAccountId && a.decision === "pending"
  );

  return (
    <section
      className="rounded border bg-white p-4"
      style={{ borderColor: jiraColors.divider, fontFamily: jiraFont.family }}
      aria-label="Approval"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3
          className="text-[13px] font-semibold uppercase tracking-wide"
          style={{ color: jiraColors.textSecondary }}
        >
          Approval
        </h3>
        <DecisionBadge decision={finalDecision} />
      </div>
      <p className="mb-3 text-[14px]" style={{ color: jiraColors.textPrimary }}>
        {question}
      </p>
      <ul className="mb-3 space-y-2">
        {approvers.map((a) => (
          <li
            key={a.accountId}
            className="flex items-center justify-between gap-2 rounded px-2 py-1"
            style={{ background: jiraColors.page }}
          >
            <AccountChip
              accountId={a.accountId}
              displayName={a.displayName}
              size={24}
            />
            <div className="flex items-center gap-2">
              {a.decidedAt && (
                <span
                  className="text-[11px]"
                  style={{ color: jiraColors.textSecondary }}
                >
                  {a.decidedAt}
                </span>
              )}
              <DecisionBadge decision={a.decision} />
            </div>
          </li>
        ))}
      </ul>
      {viewerIsPendingApprover && finalDecision === "pending" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onDecision?.("approved")}
            className="flex-1 rounded px-3 py-1.5 text-[13px] font-semibold text-white hover:opacity-90"
            style={{ background: jiraColors.statusDoneText }}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => onDecision?.("declined")}
            className="flex-1 rounded border px-3 py-1.5 text-[13px] font-semibold hover:bg-neutral-50"
            style={{
              borderColor: jiraColors.divider,
              color: jiraColors.statusErrorText,
            }}
          >
            Decline
          </button>
        </div>
      )}
    </section>
  );
}
