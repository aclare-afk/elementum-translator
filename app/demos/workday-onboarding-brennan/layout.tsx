// Wraps every page in the Brennan onboarding Workday mock with the Workday chrome.
// Hard rule from SKILL.md § Step 4: a Workday mock MUST use the shared
// chrome from components/platforms/workday/ so it actually looks like
// Workday.
//
// CHROME IDENTITY — which worker shows in the top-bar avatar?
//   Resolved in priority order so different demo flows light up the same
//   "this is the active worker" affordance:
//     1. lastViewedWorker (set when /workers/<email> renders) — when
//        someone clicks through to a profile, the chrome reflects them.
//        This is the dynamic-chrome moment the Elementum onboarding skill
//        leverages: agent returns the Workday link → audience clicks it →
//        the entire tenant visibly "becomes" that worker.
//     2. Most-recent absence-request submitter — preserves the original
//        workday-pto-smoke behavior so PTO-flavored demos still work.
//     3. Default viewer (Sarah Chen) — empty-store fallback.

import { WorkdayShell } from "@/components/platforms/workday";
import {
  defaultViewerWid,
  type Worker,
} from "./data/workers";
import {
  listAbsenceRequests,
  getWorker,
  getWorkerByEmail,
  getLastViewedWorker,
} from "./_lib/store";

// Dynamic so the layout re-evaluates on every request — requests created
// since the last render show up immediately as the new "current worker".
export const dynamic = "force-dynamic";

function viewerOrDefault(recentWorker: Worker | undefined): {
  name: string;
  title: string;
} {
  if (recentWorker) {
    return {
      name: recentWorker.displayName,
      title: recentWorker.positionTitle,
    };
  }
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
  // Priority 1 — most recently viewed worker profile (the onboarding demo's
  // primary signal). When the Elementum onboarding skill returns a link to
  // /workers/<email> and the audience clicks it, that page records the
  // view; this layout reads it and renders that worker as "logged in."
  const lastViewed = await getLastViewedWorker();
  const viewedWorker = lastViewed
    ? getWorkerByEmail(lastViewed.email)
    : undefined;

  // Priority 2 — most recent absence request submitter (preserves the
  // original workday-pto-smoke chrome behavior for PTO flows).
  const rows = await listAbsenceRequests();
  const submitterWorker = rows[0]
    ? getWorker(rows[0].workerWid)
    : undefined;

  const recent = viewedWorker ?? submitterWorker;
  const viewer = viewerOrDefault(recent);

  // Inbox count: number of requests in IN_PROGRESS or SUBMITTED states.
  // Real Workday inbox shows action items pending YOUR action — for the
  // mock we just count the "in flight" requests across the tenant.
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
