// Workday design tokens.
// Source: PLATFORMS/workday.md § VISUAL IDENTITY.
// Every Workday mock's UI must pull from here — do not inline hex codes in
// individual mocks, and do not invent new tokens without updating the platform
// fidelity file first.

export const workdayColors = {
  // Brand
  brandOrange: "#F38B00", // Workday wordmark orange
  headerNavy: "#1E2A3A", // top-bar background — dark slate-blue, not pure black
  actionBlue: "#0875E1", // clickable links / button accents

  // Surfaces
  page: "#F4F5F7",
  surface: "#FFFFFF",
  surfaceAlt: "#F9FAFB",
  divider: "#E5E7EB",

  // Text
  textPrimary: "#1E2A3A",
  textSecondary: "#5A6675",
  textOnDark: "#FFFFFF",
  textMuted: "#9AA4B2",

  // Status — absence request states + general affordances
  statusApproved: "#198754",
  statusApprovedBg: "#D1FAE5",
  statusSubmitted: "#92400E",
  statusSubmittedBg: "#FEF3C7",
  statusInProgress: "#1F5BB6",
  statusInProgressBg: "#DBEAFE",
  statusDenied: "#B91C1C",
  statusDeniedBg: "#FEE2E2",
  statusCanceled: "#374151",
  statusCanceledBg: "#F3F4F6",
} as const;

// Absence request states with display labels.
// Source: PLATFORMS/workday.md § UI PATTERNS — Absence Request form.
export const workdayAbsenceState = {
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  DENIED: "Denied",
  CANCELED: "Canceled",
} as const;

export type WorkdayAbsenceStateKey = keyof typeof workdayAbsenceState;

// Map absence state -> chip color tokens.
export const workdayAbsenceStateTone: Record<
  WorkdayAbsenceStateKey,
  { fg: string; bg: string }
> = {
  IN_PROGRESS: {
    fg: workdayColors.statusInProgress,
    bg: workdayColors.statusInProgressBg,
  },
  SUBMITTED: {
    fg: workdayColors.statusSubmitted,
    bg: workdayColors.statusSubmittedBg,
  },
  APPROVED: {
    fg: workdayColors.statusApproved,
    bg: workdayColors.statusApprovedBg,
  },
  DENIED: {
    fg: workdayColors.statusDenied,
    bg: workdayColors.statusDeniedBg,
  },
  CANCELED: {
    fg: workdayColors.statusCanceled,
    bg: workdayColors.statusCanceledBg,
  },
};

export const workdayLayout = {
  topBarHeight: 56,
  searchBarMaxWidth: 480,
  pagePaddingX: 24,
  pagePaddingY: 24,
  contentMaxWidth: 1200,
  workletCardSize: 180,
  workletGap: 16,
  inboxWidth: 320,
} as const;

// Typography stack. Workday's real product font is proprietary
// ("Worksans" / "Workday Sans"). Inter is the closest CDN-available match
// and passes a glance test at 13–16px.
export const workdayFont = {
  family:
    '"Inter", "Inter var", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  sizeBody: "14px",
  sizeWorkletTitle: "15px",
  sizeTable: "13px",
  sizeSection: "18px",
  sizeLabel: "12px",
} as const;
