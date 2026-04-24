// Barrel export for Jira Service Management chrome. Depends on
// components/platforms/jira-shared/ for the design tokens and agent shell.
//
// JSM has TWO distinct chrome surfaces:
//   1. Agent view — uses JiraShell (from jira-shared) + JsmSidebar.
//   2. Customer portal — uses PortalShell (different minimal chrome).
// Pick one per mock; do not mix.

export { JsmSidebar, type JsmSidebarItem } from "./JsmSidebar";
export { QueueTable, type QueueColumn, type QueueRow } from "./QueueTable";
export { SLAChip } from "./SLAChip";
export { PortalShell } from "./PortalShell";
export { RequestTypeTile } from "./RequestTypeTile";
export {
  ApprovalPanel,
  type Approver,
  type ApprovalDecision,
} from "./ApprovalPanel";
