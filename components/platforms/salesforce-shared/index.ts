// Barrel export for shared Salesforce chrome. Used by Sales Cloud and
// Service Cloud mocks.
//
// Product-specific primitives (Sales Console subtabs, Service Console Omni
// widget, Case Feed publisher, etc.) live in product-specific folders and
// re-export their own tokens via their own index.ts. This file is the
// foundation every Salesforce mock depends on.

export { LightningShell, type LightningAppTab } from "./LightningShell";
export { DemoBanner } from "./DemoBanner";
export { ObjectIcon } from "./ObjectIcon";
export { UserChip } from "./UserChip";
export { RecordKey } from "./RecordKey";
export { StatusBadge, type StatusBadgeTone } from "./StatusBadge";
export { PathIndicator } from "./PathIndicator";
export { RecordHighlights } from "./RecordHighlights";
export { DetailsGrid, type DetailField, type DetailSection } from "./DetailsGrid";
export { RelatedList, type RelatedRow } from "./RelatedList";
export { Tabs, type TabItem } from "./Tabs";

export {
  salesforceColors,
  salesforceEntityColors,
  salesforceEntityGlyph,
  salesforceFont,
  salesforceLayout,
  salesforceOpportunityStages,
  salesforceCaseStatuses,
  type SalesforceEntity,
  type SalesforceOpportunityStage,
  type SalesforceCaseStatus,
} from "./design-tokens";
