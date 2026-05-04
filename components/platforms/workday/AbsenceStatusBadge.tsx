// Pill-shape status indicator for an absence request's lifecycle state.
// Maps the canonical state (IN_PROGRESS / SUBMITTED / APPROVED / DENIED /
// CANCELED) to the brand-tone tokens defined in design-tokens.ts.
//
// Used in the Time Off history list and on the absence request detail page.

import {
  workdayAbsenceState,
  workdayAbsenceStateTone,
  type WorkdayAbsenceStateKey,
} from "./design-tokens";

export function AbsenceStatusBadge({
  state,
}: {
  state: WorkdayAbsenceStateKey;
}) {
  const tone = workdayAbsenceStateTone[state];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{
        background: tone.bg,
        color: tone.fg,
      }}
    >
      {workdayAbsenceState[state]}
    </span>
  );
}
