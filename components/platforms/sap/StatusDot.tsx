// SAP ALV Grid status dot — a colored dot + label used in the Status column
// of procurement list transactions (ME5A, ME23N, etc.).
// Source: PLATFORMS/sap.md § VISUAL IDENTITY > SAP GUI > Status colors.
// The real ALV grid renders these via internal SAP icons (ICON_GREEN_LIGHT /
// ICON_YELLOW_LIGHT / ICON_RED_LIGHT); a colored dot reads the same at a
// glance and avoids hand-drawing an icon font.

import { sapColors, sapFont } from "./design-tokens";

type StatusDotProps = {
  label: string;
  color: string; // hex, typically from sapColors.status* or sapPrStatus[x].color
};

export function StatusDot({ label, color }: StatusDotProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        fontFamily: sapFont.family,
        fontSize: sapFont.sizeBody,
        color: sapColors.textPrimary,
      }}
    >
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: color, border: `1px solid ${sapColors.divider}` }}
        aria-hidden
      />
      <span>{label}</span>
    </span>
  );
}
