// Jira Software smoke mock — Active Sprint Board for the WEB project.
//
// Server Component. Pulls issues from the KV store (`_lib/store.ts`) so
// records created via `POST /rest/api/3/issue` appear on the board alongside
// the seeds. Pure rendering + interactivity moved into `_BoardClient.tsx`
// because functions and event handlers can't cross the server→client
// boundary.
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

  return <BoardClient rows={rows} />;
}
