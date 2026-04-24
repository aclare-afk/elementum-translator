// JSM SLA countdown chip — the colored pill an agent sees in a queue row
// showing how much time is left on an SLA goal (e.g., Time to First Response
// or Time to Resolution).
//
// Coloring:
//   - > 20% remaining -> green (healthy)
//   - 1-20% remaining -> yellow (at risk)
//   - <= 0 remaining  -> red (breached)
//   - paused          -> gray
//   - completed       -> green (cleared / closed out)
//
// See PLATFORMS/jira.md § UI PATTERNS > JSM Queue view for the SLA cell
// semantics this mirrors.

import {
  jiraFont,
  jiraSlaState,
  type JiraSlaState,
} from "@/components/platforms/jira-shared";

type SLAChipProps = {
  /**
   * Remaining milliseconds. Negative means breached by |value| ms.
   * Ignored when `paused` or `completed` is true.
   */
  remainingMs?: number;
  /** Total SLA target in ms — used to derive at-risk threshold (< 20% left). */
  targetMs?: number;
  paused?: boolean;
  completed?: boolean;
  /** Small label above / before the countdown, e.g., "Time to resolution". */
  goalName?: string;
};

function fmtDuration(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  if (d > 0) return `${sign}${d}d ${h}h`;
  if (h > 0) return `${sign}${h}h ${m}m`;
  return `${sign}${m}m`;
}

export function SLAChip({
  remainingMs,
  targetMs,
  paused = false,
  completed = false,
  goalName,
}: SLAChipProps) {
  const state: JiraSlaState = (() => {
    if (completed) return "completed";
    if (paused) return "paused";
    if (typeof remainingMs !== "number") return "healthy";
    if (remainingMs <= 0) return "breached";
    if (targetMs && remainingMs / targetMs <= 0.2) return "atRisk";
    return "healthy";
  })();

  const style = jiraSlaState[state];
  const text =
    completed
      ? "Completed"
      : paused
        ? "Paused"
        : typeof remainingMs === "number"
          ? fmtDuration(remainingMs)
          : "—";

  return (
    <span
      className="inline-flex flex-col items-start"
      style={{ fontFamily: jiraFont.family }}
    >
      {goalName && (
        <span
          className="text-[10px] uppercase tracking-wide"
          style={{ color: "#6B778C" }}
        >
          {goalName}
        </span>
      )}
      <span
        className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[12px] font-semibold"
        style={{ background: style.bg, color: style.text }}
        aria-label={`SLA ${style.label}: ${text}`}
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: style.text }}
          aria-hidden
        />
        {text}
      </span>
    </span>
  );
}
