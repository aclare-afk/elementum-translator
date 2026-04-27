// SAP ME5A smoke mock — List Display of Purchase Requisitions.
//
// Server Component. Pulls PRs from the KV store (`_lib/store.ts`) so records
// created via `POST .../PurchaseRequisitionHeader` appear on the ALV grid
// alongside the seeds. Pure rendering + interactivity moved into
// `_Me5aClient.tsx` because functions and event handlers can't cross the
// server→client boundary.
//
// Fidelity anchor: PLATFORMS/sap.md § COMMON SE SCENARIOS > "[REAL] Purchase
// Requisition list + detail via ME5A". Drill-in route lives at
// /demos/sap-me5a-smoke/me53n/<prNumber> — the same URL that
// `_mockViewUrl` from the create API points at.

import { listPRs } from "./_lib/store";
import type { PurchaseRequisition } from "./data/prs";
import { Me5aClient } from "./_Me5aClient";

export const dynamic = "force-dynamic"; // always re-read the store

export default async function SapMe5aSmokePage() {
  // Strip store-only fields (createdIso, companyCode) back to the
  // PurchaseRequisition shape the client component is typed against. The
  // ALV grid view doesn't need them — they're carried for the OData API
  // and the ME53N detail page.
  const all = await listPRs();
  const rows: PurchaseRequisition[] = all.map((p) => {
    // Extract store-only fields so they don't leak into the client payload.
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      createdIso,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      companyCode,
      ...rest
    } = p;
    return rest;
  });

  return <Me5aClient rows={rows} />;
}
