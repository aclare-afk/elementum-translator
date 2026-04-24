// Jira issue key chip — the PROJ-123 identifier that appears in breadcrumbs,
// board cards, linked-issue lists, and everywhere else. Conventionally
// rendered as a monospace-ish link in Jira's brand blue.
//
// See PLATFORMS/jira.md § HYGIENE for the key shape: uppercase project key
// (2-10 chars) + hyphen + integer, e.g., "SUP-42".

import { jiraColors, jiraFont } from "./design-tokens";

type IssueKeyProps = {
  issueKey: string; // e.g., "SUP-42"
  href?: string;
  onClick?: () => void;
  /** Strike through the key when the issue is Done. */
  resolved?: boolean;
};

export function IssueKey({ issueKey, href, onClick, resolved = false }: IssueKeyProps) {
  const style = {
    color: jiraColors.textLink,
    fontFamily: jiraFont.family,
    textDecoration: resolved ? "line-through" : "none",
  } as const;

  if (href) {
    return (
      <a
        href={href}
        className="text-[12px] font-medium hover:underline"
        style={style}
        onClick={(e) => {
          if (onClick) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {issueKey}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[12px] font-medium hover:underline"
      style={style}
    >
      {issueKey}
    </button>
  );
}
