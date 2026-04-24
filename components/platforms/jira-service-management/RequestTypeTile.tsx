// JSM portal request-type tile. On the customer portal landing page,
// each request type is a tile with an icon, name, and short description.
// Clicking one opens the request form for that request type.
//
// See PLATFORMS/jira.md § UI PATTERNS > JSM Customer Portal.

import { jiraColors, jiraFont } from "@/components/platforms/jira-shared";

type RequestTypeTileProps = {
  /** Request type ID (small integer, e.g., 25). */
  id: string;
  /** Display name (e.g., "Get IT help"). */
  name: string;
  /** One-line description of when to use this request type. */
  description: string;
  /**
   * Emoji icon — real portals let admins upload SVG icons per request type.
   * We accept a single-char-or-emoji string here and render it in a rounded
   * square.
   */
  icon: string;
  onClick?: (id: string) => void;
};

export function RequestTypeTile({
  id,
  name,
  description,
  icon,
  onClick,
}: RequestTypeTileProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(id)}
      className="flex items-start gap-3 rounded border bg-white p-4 text-left transition hover:shadow-md"
      style={{
        borderColor: jiraColors.divider,
        fontFamily: jiraFont.family,
      }}
    >
      <span
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded text-[22px]"
        style={{ background: jiraColors.statusInProgressBg }}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span
          className="block text-[14px] font-semibold"
          style={{ color: jiraColors.textPrimary }}
        >
          {name}
        </span>
        <span
          className="mt-0.5 block text-[12px]"
          style={{ color: jiraColors.textSecondary }}
        >
          {description}
        </span>
      </span>
    </button>
  );
}
