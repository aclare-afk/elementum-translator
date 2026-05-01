// ServiceNow top strip — the thin charcoal bar that sits above the classic UI
// frame with the ServiceNow wordmark on the left and the user menu on the
// right. Matches PLATFORMS/servicenow.md § VISUAL IDENTITY > Layout primitives
// (classic UI): "Top strip: 32px tall, charcoal."

import { snowColors, snowLayout, snowFont } from "./design-tokens";

type NavProps = {
  instance?: string; // e.g., "acme" -> "acme.service-now.com"
  /** Display name shown in the top-right user badge. */
  userLabel?: string;
  /**
   * Role/view text shown to the left of the user badge. Defaults to "Self
   * Service view" when a normal-user label is set, otherwise "System
   * Administrator view". A demo can override directly via this prop.
   */
  viewLabel?: string;
};

export function Nav({
  instance = "acme",
  userLabel = "System Administrator",
  viewLabel,
}: NavProps) {
  // If the caller passed an explicit viewLabel, use it. Otherwise derive a
  // reasonable label from the userLabel — admin gets "System Administrator
  // view", everyone else gets a personal view label.
  const resolvedViewLabel =
    viewLabel ??
    (userLabel === "System Administrator"
      ? "System Administrator view"
      : `${userLabel}'s view`);

  return (
    <header
      className="flex items-center justify-between px-4 text-xs"
      style={{
        height: snowLayout.topStripHeight,
        background: snowColors.charcoal,
        color: snowColors.textOnDark,
        fontFamily: snowFont.family,
      }}
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-semibold tracking-wide">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: snowColors.brandGreen }}
            aria-hidden
          />
          <span>servicenow</span>
        </span>
        <span className="text-[11px] text-neutral-400">{instance}.service-now.com</span>
      </div>
      <div className="flex items-center gap-4 text-[11px]">
        <span className="text-neutral-300">{resolvedViewLabel}</span>
        <span className="rounded-sm border border-neutral-700 px-1.5 py-0.5 text-neutral-300">
          {userLabel}
        </span>
      </div>
    </header>
  );
}
