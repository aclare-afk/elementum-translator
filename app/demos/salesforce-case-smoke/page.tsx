// Salesforce Service Cloud — Cases list view.
//
// Server Component. Pulls Cases from the KV store (`_lib/store.ts`) so
// records created via `POST .../sobjects/Case` appear on the list view
// alongside the seeds. Pure rendering + interactivity moved into
// `_CaseListClient.tsx` because functions and event handlers can't cross
// the server→client boundary.
//
// Fidelity anchor: PLATFORMS/salesforce.md § COMMON SE SCENARIOS > Service
// Console + § UI PATTERNS > List view. Drill-in route lives at
// /demos/salesforce-case-smoke/lightning/r/Case/<Id>/view — same URL that
// `_mockViewUrl` from the create API points at.

import { listCases } from "./_lib/store";
import { CaseListClient } from "./_CaseListClient";

export const dynamic = "force-dynamic"; // always re-read the store

export default async function SalesforceCaseSmokePage() {
  const cases = await listCases();
  return <CaseListClient rows={cases} />;
}
