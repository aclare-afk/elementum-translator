// ServiceNow design tokens.
// Source: PLATFORMS/servicenow.md § VISUAL IDENTITY.
// Every ServiceNow mock's UI must pull from here — do not inline hex codes in
// individual mocks, and do not invent new tokens without updating the platform
// fidelity file first.

export const snowColors = {
  // Brand
  brandGreen: "#62D84E",
  darkGreen: "#293E40", // left nav background in classic UI
  charcoal: "#161513", // near-black; top strip, primary text

  // Surfaces
  page: "#F6F7F8",
  surface: "#FFFFFF",
  surfaceAlt: "#EEEEF0",
  divider: "#DDE0E3",

  // Text
  textPrimary: "#161513",
  textMuted: "#6B7280",
  textOnDark: "#FFFFFF",
  linkBlue: "#1E6FBA", // ServiceNow list/form reference link color

  // Status / priority
  priorityCritical: "#D63638", // P1
  priorityHigh: "#F79009", // P2
  priorityModerate: "#EAB308", // P3
  priorityLow: "#2E90FA", // P4
  priorityPlanning: "#98A2B3", // P5
} as const;

// Map ServiceNow priority numeric code -> label + color.
// Matches the default ITSM incident priority choices.
export const snowPriority = {
  "1": { label: "1 - Critical", color: snowColors.priorityCritical },
  "2": { label: "2 - High", color: snowColors.priorityHigh },
  "3": { label: "3 - Moderate", color: snowColors.priorityModerate },
  "4": { label: "4 - Low", color: snowColors.priorityLow },
  "5": { label: "5 - Planning", color: snowColors.priorityPlanning },
} as const;

// ServiceNow incident state codes (default ITSM).
// Source: the out-of-box `incident.state` choice list.
export const snowIncidentState = {
  "1": "New",
  "2": "In Progress",
  "3": "On Hold",
  "6": "Resolved",
  "7": "Closed",
  "8": "Canceled",
} as const;

export const snowLayout = {
  navWidth: 240, // Application Navigator width
  topStripHeight: 32,
  listRowHeight: 36,
  formGutter: 24,
} as const;

// Typography stack. ServiceNow's real font is proprietary (Polaris / sn-font);
// Lato is the closest CDN-available match and passes a glance test.
export const snowFont = {
  family:
    '"Lato", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  sizeTable: "13px",
  sizeBody: "14px",
  sizeSection: "18px",
  sizeNav: "14px",
} as const;
