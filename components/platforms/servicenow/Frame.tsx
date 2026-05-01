// ServiceNow classic UI frame: Nav on top + Sidebar on left + content area.
// Every ServiceNow mock layout.tsx wraps its page with this.
// The frame is styled to match ServiceNow's classic Application Navigator
// shell per PLATFORMS/servicenow.md § UI PATTERNS.

import { Nav } from "./Nav";
import { Sidebar, type SidebarApplication } from "./Sidebar";
import { DemoBanner } from "./DemoBanner";
import { snowColors, snowFont } from "./design-tokens";

type FrameProps = {
  applications: SidebarApplication[];
  instance?: string;
  /** Display name shown in the top-right user badge of the Nav. */
  userLabel?: string;
  /** Role/view text shown to the left of the user badge. Optional override. */
  viewLabel?: string;
  children: React.ReactNode;
};

export function Frame({
  applications,
  instance,
  userLabel,
  viewLabel,
  children,
}: FrameProps) {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: snowColors.page,
        color: snowColors.textPrimary,
        fontFamily: snowFont.family,
        fontSize: snowFont.sizeBody,
      }}
    >
      <DemoBanner />
      <Nav instance={instance} userLabel={userLabel} viewLabel={viewLabel} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar applications={applications} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
