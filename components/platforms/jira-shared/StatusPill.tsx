// Jira status pill — the colored chip that displays an issue's current status.
// Shape and coloring come from the status's *category* (new / indeterminate /
// done), not its literal name, which is why this component takes the category
// and name separately.
//
// Real Jira renders these as rounded rectangles with category-specific bg/text
// colors. Customer-renamed statuses keep their category's color (e.g., a
// "Waiting for support" status in the `new` category still shows blue-gray).
//
// See PLATFORMS/jira.md § VISUAL IDENTITY > Status category colors.

import { jiraStatusCategory, jiraFont, type JiraStatusCategory } from "./design-tokens";

type StatusPillProps = {
  /** Literal status name, e.g., "To Do", "In Progress", "Waiting for support". */
  name: string;
  /** Which of the three Jira status categories this status falls under. */
  category: JiraStatusCategory;
  /** If true, render as a dropdown trigger (adds a small chevron). */
  trigger?: boolean;
};

export function StatusPill({ name, category, trigger = false }: StatusPillProps) {
  const cat = jiraStatusCategory[category];

  return (
    <span
      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{
        background: cat.bg,
        color: cat.text,
        fontFamily: jiraFont.family,
      }}
      aria-label={`Status: ${name}`}
    >
      {name}
      {trigger && (
        <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}
