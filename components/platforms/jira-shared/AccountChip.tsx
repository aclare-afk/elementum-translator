// Jira user chip — avatar + display name. Appears on issue details
// (Assignee / Reporter), comment authors, board card footers.
//
// Real Jira shows a circular avatar image. For mocks we use a colored
// initial-monogram circle (deterministic color from the displayName hash)
// because we don't have real avatar URLs.

import { jiraFont, jiraColors } from "./design-tokens";

type AccountChipProps = {
  /** Atlassian accountId (opaque UUID-shaped string). */
  accountId: string;
  displayName: string;
  /** Optional avatar image URL. If not provided, the monogram fallback is used. */
  avatarUrl?: string;
  /** Render only the avatar (no name) — useful for tight board cards. */
  compact?: boolean;
  size?: number;
};

const CHIP_PALETTE = [
  "#0052CC",
  "#00875A",
  "#DE350B",
  "#5243AA",
  "#172B4D",
  "#403294",
  "#974F0C",
  "#006644",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return CHIP_PALETTE[Math.abs(hash) % CHIP_PALETTE.length];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function AccountChip({
  accountId,
  displayName,
  avatarUrl,
  compact = false,
  size = 24,
}: AccountChipProps) {
  const bg = colorFor(accountId || displayName);

  const avatar = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt={displayName}
      width={size}
      height={size}
      className="rounded-full object-cover"
    />
  ) : (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: Math.round(size * 0.42),
        fontFamily: jiraFont.family,
      }}
      aria-label={displayName}
    >
      {initials(displayName)}
    </span>
  );

  if (compact) return avatar;

  return (
    <span className="inline-flex items-center gap-2">
      {avatar}
      <span
        className="text-[13px]"
        style={{ color: jiraColors.textPrimary, fontFamily: jiraFont.family }}
      >
        {displayName}
      </span>
    </span>
  );
}
