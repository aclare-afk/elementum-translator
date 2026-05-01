// Wraps this mock in ServiceNow chrome.
// Hard rule from SKILL.md § Step 4: "A ServiceNow mock MUST use <Nav /> and
// <Sidebar /> from components/platforms/servicenow/ so it actually looks like
// ServiceNow."
//
// The chrome's "logged-in user" badge is dynamic: it reads the most-recent
// incident's sys_created_by from the durable store and derives a friendly
// display name. So when an Elementum agent creates an incident on behalf of
// the calling user (via the dynamic-submitter feature), the chrome
// immediately reflects that user as the logged-in viewer — not the hardcoded
// "System Administrator" default. Falls back to the default when the store
// is empty.

import { Frame } from "@/components/platforms/servicenow";
import { listIncidents } from "./_lib/db";
import { navConfig } from "./_lib/nav-config";

// Dynamic so the layout re-evaluates on every request — incidents created
// since the last render show up immediately as the new "current user".
export const dynamic = "force-dynamic";

/**
 * Derive a presentable display name from an arbitrary `sys_created_by` value.
 * ServiceNow stores `sys_created_by` as a username string (e.g. "dana.acme",
 * "aclare@elementum.com", "jdavis"). Title-case the local part of an email or
 * the dotted/underscored username; otherwise capitalize the first letter.
 *
 *   "aclare@elementum.com"  → "Aclare"
 *   "alex.clare@acme.com"   → "Alex Clare"
 *   "dana.acme"             → "Dana Acme"
 *   "jdavis"                → "Jdavis"
 */
function deriveUserLabel(rawCreatedBy: string | undefined): string {
  if (!rawCreatedBy) return "System Administrator";
  const trimmed = rawCreatedBy.trim();
  if (!trimmed) return "System Administrator";

  const localPart = trimmed.includes("@")
    ? trimmed.split("@")[0]
    : trimmed;

  if (/[._-]/.test(localPart)) {
    return localPart
      .split(/[._-]/)
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join(" ");
  }

  return localPart.charAt(0).toUpperCase() + localPart.slice(1).toLowerCase();
}

export default async function ServiceNowItsmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // listIncidents() returns incidents ordered newest-first (createIncident
  // unshifts onto the front of the array). Use the head's sys_created_by as
  // the "current user" anchor.
  const incidents = await listIncidents();
  const userLabel = deriveUserLabel(incidents[0]?.sys_created_by);

  return (
    <Frame applications={navConfig} instance="acme" userLabel={userLabel}>
      {children}
    </Frame>
  );
}
