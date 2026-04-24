// JSM smoke mock — Agent queue for the IT Help service desk.
//
// Server Component. Pulls requests from the in-memory store (`_lib/store.ts`)
// so records created via `POST /rest/servicedeskapi/request` appear in the
// queue alongside the seeds. Pure rendering + interactivity moved into
// `_QueueClient.tsx` because functions can't cross the server→client boundary.
//
// Fidelity anchor: PLATFORMS/jira.md § UI PATTERNS > JSM > Queue &
// Request detail. Portal side at ./portal/page.tsx uses the same store.

import { listRequests } from "./_lib/store";
import {
  queueMeta,
  serviceDesk,
  viewerAgent,
  type RequestSeed,
} from "./data/requests";
import { QueueClient } from "./_QueueClient";

export const dynamic = "force-dynamic"; // always re-read the store

export default function JsmQueueSmokePage() {
  // Strip the store-only fields back to the RequestSeed shape the client
  // component + shared components are typed against. createdIso /
  // reporterEmail / requestFieldValues aren't needed for the queue view.
  const rows: RequestSeed[] = listRequests().map((r) => {
    // Extract store-only fields so they don't leak into the client payload.
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      createdIso,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      reporterEmail,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      requestFieldValues,
      ...rest
    } = r;
    return rest;
  });

  return (
    <QueueClient
      serviceDeskName={serviceDesk.name}
      projectKey={serviceDesk.projectKey}
      viewerName={viewerAgent.displayName}
      queueName={queueMeta.name}
      rows={rows}
    />
  );
}
