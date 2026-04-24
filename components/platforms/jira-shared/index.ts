// Barrel export for shared Jira chrome. Used by Jira Software and JSM mocks.
//
// Product-specific primitives (SoftwareSidebar, BoardColumn, QueueTable, etc.)
// live in the product-specific folders and re-export their own tokens via
// their own index.ts. This file is the foundation both depend on.

export { JiraShell } from "./JiraShell";
export { DemoBanner } from "./DemoBanner";
export { StatusPill } from "./StatusPill";
export { PriorityIcon } from "./PriorityIcon";
export { IssueKey } from "./IssueKey";
export { AccountChip } from "./AccountChip";

export {
  jiraColors,
  jiraStatusCategory,
  jiraPriority,
  jiraLayout,
  jiraFont,
  jiraSlaState,
  type JiraStatusCategory,
  type JiraPriorityName,
  type JiraSlaState,
} from "./design-tokens";
