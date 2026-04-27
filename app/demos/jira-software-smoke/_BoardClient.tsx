// Client-side Sprint 42 board view. Receives already-serialized issues from
// the server component `page.tsx`, owns the selected-card state and the
// right-pane detail rendering. Split out of page.tsx because page.tsx is now
// a Server Component that reads from _lib/store.ts, and event handlers can't
// cross the server/client boundary.
//
// Pairs with the canonical issue page at /browse/<KEY>. The side panel here
// is a quick-look; for the share-link experience the user clicks "Open" to
// route to /browse/<KEY>, which is what `_mockViewUrl` from the create API
// also points at.
//
// Fidelity anchor: PLATFORMS/jira.md § UI PATTERNS > Jira Software > Board.

"use client";

import Link from "next/link";
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
  SoftwareSidebar,
  BoardColumn,
  IssueCard,
} from "@/components/platforms/jira-software";
import {
  boardColumns,
  epics,
  type BoardSeedIssue,
} from "./data/issues";

type BoardClientProps = {
  rows: BoardSeedIssue[];
};

export function BoardClient({ rows }: BoardClientProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Group issues by column id for the board.
  const columnIssues = useMemo(() => {
    const by: Record<string, BoardSeedIssue[]> = {};
    for (const col of boardColumns) by[col.id] = [];
    for (const issue of rows) by[issue.columnId]?.push(issue);
    return by;
  }, [rows]);

  const selected = useMemo(
    () => rows.find((i) => i.key === selectedKey) ?? null,
    [rows, selectedKey],
  );

  const selectedEpic = useMemo(() => {
    if (!selected?.epicKey) return null;
    return Object.values(epics).find((e) => e.key === selected.epicKey) ?? null;
  }, [selected]);

  return (
    <JiraShell
      tenant="acme"
      product="Jira Software"
      userName="Jane Davis"
      sidebar={
        <SoftwareSidebar
          projectName="Acme Web Platform"
          projectKey="WEB"
          boardType="Scrum"
          active="board"
        />
      }
    >
      <div
        className="flex h-full flex-col"
        style={{ fontFamily: jiraFont.family }}
      >
        {/* Board header — breadcrumb + sprint name + quick actions stub. */}
        <header
          className="border-b bg-white px-6 py-4"
          style={{ borderColor: jiraColors.divider }}
        >
          <nav
            className="mb-1 text-[12px]"
            style={{ color: jiraColors.textSecondary }}
          >
            Projects /{" "}
            <span style={{ color: jiraColors.textPrimary }}>
              Acme Web Platform
            </span>{" "}
            / Sprint 42
          </nav>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1
                className="text-[20px] font-semibold"
                style={{ color: jiraColors.textPrimary }}
              >
                Sprint 42
              </h1>
              <div
                className="text-[12px]"
                style={{ color: jiraColors.textSecondary }}
              >
                Apr 20 – May 3 · {rows.length} issues
              </div>
            </div>
            <div className="flex items-center gap-2 text-[12px]">
              <span
                className="inline-flex items-center gap-1 rounded border px-2 py-1"
                style={{
                  borderColor: jiraColors.divider,
                  color: jiraColors.textSecondary,
                }}
              >
                GROUP BY · None
              </span>
              <button
                type="button"
                className="rounded border px-3 py-1 font-semibold"
                style={{
                  borderColor: jiraColors.divider,
                  color: jiraColors.textPrimary,
                }}
              >
                Complete sprint
              </button>
            </div>
          </div>
        </header>

        {/* Board + optional right detail pane. */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-x-auto p-4">
            <div className="flex h-full gap-3 min-w-max">
              {boardColumns.map((col) => (
                <BoardColumn
                  key={col.id}
                  name={col.name}
                  category={col.category}
                  count={columnIssues[col.id]?.length ?? 0}
                  wipLimit={col.wipLimit}
                >
                  <div className="flex flex-col gap-2">
                    {columnIssues[col.id]?.map((issue) => (
                      <div
                        key={issue.id}
                        onClick={() => setSelectedKey(issue.key)}
                        className={
                          selectedKey === issue.key
                            ? "rounded ring-2"
                            : "rounded"
                        }
                        style={
                          selectedKey === issue.key
                            ? {
                                boxShadow: `0 0 0 2px ${jiraColors.brandBlue}`,
                              }
                            : undefined
                        }
                      >
                        <IssueCard issue={issue} />
                      </div>
                    ))}
                    {columnIssues[col.id]?.length === 0 && (
                      <div
                        className="rounded border border-dashed p-4 text-center text-[12px]"
                        style={{
                          borderColor: jiraColors.divider,
                          color: jiraColors.textSecondary,
                        }}
                      >
                        No issues
                      </div>
                    )}
                  </div>
                </BoardColumn>
              ))}
            </div>
          </div>

          {/* Detail pane — closes via X. */}
          {selected && (
            <aside
              className="w-[420px] shrink-0 overflow-y-auto border-l bg-white"
              style={{ borderColor: jiraColors.divider }}
            >
              <div
                className="flex items-center justify-between border-b px-4 py-3"
                style={{ borderColor: jiraColors.divider }}
              >
                <div className="flex items-center gap-2">
                  <IssueKey issueKey={selected.key} />
                  <Link
                    href={`/demos/jira-software-smoke/browse/${selected.key}`}
                    className="text-[11px] font-semibold hover:underline"
                    style={{ color: jiraColors.brandBlue }}
                    title="Open canonical issue page"
                  >
                    Open ↗
                  </Link>
                </div>
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
                    name={selected.statusName}
                    category={
                      boardColumns.find((c) => c.id === selected.columnId)!
                        .category
                    }
                    trigger
                  />
                  <PriorityIcon priority={selected.priority} showLabel />
                </div>

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
                  <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-[13px]">
                    <dt style={{ color: jiraColors.textSecondary }}>
                      Assignee
                    </dt>
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
                    <dt style={{ color: jiraColors.textSecondary }}>
                      Reporter
                    </dt>
                    <dd>
                      <AccountChip
                        accountId={selected.reporter.accountId}
                        displayName={selected.reporter.displayName}
                        size={22}
                      />
                    </dd>
                    <dt style={{ color: jiraColors.textSecondary }}>
                      Story points
                    </dt>
                    <dd style={{ color: jiraColors.textPrimary }}>
                      {selected.storyPoints ?? "—"}
                    </dd>
                    <dt style={{ color: jiraColors.textSecondary }}>
                      Epic link
                    </dt>
                    <dd>
                      {selectedEpic ? (
                        <span
                          className="inline-flex items-center gap-2 rounded px-2 py-0.5 text-[12px]"
                          style={{
                            background: `${selectedEpic.color}22`,
                            color: selectedEpic.color,
                          }}
                        >
                          <IssueKey issueKey={selectedEpic.key} />
                          <span>{selectedEpic.name}</span>
                        </span>
                      ) : (
                        <span style={{ color: jiraColors.textSecondary }}>
                          —
                        </span>
                      )}
                    </dd>
                    <dt style={{ color: jiraColors.textSecondary }}>Type</dt>
                    <dd style={{ color: jiraColors.textPrimary }}>
                      {selected.issueType}
                    </dd>
                    <dt style={{ color: jiraColors.textSecondary }}>
                      Created
                    </dt>
                    <dd style={{ color: jiraColors.textSecondary }}>
                      {selected.createdText}
                    </dd>
                    <dt style={{ color: jiraColors.textSecondary }}>
                      Updated
                    </dt>
                    <dd style={{ color: jiraColors.textSecondary }}>
                      {selected.updatedText}
                    </dd>
                  </dl>
                </section>

                <section>
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
              </div>
            </aside>
          )}
        </div>
      </div>
    </JiraShell>
  );
}
