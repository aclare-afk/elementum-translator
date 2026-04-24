// Salesforce design tokens — Salesforce Lightning Design System (SLDS 1).
// Source: PLATFORMS/salesforce.md § VISUAL IDENTITY.
//
// We default to SLDS 1 tokens, not SLDS 2. Most production orgs still render
// on SLDS 1 — the visual fingerprints customers recognize (the #0070D2 brand
// blue, the 56/40/36 header/nav/utility bar stack, the entity-color chips on
// standard objects) are SLDS 1. SLDS 2 is opt-in as of Spring '25; when a
// customer is explicitly on SLDS 2 the brand blue shifts to #1B96FF and a few
// other tokens change, but those are a swap-over at the token layer — the
// primitives and layout are shared.
//
// Light-theme only. Mocks don't ship a dark-mode mapping.

export const salesforceColors = {
  // Brand (SLDS 1 "Stage" defaults)
  brandBlue: "#0070D2", // primary Salesforce blue — buttons, links, active tabs
  brandBlueDark: "#014486", // pressed / emphasis
  brandBlueHover: "#005FB2", // hover on brand surfaces
  brandBlueV2: "#1B96FF", // SLDS 2 brand (for orgs on the newer system)

  // Surfaces
  page: "#F3F3F3", // SLDS "Stage" page background behind cards
  surface: "#FFFFFF", // card / panel background
  surfaceHover: "#FAFAF9", // hover on rows
  headerBg: "#FFFFFF", // 56px global header
  navBg: "#FFFFFF", // 40px app nav bar
  utilityBarBg: "#F3F2F2", // 36px bottom utility bar (console apps)

  // Borders
  border: "#DDDBDA",
  borderEmphasis: "#C9C7C5",
  divider: "#DDDBDA",

  // Text
  textHeading: "#181818",
  textBody: "#3E3E3C",
  textWeak: "#706E6B",
  textLink: "#0070D2",
  textOnBrand: "#FFFFFF",

  // Status (icon + bg pairs)
  statusSuccessText: "#2E844A",
  statusSuccessBg: "#D4FAE4",
  statusWarningText: "#FE9339",
  statusWarningBg: "#FEF1EE",
  statusErrorText: "#EA001E",
  statusErrorBg: "#FEDED9",
  statusInfoText: "#0176D3",
  statusInfoBg: "#D8EDFF",

  // Required-field asterisk
  requiredRed: "#EA001E",
} as const;

// Per-object entity colors used on the Standard SLDS icon family. When you
// render the chip for a standard object (Account/Contact/Lead/...), this is
// the background color behind the white glyph. See PLATFORMS/salesforce.md
// § VISUAL IDENTITY > Record Type / Entity colors.
export const salesforceEntityColors = {
  Account: "#7F8DE1",
  Contact: "#A094ED",
  Lead: "#F88962",
  Opportunity: "#FCB95B",
  Case: "#F2CF5B",
  Task: "#4BC076",
  Event: "#EB7092",
  User: "#5867E8",
  Campaign: "#F49E9E",
  // Fallback for custom objects (SLDS Custom icon family). Real orgs can pick
  // any color here per object; this is a reasonable neutral default.
  Custom: "#6C6FB9",
} as const;

export type SalesforceEntity = keyof typeof salesforceEntityColors;

// Single-letter glyphs used inside the entity chip when we don't ship an SVG
// icon for the object. Real SLDS icons are SVG sprites; using a letter is a
// deliberate mock shortcut that still reads as "Salesforce entity chip."
export const salesforceEntityGlyph: Record<SalesforceEntity, string> = {
  Account: "A",
  Contact: "C",
  Lead: "L",
  Opportunity: "$",
  Case: "◆",
  Task: "✓",
  Event: "◉",
  User: "U",
  Campaign: "📣",
  Custom: "⚙",
};

// Standard Opportunity stage names, in order. These are the out-of-the-box
// stages Salesforce ships on a new org. Customers commonly rename or prune
// them, but mocks should default to these names unless the scenario calls
// for customization. See PLATFORMS/salesforce.md § COMMON SE SCENARIOS.
export const salesforceOpportunityStages = [
  "Prospecting",
  "Qualification",
  "Needs Analysis",
  "Value Proposition",
  "Id. Decision Makers",
  "Perception Analysis",
  "Proposal/Price Quote",
  "Negotiation/Review",
  "Closed Won",
  "Closed Lost",
] as const;

export type SalesforceOpportunityStage =
  (typeof salesforceOpportunityStages)[number];

// Default Case statuses. Customer-configurable, but these are the new-org
// defaults per § COMMON SE SCENARIOS.
export const salesforceCaseStatuses = [
  "New",
  "Working",
  "Escalated",
  "Closed",
] as const;

export type SalesforceCaseStatus = (typeof salesforceCaseStatuses)[number];

// Layout primitives — numbers from PLATFORMS/salesforce.md § VISUAL IDENTITY
// > Layout primitives. Do not change without updating the fidelity file.
export const salesforceLayout = {
  headerHeight: 56, // global header
  navHeight: 40, // app navigation bar
  utilityBarHeight: 36, // console utility bar
  pagePaddingX: 24,
  pagePaddingY: 16,
  recordPageColumnGap: 16,
  relatedListPreviewRows: 3, // related lists show ~3 rows + "View All"
  highlightsCompactFieldsMax: 7, // compact layout caps at 7 fields
} as const;

// Typography. Real Salesforce ships "Salesforce Sans" as a web font; we fall
// back through a sensible stack. Base size 13px body per SLDS 1. Avoid 500/
// 600 font weights — SLDS doesn't ship them.
export const salesforceFont = {
  family: '"Salesforce Sans", "Inter", "Helvetica Neue", Arial, sans-serif',
  familyMono: '"SF Mono", Menlo, Consolas, monospace',
  sizeSmall: "11px",
  sizeBody: "13px",
  sizeMedium: "14px",
  sizeLarge: "16px",
  sizeHeadingS: "20px",
  sizeHeadingM: "24px",
  sizeHeadingL: "28px",
  weightRegular: "400",
  weightBold: "700",
  lineHeightBody: "1.5",
} as const;
