// SAP ME53N — Display Purchase Requisition (single-PR detail view).
//
// This is where `_mockViewUrl` from `POST .../PurchaseRequisitionHeader`
// points. ME53N is the "display" sibling of ME52N (change) and ME51N
// (create) — opened on a single PR, it shows the header + items + account
// assignment in tabs. Real SAP transaction code is `ME53N` (note the lower
// "n" suffix designating the next-gen single-screen variant; the older
// `ME53` was a tabbed report).
//
// URL shape mirrors how SEs paste deep links into chat:
//
//   /demos/sap-me5a-smoke/me53n/0010001234
//
// On real SAP these aren't web URLs at all — ME53N is a transaction code,
// not an HTTP path. The mock cheats by exposing a stable URL so Slack/email
// previews render. That's why the mock includes `_mockViewUrl` in the
// create response — Elementum automations template it into chat replies.
//
// Server component. Reads from the KV store via getPRByNumber(). Bypasses
// Next.js caching so a PR created via POST is visible immediately on a
// fresh navigation.
//
// Fidelity anchor: PLATFORMS/sap.md § UI PATTERNS > SAP GUI > Detail view.
// Layout mirrors ME53N's tabbed header/items pane. Tabs are visual-only —
// real ME53N supports edit/release/print actions; the smoke is read-only
// because automations don't drive those surfaces directly.

import Link from "next/link";
import { notFound } from "next/navigation";
import { SapShell, sapColors, sapFont, StatusDot, sapPrStatus } from "@/components/platforms/sap";
import { getPRByNumber, releaseStatusCode } from "../../_lib/store";

export const dynamic = "force-dynamic";

export default async function Me53nPage({
  params,
}: {
  params: Promise<{ prNumber: string }>;
}) {
  const { prNumber } = await params;
  const pr = await getPRByNumber(prNumber);
  if (!pr) notFound();

  const status = sapPrStatus[pr.status];
  const code = releaseStatusCode(pr.status);
  const lineTotal = pr.netPrice * pr.quantity;

  return (
    <SapShell
      transactionCode="ME53N"
      transactionTitle="Display Purchase Requisition"
      menuExtras={["Environment", "Item"]}
      system={{
        systemId: "PRD",
        client: "100",
        language: "EN",
        user: pr.requester,
      }}
    >
      <div
        className="flex h-full flex-col"
        style={{ fontFamily: sapFont.family, fontSize: sapFont.sizeBody }}
      >
        {/* Breadcrumb back to ME5A list. Not native SAP — this is a mock-
            only convenience for SEs in browser-only demos. */}
        <div
          className="border-b px-4 py-2 text-[11px]"
          style={{
            background: sapColors.surfaceAlt,
            borderColor: sapColors.divider,
            color: sapColors.textMuted,
          }}
        >
          <Link
            href="/demos/sap-me5a-smoke"
            className="hover:underline"
            style={{ color: sapColors.brandBlue }}
          >
            ← ME5A — List Display
          </Link>
        </div>

        {/* PR identity row -------------------------------------------------- */}
        <header
          className="border-b bg-white px-6 py-4"
          style={{ borderColor: sapColors.divider }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className="text-[11px] font-bold uppercase tracking-wide"
                style={{ color: sapColors.textMuted }}
              >
                Purchase Requisition
              </div>
              <h1
                className="text-[20px] font-semibold"
                style={{
                  color: sapColors.textPrimary,
                  fontFamily: sapFont.familyMono,
                }}
              >
                {pr.prNumber}
              </h1>
              <div
                className="text-[13px]"
                style={{ color: sapColors.textPrimary }}
              >
                {pr.description}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusDot label={status.label} color={status.color} />
              <span
                className="rounded border px-2 py-0.5 text-[11px]"
                style={{
                  borderColor: sapColors.divider,
                  color: sapColors.textMuted,
                  fontFamily: sapFont.familyMono,
                }}
                title="PurReqnReleaseStatus"
              >
                Rel. code {code}
              </span>
            </div>
          </div>
        </header>

        {/* Tabs row — visual only. Real ME53N has working tabs that lazy-load
            their panels; for the smoke we render the Header + Item Overview
            content stacked underneath the active "Header" tab. */}
        <nav
          className="flex gap-0 border-b bg-white px-4"
          style={{ borderColor: sapColors.divider }}
        >
          {["Header", "Item Overview", "Account Assignment", "Texts", "Approval"].map(
            (label, idx) => (
              <span
                key={label}
                className="border-b-2 px-3 py-2 text-[12px]"
                style={{
                  borderColor:
                    idx === 0 ? sapColors.brandBlue : "transparent",
                  color:
                    idx === 0 ? sapColors.brandBlue : sapColors.textMuted,
                  fontWeight: idx === 0 ? 600 : 400,
                  cursor: idx === 0 ? "default" : "not-allowed",
                }}
                title={idx === 0 ? "" : "Demo only"}
              >
                {label}
              </span>
            ),
          )}
        </nav>

        {/* Body ------------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-[1100px] space-y-4">
            {/* Header tab content — two-column key/value grid */}
            <section
              className="rounded border bg-white"
              style={{ borderColor: sapColors.divider }}
            >
              <div
                className="border-b px-4 py-2 text-[11px] font-bold uppercase"
                style={{
                  borderColor: sapColors.divider,
                  color: sapColors.textMuted,
                  background: sapColors.surfaceAlt,
                }}
              >
                Header data
              </div>
              <dl className="grid grid-cols-[180px_1fr_180px_1fr] gap-y-2 px-4 py-3 text-[12px]">
                <Field label="PR Number" value={pr.prNumber} mono />
                <Field label="Document Type" value="NB · Standard PR" />

                <Field label="Created By" value={pr.requester} mono />
                <Field label="Created On" value={pr.createdOn} mono />

                <Field label="Purchasing Group" value={pr.purchasingGroup} mono />
                <Field label="Company Code" value={pr.companyCode} mono />

                <Field label="Plant" value={pr.plant} mono />
                <Field label="Currency" value={pr.currency} mono />

                <Field label="Release Status" value={`${code} · ${status.label}`} mono />
                <Field label="Document Date" value={pr.createdOn} mono />
              </dl>
            </section>

            {/* Item Overview — single-row grid for the smoke */}
            <section
              className="rounded border bg-white"
              style={{ borderColor: sapColors.divider }}
            >
              <div
                className="border-b px-4 py-2 text-[11px] font-bold uppercase"
                style={{
                  borderColor: sapColors.divider,
                  color: sapColors.textMuted,
                  background: sapColors.surfaceAlt,
                }}
              >
                Item Overview
              </div>
              <table
                className="w-full text-[12px]"
                style={{ fontFamily: sapFont.familyMono }}
              >
                <thead>
                  <tr
                    className="border-b text-left"
                    style={{
                      borderColor: sapColors.divider,
                      color: sapColors.textMuted,
                      background: sapColors.surfaceAlt,
                    }}
                  >
                    <th className="px-3 py-2 font-bold uppercase">Item</th>
                    <th className="px-3 py-2 font-bold uppercase">Material</th>
                    <th className="px-3 py-2 font-bold uppercase">Short Text</th>
                    <th className="px-3 py-2 text-right font-bold uppercase">Qty</th>
                    <th className="px-3 py-2 font-bold uppercase">UoM</th>
                    <th className="px-3 py-2 text-right font-bold uppercase">
                      Net Price
                    </th>
                    <th className="px-3 py-2 font-bold uppercase">Crcy</th>
                    <th className="px-3 py-2 font-bold uppercase">Plant</th>
                    <th className="px-3 py-2 font-bold uppercase">Deliv.</th>
                    <th className="px-3 py-2 text-right font-bold uppercase">
                      Line Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ color: sapColors.textPrimary }}>
                    <td className="px-3 py-2">{pr.item}</td>
                    <td className="px-3 py-2">{pr.material}</td>
                    <td
                      className="px-3 py-2"
                      style={{ fontFamily: sapFont.family }}
                    >
                      {pr.description}
                    </td>
                    <td className="px-3 py-2 text-right">{pr.quantity}</td>
                    <td className="px-3 py-2">{pr.unit}</td>
                    <td className="px-3 py-2 text-right">
                      {pr.netPrice.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-3 py-2">{pr.currency}</td>
                    <td className="px-3 py-2">{pr.plant}</td>
                    <td className="px-3 py-2">{pr.deliveryDate}</td>
                    <td className="px-3 py-2 text-right">
                      {lineTotal.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Account Assignment placeholder. Real ME53N exposes a per-item
                cost-center / G/L / WBS split here. The smoke just shows a
                placeholder — automations don't write account assignment
                directly today. */}
            <section
              className="rounded border bg-white"
              style={{ borderColor: sapColors.divider }}
            >
              <div
                className="border-b px-4 py-2 text-[11px] font-bold uppercase"
                style={{
                  borderColor: sapColors.divider,
                  color: sapColors.textMuted,
                  background: sapColors.surfaceAlt,
                }}
              >
                Account Assignment (Item {pr.item})
              </div>
              <dl className="grid grid-cols-[180px_1fr_180px_1fr] gap-y-2 px-4 py-3 text-[12px]">
                <Field label="A/A Category" value="K · Cost Center" />
                <Field label="Cost Center" value="1000-CC-01" mono />
                <Field label="G/L Account" value="0000400100" mono />
                <Field label="Business Area" value={pr.companyCode} mono />
              </dl>
            </section>

            {/* Mock-only deep-link footer — useful for SEs verifying that
                Elementum's `_mockViewUrl` lands on this exact page. Removed
                from real ME53N. */}
            <section
              className="rounded border px-4 py-3 text-[11px]"
              style={{
                borderColor: sapColors.divider,
                background: sapColors.surfaceAlt,
                color: sapColors.textMuted,
              }}
            >
              Mock URL · <code>{`/demos/sap-me5a-smoke/me53n/${pr.prNumber}`}</code>
              {" · "}
              this is the value Elementum automations should template into
              chat replies for users to click through to the PR.
            </section>
          </div>
        </div>
      </div>
    </SapShell>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt
        className="text-[11px] font-bold uppercase"
        style={{ color: sapColors.textMuted }}
      >
        {label}
      </dt>
      <dd
        style={{
          color: sapColors.textPrimary,
          fontFamily: mono ? sapFont.familyMono : sapFont.family,
        }}
      >
        {value}
      </dd>
    </>
  );
}
