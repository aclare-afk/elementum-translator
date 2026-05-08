// Wraps every page in the Workday PTO mock with the Workday chrome.
// Hard rule from SKILL.md § Step 4: a Workday mock MUST use the shared
// chrome from components/platforms/workday/ so it actually looks like
// Workday.
//
// The chrome's "logged-in worker" badge is dynamic: it reads the most-
// recent absence request from the durable store, finds the worker who
// submitted it, and renders that worker's display name + position as the
// chrome's identity. So when an Elementum agent submits a PTO request on
// behalf of the calling user, the chrome immediately reflects that user
// — no hardcoded persona staring back at the demo audience. Falls back
// to the default viewer (Sarah Chen) when the store is empty.

import { WorkdayShell } from "@/components/platforms/workday";
import {
  defaultViewerWid,
  type Worker,
} from "./data/workers";
import { listAbsenceRequests, getWorker } from "./_lib/store";

// Dynamic so the layout re-evaluates on every request — requests created
// since the last render show up immediately as the new "current worker".
export const dynamic = "force-dynamic";

function viewerFromMostRecent(
  recentWorker: Worker | undefined,
): { name: string; title: string } {
  if (recentWorker) {
    return {
      name: recentWorker.displayName,
      title: recentWorker.positionTitle,
    };
  }
  // Default viewer — matches the seed default if the store is empty.
  const fallback = getWorker(defaultViewerWid);
  return {
    name: fallback?.displayName ?? "Sarah Chen",
    title: fallback?.positionTitle ?? "Registered Nurse",
  };
}

export default async function WorkdayPtoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // listAbsenceRequests() returns rows newest-first (createAbsenceRequest
  // unshifts onto the front of the array). The head's worker becomes the
  // "current viewer" anchor.
  const rows = await listAbsenceRequests();
  const recent = rows[0] ? getWorker(rows[0].workerWid) : undefined;
  const viewer = viewerFromMostRecent(recent);

  // Inbox count: number of requests in IN_PROGRESS or SUBMITTED states
  // visible to this viewer. Real Workday inbox shows action items pending
  // YOUR action — for the mock we just count the "in flight" requests.
  const inboxCount = rows.filter(
    (r) => r.state === "IN_PROGRESS" || r.state === "SUBMITTED",
  ).length;

  return (
    <WorkdayShell
      tenant="brennan_dpt1"
      workerName={viewer.name}
      workerTitle={viewer.title}
      inboxCount={inboxCount}
    >
      {children}
    </WorkdayShell>
  );
}
