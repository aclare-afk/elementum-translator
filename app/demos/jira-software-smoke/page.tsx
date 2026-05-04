// Jira Software smoke mock — Active Sprint Board for the WEB project.
//
// Server Component. Pulls issues from the KV store (`_lib/store.ts`) so
// records created via `POST /rest/api/3/issue` appear on the board alongside
// the seeds. Pure rendering + interactivity moved into `_BoardClient.tsx`
// because functions and event handlers can't cross the server→client
// boundary.
//
// The Jira chrome's "logged-in user" avatar is dynamic: the most-recent
// issue's reporter.displayName drives the userName prop, so when an
// Elementum agent creates an issue on behalf of the calling user the chrome
// immediately reflects that user. Falls back to the seed default when the
// store is empty.
//
// Fidelity anchor: PLATFORMS/jira.md § UI PATTERNS > Jira Software > Board &
// Issue view. Canonical share-link issue page lives at /browse/[issueKey].

import { listIssues } from "./_lib/store";
import type { BoardSeedIssue } from "./data/issues";
import { BoardClient } from "./_BoardClient";

export const dynamic = "force-dynamic"; // always re-read the store

export default async function JiraSoftwareSmokePage() {
  // Strip store-only fields (createdIso, updatedIso, projectKey, labels) back
  // to the BoardSeedIssue shape the client component is typed against. The
  // board view doesn't need them — they're carried for the REST API and the
  // /browse/[issueKey] detail page.
  const all = await listIssues();
  const rows: BoardSeedIssue[] = all.map((i) => {
    // Extract store-only fields so they don't leak into the client payload.
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      createdIso,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      updatedIso,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      projectKey,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      labels,
      ...rest
    } = i;
    return rest;
  });

  // Most-recent issue's reporter drives the chrome user. createIssue()
  // unshifts onto the front of the array, so all[0] is the newest record.
  const userLabel = all[0]?.reporter?.displayName ?? "Jane Davis";

  return <BoardClient rows={rows} userLabel={userLabel} />;
}
