// StatusBadge — small pill used for Case Status, Opportunity Stage, Lead
// Status, Approval History decisions, and the like.
//
// Unlike Jira, Salesforce doesn't expose a public "status category" field —
// but in practice status fields resolve to one of a handful of visual
// treatments:
//   - neutral (New, Working, Prospecting, Negotiation)
//   - info (In Progress equivalents on a blue tint)
//   - success (Closed Won, Approved, Resolved)
//   - warning (Escalated, Needs Attention, On Hold)
//   - error (Closed Lost, Rejected)
//
// Consumers pass the tone explicitly; we don't try to auto-classify a string
// because picklists are customer-renameable and the SE will know what they
// mean better than we do.

import { salesforceColors, salesforceFont } from "./design-tokens";

export type StatusBadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "error";

type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
  /** Small dot rendered before the label — standard SLDS convention for stage chips. */
  withDot?: boolean;
};

const toneStyles: Record<
  StatusBadgeTone,
  { bg: string; text: string; dot: string }
> = {
  neutral: {
    bg: "#F3F3F3",
    text: salesforceColors.textBody,
    dot: salesforceColors.textWeak,
  },
  info: {
    bg: salesforceColors.statusInfoBg,
    text: salesforceColors.statusInfoText,
    dot: salesforceColors.statusInfoText,
  },
  success: {
    bg: salesforceColors.statusSuccessBg,
    text: salesforceColors.statusSuccessText,
    dot: salesforceColors.statusSuccessText,
  },
  warning: {
    bg: salesforceColors.statusWarningBg,
    text: salesforceColors.statusWarningText,
    dot: salesforceColors.statusWarningText,
  },
  error: {
    bg: salesforceColors.statusErrorBg,
    text: salesforceColors.statusErrorText,
    dot: salesforceColors.statusErrorText,
  },
};

export function StatusBadge({
  label,
  tone = "neutral",
  withDot = false,
}: StatusBadgeProps) {
  const style = toneStyles[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px]"
      style={{
        background: style.bg,
        color: style.text,
        fontFamily: salesforceFont.family,
      }}
    >
      {withDot && (
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: style.dot }}
        />
      )}
      {label}
    </span>
  );
}
