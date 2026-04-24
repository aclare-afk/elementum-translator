// Jira design tokens — Atlassian Design System.
// Source: PLATFORMS/jira.md § VISUAL IDENTITY.
//
// Shared between Jira Software and Jira Service Management because both
// products run on the same Atlassian design system (colors, typography,
// layout primitives). Product-specific chrome (SoftwareSidebar, JsmSidebar)
// lives under the respective platform folder but imports these tokens.
//
// Hex values are the light-theme resolved values of the Atlassian design
// tokens (e.g., `color.icon.brand` resolves to #0052CC in light mode). We
// don't ship the full dark-theme mapping — mocks are light-only.

export const jiraColors = {
  // Brand
  brandBlue: "#0052CC", // primary Jira blue (buttons, links, active nav)
  brandBlueBold: "#0747A6", // hover / pressed / legacy topbar background
  atlassianBlue: "#0065FF", // secondary accent

  // Surfaces
  page: "#F4F5F7", // app background behind cards
  surface: "#FFFFFF", // card / panel background
  topNavBg: "#FFFFFF", // modern chrome (legacy was #0747A6)
  sidebarBg: "#FAFBFC", // left project sidebar
  divider: "#DFE1E6",

  // Text
  textPrimary: "#172B4D",
  textSecondary: "#6B778C",
  textOnBrand: "#FFFFFF",
  textLink: "#0052CC",

  // Status category pills (background / text pairs)
  statusTodoBg: "#DFE1E6",
  statusTodoText: "#42526E",
  statusInProgressBg: "#DEEBFF",
  statusInProgressText: "#0747A6",
  statusDoneBg: "#E3FCEF",
  statusDoneText: "#006644",
  statusWarningBg: "#FFF0B3", // SLA at risk, soft warnings
  statusWarningText: "#974F0C",
  statusErrorBg: "#FFEBE6", // SLA breached, errors
  statusErrorText: "#BF2600",
  statusPurpleBg: "#EAE6FF",
  statusPurpleText: "#403294",

  // Priority icons (colors only — svg arrows are drawn in PriorityIcon)
  priorityHighest: "#CD1F1F",
  priorityHigh: "#E9503F",
  priorityMedium: "#E9A93F",
  priorityLow: "#57A55A",
  priorityLowest: "#2E7033",
} as const;

// The three status categories drive column color on boards and pill color on
// issue rows regardless of the status's literal name. Customers can rename
// statuses (e.g., "To Do" -> "Waiting for support") but the category is one
// of these three. See PLATFORMS/jira.md § CAPABILITIES > Workflow.
export const jiraStatusCategory = {
  new: { label: "To Do", bg: jiraColors.statusTodoBg, text: jiraColors.statusTodoText },
  indeterminate: {
    label: "In Progress",
    bg: jiraColors.statusInProgressBg,
    text: jiraColors.statusInProgressText,
  },
  done: { label: "Done", bg: jiraColors.statusDoneBg, text: jiraColors.statusDoneText },
} as const;

export type JiraStatusCategory = keyof typeof jiraStatusCategory;

// Priority name -> icon color. Jira always ships these five names; don't
// invent others. See PLATFORMS/jira.md § HYGIENE.
export const jiraPriority = {
  Highest: { color: jiraColors.priorityHighest, arrow: "double-up" as const },
  High: { color: jiraColors.priorityHigh, arrow: "up" as const },
  Medium: { color: jiraColors.priorityMedium, arrow: "right" as const },
  Low: { color: jiraColors.priorityLow, arrow: "down" as const },
  Lowest: { color: jiraColors.priorityLowest, arrow: "double-down" as const },
} as const;

export type JiraPriorityName = keyof typeof jiraPriority;

// Layout primitives. See PLATFORMS/jira.md § VISUAL IDENTITY > Layout.
export const jiraLayout = {
  topNavHeight: 56, // global top bar
  sidebarWidth: 240, // project left sidebar (expanded)
  sidebarWidthCollapsed: 56,
  pagePadding: 24, // top-level content area padding
  cardPadding: 16,
  issueRowHeight: 32,
  boardCardMinHeight: 64,
} as const;

// Typography. Real Jira ships Atlassian Sans + Atlassian Mono (web fonts).
// We fall back to Inter -> system for the public CDN reality. Marketing uses
// Charlie Sans; in-product is Atlassian Sans.
export const jiraFont = {
  family: '"Atlassian Sans", "Inter", "Helvetica Neue", Arial, sans-serif',
  familyMono: '"Atlassian Mono", "SF Mono", Menlo, Consolas, monospace',
  sizeBody: "14px",
  sizeSmall: "12px",
  sizeHeadingS: "16px",
  sizeHeadingM: "20px",
  sizeHeadingL: "24px",
  weightRegular: "400",
  weightMedium: "500",
  weightSemibold: "600",
  weightBold: "700",
  lineHeightBody: "20px",
} as const;

// SLA chip states (JSM-specific, but tokens live here because the colors are
// shared with the status category palette). See PLATFORMS/jira.md § UI
// PATTERNS > JSM Queue view.
export const jiraSlaState = {
  healthy: {
    label: "Healthy",
    bg: jiraColors.statusDoneBg,
    text: jiraColors.statusDoneText,
  }, // > 20% remaining
  atRisk: {
    label: "At risk",
    bg: jiraColors.statusWarningBg,
    text: jiraColors.statusWarningText,
  }, // 1-20% remaining
  breached: {
    label: "Breached",
    bg: jiraColors.statusErrorBg,
    text: jiraColors.statusErrorText,
  }, // <= 0 remaining
  paused: {
    label: "Paused",
    bg: jiraColors.statusTodoBg,
    text: jiraColors.statusTodoText,
  },
  completed: {
    label: "Completed",
    bg: jiraColors.statusDoneBg,
    text: jiraColors.statusDoneText,
  },
} as const;

export type JiraSlaState = keyof typeof jiraSlaState;
