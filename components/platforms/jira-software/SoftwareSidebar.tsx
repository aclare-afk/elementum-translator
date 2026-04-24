// Jira Software project left sidebar. Contains the project avatar + name +
// type badge at the top, then grouped nav items: Planning (Backlog, Board,
// Timeline), Development (Code, Releases), Tracking (Issues, Reports,
// Components).
//
// Active nav item shows Jira-blue left accent bar + bold text + light-blue
// background tint.
//
// Matches PLATFORMS/jira.md § UI PATTERNS > Jira Software anatomy.

"use client";

import { jiraColors, jiraFont } from "@/components/platforms/jira-shared";

export type SoftwareSidebarItem =
  | "backlog"
  | "board"
  | "timeline"
  | "releases"
  | "reports"
  | "issues"
  | "components"
  | "code";

type SoftwareSidebarProps = {
  /** Project display name, e.g., "Support Platform". */
  projectName: string;
  /** Project key, e.g., "SUP". */
  projectKey: string;
  /** Board type (scrum or kanban) — only affects the small label under the name. */
  boardType?: "Kanban" | "Scrum";
  /** Which nav item is active. Passed from the mock's current view. */
  active: SoftwareSidebarItem;
  onNavigate?: (item: SoftwareSidebarItem) => void;
};

const SECTIONS: {
  heading: string | null;
  items: { key: SoftwareSidebarItem; label: string }[];
}[] = [
  {
    heading: "Planning",
    items: [
      { key: "backlog", label: "Backlog" },
      { key: "board", label: "Board" },
      { key: "timeline", label: "Timeline" },
    ],
  },
  {
    heading: "Development",
    items: [
      { key: "code", label: "Code" },
      { key: "releases", label: "Releases" },
    ],
  },
  {
    heading: "Tracking",
    items: [
      { key: "issues", label: "Issues" },
      { key: "reports", label: "Reports" },
      { key: "components", label: "Components" },
    ],
  },
];

export function SoftwareSidebar({
  projectName,
  projectKey,
  boardType = "Kanban",
  active,
  onNavigate,
}: SoftwareSidebarProps) {
  return (
    <div className="flex h-full flex-col" style={{ fontFamily: jiraFont.family }}>
      {/* Project identity header */}
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
            title={projectName}
          >
            {projectName}
          </div>
          <div className="text-[11px]" style={{ color: jiraColors.textSecondary }}>
            {boardType} software project
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {SECTIONS.map((section) => (
          <div key={section.heading ?? "default"} className="mb-4">
            {section.heading && (
              <div
                className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: jiraColors.textSecondary }}
              >
                {section.heading}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = item.key === active;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => onNavigate?.(item.key)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] transition"
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
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
