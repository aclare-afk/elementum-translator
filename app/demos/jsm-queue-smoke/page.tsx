// JSM smoke mock — Agent queue for the IT Help service desk.
//
// Smoke-level: one queue page that exercises JiraShell + JsmSidebar +
// QueueTable + SLAChip against 6 seeded requests. Clicking a row opens a
// right-side detail pane with status, reporter, SLA chips, optional approval
// panel, and the comment thread.
//
// The 6 seed requests span every SLA state the chip renders — healthy,
// at-risk (<20% remaining), breached (negative remaining), paused (waiting on
// customer or approval), and completed — so screenshots cover them all.
//
// The Snowflake-access request (ITH-417) has a pending approval where the
// signed-in agent (Taylor Kim) is one of the approvers, so Approve/Decline
// buttons render on its detail pane.
//
// Fidelity anchor: PLATFORMS/jira.md § UI PATTERNS > JSM > Queue &
// Request detail. The customer portal side lives behind an internal
// /portal toggle below — same smoke, different chrome (PortalShell) —
// implemented in ./portal/page.tsx.

"use client";

import { useMemo, useState } from "react";
import {
  JiraShell,
  jiraColors,
  jiraFont,
  StatusPill,
  PriorityIcon,
  IssueKey,
  AccountChip,
} from "@/components/platforms/jira-shared";
import {
  JsmSidebar,
  QueueTable,
  SLAChip,
  ApprovalPanel,
  type QueueColumn,
} from "@/components/platforms/jira-service-management";
import {
  seedRequests,
  queueMeta,
  serviceDesk,
  viewerAgent,
} from "./data/requests";

// Admin-configured columns for this queue — mirrors a real JSM queue config.
const columns: QueueColumn[] = [
  "key",
  "summary",
  "status",
  "priority",
  "reporter",
  "assignee",
  "sla-response",
  "sla-resolution",
];

export default function JsmQueueSmokePage() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Other queues in the sidebar — counts drawn from the seed list so the UI
  // doesn't lie about totals.
  const queueList = useMemo(() => {
    const open = seedRequests.filter(
      (r) => r.status.category !== "done"
    ).length;
    const incidents = seedRequests.filter(
      (r) => r.requestTypeId === "28" && r.status.category !== "done"
    ).length;
    const waitingApproval = seedRequests.filter(
      (r) => r.approval?.finalDecision === "pending"
    ).length;
    return [
      { id: "all-open", name: queueMeta.name, count: open },
      { id: "incidents", name: "Incidents only", count: incidents },
      {
        id: "waiting-approval",
        name: "Waiting for approval",
        count: waitingApproval,
      },
      { id: "my-work", name: "Assigned to me", count: 2 },
    ];
  }, []);

  const selected = useMemo(
    () => seedRequests.find((r) => r.key === selectedKey) ?? null,
    [selectedKey]
  );

  return (
    <JiraShell
      tenant="acme"
      product="Jira Service Management"
      userName={viewerAgent.displayName}
      sidebar={
        <JsmSidebar
          serviceDeskName={serviceDesk.name}
          projectKey={serviceDesk.projectKey}
          active="queues"
          queues={queueList}
          selectedQueueId="all-open"
        />
      }
    >
      <div
        className="flex h-full flex-col"
        style={{ fontFamily: jiraFont.family }}
      >
        {/* Queue + detail pane. */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <QueueTable
              queueName={queueMeta.name}
              summary={`${seedRequests.length} issues · sorted by SLA urgency`}
              columns={columns}
              rows={seedRequests}
              onOpen={(key) => setSelectedKey(key)}
            />
          </div>

          {selected && (
            <aside
              className="w-[460px] shrink-0 overflow-y-auto border-l bg-white"
              style={{ borderColor: jiraColors.divider }}
            >
              <div
                className="flex items-center justify-between border-b px-4 py-3"
                style={{ borderColor: jiraColors.divider }}
              >
                <IssueKey issueKey={selected.key} />
                <button
                  type="button"
                  onClick={() => setSelectedKey(null)}
                  className="text-[18px] leading-none"
                  style={{ color: jiraColors.textSecondary }}
                  aria-label="Close detail"
                >
                  ×
                </button>
              </div>

              <div className="px-4 py-4">
                <h2
                  className="mb-3 text-[18px] font-semibold"
                  style={{ color: jiraColors.textPrimary }}
                >
                  {selected.summary}
                </h2>

                <div className="mb-4 flex items-center gap-2">
                  <StatusPill
                    name={selected.status.name}
                    category={selected.status.category}
                    trigger
                  />
                  <PriorityIcon priority={selected.priority} showLabel />
                </div>

                {/* SLAs side-by-side — labeled so the chips aren't ambiguous. */}
                <section
                  className="mb-4 grid grid-cols-2 gap-3 rounded border p-3"
                  style={{ borderColor: jiraColors.divider }}
                >
                  <div>
                    <div
                      className="mb-1 text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: jiraColors.textSecondary }}
                    >
                      Time to first response
                    </div>
                    <SLAChip
                      remainingMs={selected.slaResponseRemainingMs}
                      targetMs={selected.slaResponseTargetMs}
                      paused={selected.slaResponsePaused}
                      completed={selected.slaResponseCompleted}
                    />
                  </div>
                  <div>
                    <div
                      className="mb-1 text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: jiraColors.textSecondary }}
                    >
                      Time to resolution
                    </div>
                    <SLAChip
                      remainingMs={selected.slaResolutionRemainingMs}
                      targetMs={selected.slaResolutionTargetMs}
                      paused={selected.slaResolutionPaused}
                      completed={selected.slaResolutionCompleted}
                    />
                  </div>
                </section>

                <section
                  className="mb-4 rounded border p-3"
                  style={{ borderColor: jiraColors.divider }}
                >
                  <h3
                    className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: jiraColors.textSecondary }}
                  >
                    Details
                  </h3>
                  <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[13px]">
                    <dt style={{ color: jiraColors.textSecondary }}>Reporter</dt>
                    <dd>
                      {selected.reporter && (
                        <AccountChip
                          accountId={selected.reporter.accountId}
                          displayName={selected.reporter.displayName}
                          size={22}
                        />
                      )}
                    </dd>
                    <dt style={{ color: jiraColors.textSecondary }}>Assignee</dt>
                    <dd>
                      {selected.assignee ? (
                        <AccountChip
                          accountId={selected.assignee.accountId}
                          displayName={selected.assignee.displayName}
                          size={22}
                        />
                      ) : (
                        <span style={{ color: jiraColors.textSecondary }}>
                          Unassigned
                        </span>
                      )}
                    </dd>
                    {selected.organizationName && (
                      <>
                        <dt style={{ color: jiraColors.textSecondary }}>
                          Organization
                        </dt>
                        <dd style={{ color: jiraColors.textPrimary }}>
                          {selected.organizationName}
                        </dd>
                      </>
                    )}
                    <dt style={{ color: jiraColors.textSecondary }}>Created</dt>
                    <dd style={{ color: jiraColors.textSecondary }}>
                      {selected.createdText}
                    </dd>
                  </dl>
                </section>

                <section className="mb-4">
                  <h3
                    className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: jiraColors.textSecondary }}
                  >
                    Description
                  </h3>
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: jiraColors.textPrimary }}
                  >
                    {selected.description}
                  </p>
                </section>

                {selected.approval && (
                  <div className="mb-4">
                    <ApprovalPanel
                      question={selected.approval.question}
                      approvers={selected.approval.approvers}
                      viewerAccountId={selected.approval.viewerAccountId}
                      finalDecision={selected.approval.finalDecision}
                      onDecision={(d) =>
                        // Smoke — we just log the decision, don't mutate state.
                        console.log(`Approval decision for ${selected.key}: ${d}`)
                      }
                    />
                  </div>
                )}

                <section>
                  <h3
                    className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: jiraColors.textSecondary }}
                  >
                    Activity
                  </h3>
                  {selected.comments.length === 0 ? (
                    <p
                      className="text-[12px]"
                      style={{ color: jiraColors.textSecondary }}
                    >
                      No comments yet.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {selected.comments.map((c, idx) => (
                        <li
                          key={idx}
                          className="rounded border p-3"
                          style={{
                            borderColor: jiraColors.divider,
                            background: c.internal
                              ? jiraColors.statusWarningBg
                              : "transparent",
                          }}
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <AccountChip
                              accountId={c.accountId}
                              displayName={c.displayName}
                              size={20}
                            />
                            <div className="flex items-center gap-2">
                              {c.internal && (
                                <span
                                  className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                                  style={{
                                    background: jiraColors.statusWarningText,
                                    color: "white",
                                  }}
                                >
                                  Internal
                                </span>
                              )}
                              <span
                                className="text-[11px]"
                                style={{ color: jiraColors.textSecondary }}
                              >
                                {c.at}
                              </span>
                            </div>
                          </div>
                          <p
                            className="text-[13px]"
                            style={{ color: jiraColors.textPrimary }}
                          >
                            {c.body}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </aside>
          )}
        </div>
      </div>
    </JiraShell>
  );
}
