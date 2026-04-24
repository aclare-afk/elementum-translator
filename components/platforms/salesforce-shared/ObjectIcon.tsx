// ObjectIcon — Salesforce SLDS entity icon chip.
//
// In real Salesforce, the SLDS icon package ships SVG sprites across three
// families: Standard (colored per-object entity chips like the Account house
// glyph), Utility (monochrome action icons), and Custom (for custom objects).
// We don't redistribute the SLDS sprite sheet in mocks — but we DO ship the
// per-object background color from PLATFORMS/salesforce.md § VISUAL
// IDENTITY, with a short glyph inside so the chip reads as a Salesforce
// entity chip rather than a generic avatar.
//
// Sizes: 24px (row glyph), 32px (default, used in Highlights panel + tab
// icon), 48px (large / compact layout overrides).

import {
  salesforceEntityColors,
  salesforceEntityGlyph,
  type SalesforceEntity,
} from "./design-tokens";

type ObjectIconProps = {
  /** Which standard (or Custom) SLDS entity to render. */
  entity: SalesforceEntity;
  /** Pixel size of the square chip. Defaults to 32. */
  size?: number;
  /** Override the glyph (e.g., a custom-object abbreviation). */
  glyphOverride?: string;
  /** Override the background color (custom objects commonly have a bespoke color). */
  colorOverride?: string;
  /** Accessible label; falls back to the entity name. */
  label?: string;
};

export function ObjectIcon({
  entity,
  size = 32,
  glyphOverride,
  colorOverride,
  label,
}: ObjectIconProps) {
  const bg = colorOverride ?? salesforceEntityColors[entity];
  const glyph = glyphOverride ?? salesforceEntityGlyph[entity];
  const fontSize = Math.round(size * 0.45);

  return (
    <span
      role="img"
      aria-label={label ?? entity}
      className="inline-flex shrink-0 items-center justify-center rounded-[4px] font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize,
        lineHeight: 1,
      }}
    >
      {glyph}
    </span>
  );
}
