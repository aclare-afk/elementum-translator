// Wraps this mock in ServiceNow chrome.
// Hard rule from SKILL.md § Step 4: "A ServiceNow mock MUST use <Nav /> and
// <Sidebar /> from components/platforms/servicenow/ so it actually looks like
// ServiceNow."

import { Frame } from "@/components/platforms/servicenow";
import { navConfig } from "./_lib/nav-config";

export default function ServiceNowItsmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Frame applications={navConfig} instance="acme">
      {children}
    </Frame>
  );
}
