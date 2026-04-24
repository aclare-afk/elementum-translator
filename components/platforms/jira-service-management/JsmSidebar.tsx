// Jira Service Management agent left sidebar. Different items from Jira
// Software — agents work primarily in Queues.
//
// Matches PLATFORMS/jira.md § UI PATTERNS > JSM Queue view.

"use client";

import { jiraColors, jiraFont } from "@/components/platforms/jira-shared";

export type JsmSidebarItem =
  | "queues"
  | "requests"
  | "customers"
  | "knowledge-base"
  | "reports"
  | "channels"
  | "assets"
  | "sla";

type Queue = {
  id: string;
  name: string;
  count: number;
};

type JsmSidebarProps = {
  serviceDeskName: string;
  projectKey: string;
  active: JsmSidebarItem;
  onNavigate?: (item: JsmSidebarItem) => void;
  /**
   * When `active === "queues"`, render a collapsible list of named queues
   * under the Queues nav item with their current issue counts. Clicking one
   * loads the queue in the main pane.
   */
  queues?: Queue[];
  selectedQueueId?: string;
  onSelectQueue?: (queueId: string) => void;
};

const NAV: { key: JsmSidebarItem; label: string }[] = [
  { key: "queues", label: "Queues" },
  { key: "requests", label: "Requests" },
  { key: "customers", label: "Customers" },
  { key: "knowledge-base", label: "Knowledge base" },
  { key: "assets", label: "Assets" },
  { key: "channels", label: "Channels" },
  { key: "reports", label: "Reports" },
  { key: "sla", label: "SLAs" },
];

export function JsmSidebar({
  serviceDeskName,
  projectKey,
  active,
  onNavigate,
  queues,
  selectedQueueId,
  onSelectQueue,
}: JsmSidebarProps) {
  return (
    <div className="flex h-full flex-col" style={{ fontFamily: jiraFont.family }}>
      {/* Service desk identity */}
      <div
        className="flex items-center gap-2 border-b px-3 py-3"
        style={{ borderColor: jiraColors.divider }}
      >
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded font-semibold text-white"
          style={{ background: jiraColors.brandBlueBold, fontSize: 13 }}
          aria-hidden
        >
          {projectKey.slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-[13px] font-semibold"
            style={{ color: jiraColors.textPrimary }}
            title={serviceDeskName}
          >
            {serviceDeskName}
          </div>
          <div className="text-[11px]" style={{ color: jiraColors.textSecondary }}>
            Service project
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const isActive = item.key === active;
            const showQueueList = item.key === "queues" && isActive && queues;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onNavigate?.(item.key)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px]"
                  style={{
                    background: isActive ? jiraColors.statusInProgressBg : "transparent",
                    color: isActive
                      ? jiraColors.statusInProgressText
                      : jiraColors.textPrimary,
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <span
                    className="inline-block h-3.5 w-3.5 rounded-sm"
                    style={{
                      background: isActive
                        ? jiraColors.brandBlue
                        : jiraColors.divider,
                    }}
                    aria-hidden
                  />
                  {item.label}
                </button>

                {showQueueList && (
                  <ul className="mt-1 space-y-0.5 pl-7">
                    {queues!.map((q) => {
                      const isSelected = q.id === selectedQueueId;
                      return (
                        <li key={q.id}>
                          <button
                            type="button"
                            onClick={() => onSelectQueue?.(q.id)}
                            className="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-[12px]"
                            style={{
                              background: isSelected
                                ? "rgba(0,82,204,0.08)"
                                : "transparent",
                              color: isSelected
                                ? jiraColors.brandBlue
                                : jiraColors.textPrimary,
                              fontWeight: isSelected ? 600 : 400,
                            }}
                          >
                            <span className="truncate">{q.name}</span>
                            <span
                              className="text-[10px] font-semibold"
                              style={{ color: jiraColors.textSecondary }}
                            >
                              {q.count}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
