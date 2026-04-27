// Jira Software — single-issue detail view (canonical share link).
//
// This is where `_mockViewUrl` from POST /rest/api/3/issue points. Real Jira's
// share URL is `https://<tenant>.atlassian.net/browse/<KEY>` — every Slack-
// pasted Jira link in history goes there. The mock keeps that URL shape:
//
//   /demos/jira-software-smoke/browse/WEB-145
//
// Server component; reads from the KV store via getIssueByKey(). Bypasses
// caching so newly-created issues show up without a redeploy.
//
// Fidelity anchor: PLATFORMS/jira.md § UI PATTERNS > Jira Software > Issue
// view. Layout mirrors Atlassian's Cloud "next-gen" issue page: title bar
// with key + summary, two-column body (description + activity on the left,
// details panel on the right).
//
// Sibling page is the board at /demos/jira-software-smoke (Sprint 42). The
// "Back to board" breadcrumb routes there.
//
// NOTE: this is a 1-page detail view only — no edit affordances, comment
// posting, transition buttons, etc. Real Jira's issue page has all of those;
// the smoke is read-only because Elementum automations don't drive those
// surfaces.

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  JiraShell,
  jiraColors,
  jiraFont,
  StatusPill,
  PriorityIcon,
  IssueKey,
  AccountChip,
} from "@/components/platforms/jira-shared";
import { SoftwareSidebar } from "@/components/platforms/jira-software";
import { getIssueByKey } from "../../_lib/store";
import { boardColumns, epics } from "../../data/issues";

export const dynamic = "force-dynamic";

export default async function BrowseIssuePage({
  params,
}: {
  params: Promise<{ issueKey: string }>;
}) {
  const { issueKey } = await params;
  const issue = await getIssueByKey(issueKey);
  if (!issue) notFound();

  const column = boardColumns.find((c) => c.id === issue.columnId);
  const epic = issue.epicKey
    ? Object.values(epics).find((e) => e.key === issue.epicKey)
    : undefined;

  return (
    <JiraShell
      tenant="acme"
      product="Jira Software"
      userName={issue.reporter.displayName}
      sidebar={
        <SoftwareSidebar
          projectName="Acme Web Platform"
          projectKey={issue.projectKey}
          boardType="Scrum"
          active="board"
        />
      }
    >
      <div
        className="flex h-full flex-col"
        style={{ fontFamily: jiraFont.family }}
      >
        {/* Breadcrumb + key + actions row ------------------------------- */}
        <header
          className="border-b bg-white px-6 py-4"
          style={{ borderColor: jiraColors.divider }}
        >
          <nav
            className="mb-2 text-[12px]"
            style={{ color: jiraColors.textSecondary }}
          >
            Projects
            {" / "}
            <Link
              href="/demos/jira-software-smoke"
              className="hover:underline"
              style={{ color: jiraColors.brandBlue }}
            >
              Acme Web Platform
            </Link>
            {" / "}
            <Link
              href="/demos/jira-software-smoke"
              className="hover:underline"
              style={{ color: jiraColors.brandBlue }}
            >
              Sprint 42
            </Link>
            {" / "}
            <span style={{ color: jiraColors.textPrimary }}>
              <IssueKey issueKey={issue.key} />
            </span>
          </nav>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <IssueKey issueKey={issue.key} />
                <span
                  className="text-[12px]"
                  style={{ color: jiraColors.textSecondary }}
                >
                  {issue.issueType}
                </span>
              </div>
              <h1
                className="text-[22px] font-semibold leading-tight"
                style={{ color: jiraColors.textPrimary }}
              >
                {issue.summary}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                title="Demo only"
                className="rounded border px-3 py-1 text-[12px] font-semibold"
                style={{
                  borderColor: jiraColors.divider,
                  color: jiraColors.textPrimary,
                  background: "white",
                }}
              >
                Add comment
              </button>
              <button
                type="button"
                disabled
                title="Demo only"
                className="rounded border px-3 py-1 text-[12px] font-semibold"
                style={{
                  borderColor: jiraColors.divider,
                  color: jiraColors.textPrimary,
                  background: "white",
                }}
              >
                Assign
              </button>
              <button
                type="button"
                disabled
                title="Demo only — workflow transitions would normally fire downstream automations"
                className="rounded px-3 py-1 text-[12px] font-semibold text-white"
                style={{ background: jiraColors.brandBlue }}
              >
                Transition
              </button>
            </div>
          </div>
        </header>

        {/* Two-column body --------------------------------------------- */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1fr_320px]">
            {/* LEFT: description + activity --------------------------- */}
            <div className="space-y-6">
              <section>
                <h2
                  className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: jiraColors.textSecondary }}
                >
                  Description
                </h2>
                <div
                  className="rounded border bg-white p-4"
                  style={{ borderColor: jiraColors.divider }}
                >
                  <p
                    className="whitespace-pre-line text-[14px] leading-relaxed"
                    style={{ color: jiraColors.textPrimary }}
                  >
                    {issue.description}
                  </p>
                </div>
              </section>

              <section>
                <h2
                  className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: jiraColors.textSecondary }}
                >
                  Activity
                </h2>
                <div
                  className="rounded border bg-white p-3 text-[13px]"
                  style={{
                    borderColor: jiraColors.divider,
                    color: jiraColors.textSecondary,
                  }}
                >
                  No activity yet.
                </div>
              </section>
            </div>

            {/* RIGHT: details panel ----------------------------------- */}
            <aside className="space-y-4">
              <section
                className="rounded border bg-white"
                style={{ borderColor: jiraColors.divider }}
              >
                <div
                  className="border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-wide"
                  style={{
                    borderColor: jiraColors.divider,
                    color: jiraColors.textSecondary,
                  }}
                >
                  Details
                </div>
                <dl className="grid grid-cols-[110px_1fr] gap-y-2 px-4 py-3 text-[13px]">
                  <dt style={{ color: jiraColors.textSecondary }}>Status</dt>
                  <dd>
                    <StatusPill
                      name={issue.statusName}
                      category={column?.category ?? "new"}
                      trigger
                    />
                  </dd>

                  <dt style={{ color: jiraColors.textSecondary }}>Priority</dt>
                  <dd>
                    <PriorityIcon priority={issue.priority} showLabel />
                  </dd>

                  <dt style={{ color: jiraColors.textSecondary }}>Assignee</dt>
                  <dd>
                    {issue.assignee ? (
                      <AccountChip
                        accountId={issue.assignee.accountId}
                        displayName={issue.assignee.displayName}
                        size={22}
                      />
                    ) : (
                      <span style={{ color: jiraColors.textSecondary }}>
                        Unassigned
                      </span>
                    )}
                  </dd>

                  <dt style={{ color: jiraColors.textSecondary }}>Reporter</dt>
                  <dd>
                    <AccountChip
                      accountId={issue.reporter.accountId}
                      displayName={issue.reporter.displayName}
                      size={22}
                    />
                  </dd>

                  <dt style={{ color: jiraColors.textSecondary }}>Type</dt>
                  <dd style={{ color: jiraColors.textPrimary }}>
                    {issue.issueType}
                  </dd>

                  <dt style={{ color: jiraColors.textSecondary }}>
                    Story points
                  </dt>
                  <dd style={{ color: jiraColors.textPrimary }}>
                    {issue.storyPoints ?? "—"}
                  </dd>

                  <dt style={{ color: jiraColors.textSecondary }}>
                    Epic link
                  </dt>
                  <dd>
                    {epic ? (
                      <span
                        className="inline-flex items-center gap-2 rounded px-2 py-0.5 text-[12px]"
                        style={{
                          background: `${epic.color}22`,
                          color: epic.color,
                        }}
                      >
                        <IssueKey issueKey={epic.key} />
                        <span>{epic.name}</span>
                      </span>
                    ) : (
                      <span style={{ color: jiraColors.textSecondary }}>
                        —
                      </span>
                    )}
                  </dd>

                  <dt style={{ color: jiraColors.textSecondary }}>Labels</dt>
                  <dd
                    className="flex flex-wrap gap-1"
                    style={{ color: jiraColors.textPrimary }}
                  >
                    {issue.labels && issue.labels.length > 0 ? (
                      issue.labels.map((l) => (
                        <span
                          key={l}
                          className="rounded px-1.5 py-0.5 text-[11px]"
                          style={{
                            background: jiraColors.divider,
                            color: jiraColors.textPrimary,
                          }}
                        >
                          {l}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: jiraColors.textSecondary }}>
                        None
                      </span>
                    )}
                  </dd>
                </dl>
              </section>

              <section
                className="rounded border bg-white"
                style={{ borderColor: jiraColors.divider }}
              >
                <div
                  className="border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-wide"
                  style={{
                    borderColor: jiraColors.divider,
                    color: jiraColors.textSecondary,
                  }}
                >
                  Dates
                </div>
                <dl className="grid grid-cols-[110px_1fr] gap-y-2 px-4 py-3 text-[12px]">
                  <dt style={{ color: jiraColors.textSecondary }}>Created</dt>
                  <dd
                    className="font-mono"
                    style={{ color: jiraColors.textPrimary }}
                  >
                    {formatDate(issue.createdIso)}
                  </dd>
                  <dt style={{ color: jiraColors.textSecondary }}>Updated</dt>
                  <dd
                    className="font-mono"
                    style={{ color: jiraColors.textPrimary }}
                  >
                    {formatDate(issue.updatedIso)}
                  </dd>
                </dl>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </JiraShell>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
