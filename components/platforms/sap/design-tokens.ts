// SAP design tokens (SAP GUI — the classic green-screen look).
// Source: PLATFORMS/sap.md § VISUAL IDENTITY > SAP GUI.
// This file is the default export for SAP mocks. Most procurement customers in
// 2026 still run SAP GUI daily for ME5A / ME51N / ME21N, so GUI is the
// default chrome. If a demo explicitly targets Fiori, use `sapFioriColors` etc.
// Every SAP mock's UI must pull from here — do not inline hex codes in
// individual mocks, and do not invent new tokens without updating the platform
// fidelity file first.

export const sapColors = {
  // Brand (SAP GUI)
  brandBlue: "#1A3A5C", // header bar
  brandBlueDark: "#0F2942", // toolbar accents
  brandOrange: "#F0AB00", // status row / SAP highlight

  // Surfaces
  page: "#D4D4D4", // content panel background
  surfaceAlt: "#F4F4F4", // selection screen background
  surface: "#FFFFFF", // table cells
  zebra: "#FAFAFA", // alternating ALV row
  divider: "#E6E6E6",

  // Text
  textPrimary: "#0F0F0F",
  textMuted: "#606060",
  textOnDark: "#FFFFFF",

  // ALV Grid status dots
  statusReleased: "#4CAF50", // Released / Approved
  statusPending: "#FFC107", // Pending / Awaiting
  statusInProcess: "#2196F3", // In process / Active
  statusClosed: "#9E9E9E", // Closed / Cancelled
  statusBlocked: "#F44336", // Blocked / Error
} as const;

// Fiori tokens — kept separate so mocks can opt into the modern look when a
// customer is on S/4HANA Fiori. Most procurement mocks should use sapColors
// above. See PLATFORMS/sap.md § VISUAL IDENTITY > SAP Fiori.
export const sapFioriColors = {
  brandBlue: "#0070F2",
  brandBlueDark: "#0854A0",
  page: "#FFFFFF",
  surface: "#F5F6F7",
  divider: "#E5E5E5",
  textPrimary: "#0F0F0F",
  textMuted: "#606060",
} as const;

// Mapping of common SAP Purchase Requisition / Purchase Order release statuses
// to status-dot tokens. Use `sapPrStatus[code]` to render a StatusDot with the
// right label and color. These are not SAP's internal status codes (those are
// transaction-specific) but the labels a business user sees on ME5A.
export const sapPrStatus = {
  OPEN: { label: "Open", color: sapColors.statusPending },
  RELEASED: { label: "Released", color: sapColors.statusReleased },
  IN_PROCESS: { label: "In Process", color: sapColors.statusInProcess },
  BLOCKED: { label: "Blocked", color: sapColors.statusBlocked },
  CLOSED: { label: "Closed", color: sapColors.statusClosed },
} as const;

// Layout primitives (SAP GUI). See PLATFORMS/sap.md § VISUAL IDENTITY > Layout.
export const sapLayout = {
  headerHeight: 28, // top SAP wordmark strip
  menuBarHeight: 24, // Menu / Edit / Goto / System / Help
  toolbarHeight: 28, // icon-only standard toolbar
  txnInputWidth: 140, // transaction code input (~12 chars wide)
  statusBarHeight: 20,
  alvRowHeight: 22,
} as const;

// Typography.
// SAP GUI's real default on Windows is Arial 12px, with Courier on ALV cells.
// We inherit that verbatim so screenshots pass a glance test.
export const sapFont = {
  family: 'Arial, "Segoe UI", system-ui, -apple-system, sans-serif',
  familyMono: '"Courier New", Consolas, Menlo, monospace',
  sizeBody: "12px",
  sizeLabel: "11px", // labels are 11px bold per platform file
  sizeTxn: "11px", // transaction code bar is 11px mono
} as const;

// Fiori font (for mocks that opt into Fiori chrome).
export const sapFioriFont = {
  // Real Fiori ships with the "72" typeface. Arial is a public fallback that
  // matches the metrics closely enough for a mock.
  family: 'Arial, "Segoe UI", system-ui, -apple-system, sans-serif',
  sizeBody: "14px",
  sizeSection: "18px",
} as const;
