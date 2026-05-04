// Salesforce Service Cloud — Cases list view.
//
// Server Component. Pulls Cases from the KV store (`_lib/store.ts`) so
// records created via `POST .../sobjects/Case` appear on the list view
// alongside the seeds. Pure rendering + interactivity moved into
// `_CaseListClient.tsx` because functions and event handlers can't cross
// the server→client boundary.
//
// The Lightning chrome's "logged-in user" badge is dynamic: the most-recent
// case's ContactName (and OwnerName fallback) drives the userName prop, so
// when an Elementum agent creates a case on behalf of the calling user the
// chrome immediately reflects that user. Falls back to the seed default when
// the store is empty.
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
  // Most-recent case's ContactName drives the chrome user. createCase()
  // unshifts onto the front of the array, so cases[0] is the newest record.
  const userLabel =
    cases[0]?.ContactName ?? cases[0]?.OwnerName ?? "Sam Rivera";
  return <CaseListClient rows={cases} userLabel={userLabel} />;
}
