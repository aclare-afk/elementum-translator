// UserChip — avatar + display name for Salesforce User references.
//
// Used wherever a User shows up on a record: Opportunity Owner, Case Owner,
// Approvers in Approval History, Chatter authors, Activity assignees, etc.
// Salesforce shows a round-cornered square avatar with the user's initials
// in white on the brand blue, plus the display name in link style.
//
// The accountId is the 18-char User record ID (`005...`). We don't render it
// visibly — it lives on the backing prop so consumers can wire click-through
// to `/lightning/r/User/{id}/view` if the mock needs it.

import { salesforceColors, salesforceFont } from "./design-tokens";

type UserChipProps = {
  /** 18-char User ID. Not rendered, but kept for completeness. */
  accountId: string;
  displayName: string;
  /** Pixel size of the avatar square. Defaults to 24. */
  size?: number;
  /** Optional secondary line (e.g., role/title), rendered in weak text below the name. */
  secondaryLine?: string;
};

export function UserChip({
  accountId: _accountId,
  displayName,
  size = 24,
  secondaryLine,
}: UserChipProps) {
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const fontSize = Math.round(size * 0.42);

  return (
    <span className="inline-flex items-center gap-2" style={{ fontFamily: salesforceFont.family }}>
      <span
        aria-hidden
        className="inline-flex items-center justify-center rounded-[3px] font-semibold text-white"
        style={{
          width: size,
          height: size,
          background: salesforceColors.brandBlue,
          fontSize,
          lineHeight: 1,
        }}
      >
        {initials || "?"}
      </span>
      <span className="flex flex-col leading-tight">
        <span
          className="text-[13px]"
          style={{ color: salesforceColors.textLink }}
        >
          {displayName}
        </span>
        {secondaryLine && (
          <span
            className="text-[11px]"
            style={{ color: salesforceColors.textWeak }}
          >
            {secondaryLine}
          </span>
        )}
      </span>
    </span>
  );
}
