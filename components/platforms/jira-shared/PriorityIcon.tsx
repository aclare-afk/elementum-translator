// Jira priority icon — small arrow glyph that appears in issue lists, board
// cards, and the issue view details sidebar.
//
// Real Jira uses five priority levels (Highest, High, Medium, Low, Lowest),
// each with its own SVG arrow and color. See PLATFORMS/jira.md § HYGIENE.
// The shape and color pairs are hard-coded on purpose — customers sometimes
// rename the priorities but the visual language stays the same.

import { jiraPriority, type JiraPriorityName } from "./design-tokens";

type PriorityIconProps = {
  priority: JiraPriorityName;
  /** Whether to render the priority name next to the icon. */
  showLabel?: boolean;
  size?: number;
};

export function PriorityIcon({
  priority,
  showLabel = false,
  size = 14,
}: PriorityIconProps) {
  const { color, arrow } = jiraPriority[priority];

  const svg = (() => {
    switch (arrow) {
      case "double-up":
        return (
          <>
            <path d="M8 3L3 8h3v5h4V8h3z" />
            <path d="M8 9L3 14h3v0h4v0h3z" />
          </>
        );
      case "up":
        return <path d="M8 3L3 10h3v3h4v-3h3z" />;
      case "right":
        return <path d="M3 6v4h7v3l4-5-4-5v3z" />;
      case "down":
        return <path d="M8 13L3 6h3V3h4v3h3z" />;
      case "double-down":
        return (
          <>
            <path d="M8 13L3 8h3V3h4v5h3z" />
            <path d="M8 7L3 2h3v0h4v0h3z" />
          </>
        );
    }
  })();

  return (
    <span
      className="inline-flex items-center gap-1"
      title={`Priority: ${priority}`}
      aria-label={`Priority: ${priority}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill={color}
        aria-hidden
      >
        {svg}
      </svg>
      {showLabel && <span className="text-[12px] text-[#172B4D]">{priority}</span>}
    </span>
  );
}
