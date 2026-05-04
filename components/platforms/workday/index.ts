// Barrel export for Workday chrome. Mocks should import from this module.
export { WorkdayShell, type WorkdayBreadcrumb } from "./WorkdayShell";
export {
  WorkletGrid,
  WorkletPageHeader,
  type Worklet,
} from "./WorkletGrid";
export {
  AbsenceBalanceRow,
  type AbsenceBalance,
} from "./AbsenceBalanceCard";
export { AbsenceStatusBadge } from "./AbsenceStatusBadge";
export { DemoBanner } from "./DemoBanner";
export {
  workdayColors,
  workdayLayout,
  workdayFont,
  workdayAbsenceState,
  workdayAbsenceStateTone,
  type WorkdayAbsenceStateKey,
} from "./design-tokens";
