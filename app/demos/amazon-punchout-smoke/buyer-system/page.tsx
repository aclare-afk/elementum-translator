// Procurement Portal landing page — the "buyer system" half of the punchout
// smoke. This is where carts that came back from Amazon land, and where an
// approver/buyer would see them in real life.
//
// Server component: pulls requisitions from the durable store so any record
// created via POST /api/punchout/cart-return appears here without a refresh
// trick.
//
// Fidelity anchor: PLATFORMS/amazon-business.md § COMMON SE SCENARIOS >
// "Buyer punches out from PR, shops, returns cart, PR is populated". The PR
// surface in real life is on the buyer system (SAP/Coupa/Ariba/Workday); we
// model a generic version of that here.

import Link from "next/link";
import { listRequisitions } from "../_lib/store";
import {
  BuyerSystemShell,
  StatusPill,
  PortalCard,
  buyerSystemColors,
} from "./_BuyerSystemShell";

// Re-read the store on every request so KV-backed writes show up live.
export const dynamic = "force-dynamic";

export default async function BuyerSystemLandingPage() {
  const reqs = await listRequisitions();

  // Top metrics — pure read-derived, since we don't track these as fields.
  const pending = reqs.filter((r) => r.status === "Pending Approval");
  const inFlight = reqs.filter(
    (r) => r.status === "Approved" || r.status === "Ordered",
  );
  const totalSpend = reqs.reduce((acc, r) => acc + r.total, 0);

  return (
    <BuyerSystemShell>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[24px] font-semibold leading-tight">
            Requisitions
          </h1>
          <p
            className="mt-1 text-[13px]"
            style={{ color: buyerSystemColors.textSecondary }}
          >
            Purchase requisitions returned from connected suppliers and direct
            entry.
          </p>
        </div>
        <button
          className="rounded border px-3 py-1.5 text-[13px] font-medium"
          style={{
            backgroundColor: buyerSystemColors.surface,
            borderColor: buyerSystemColors.divider,
            color: buyerSystemColors.textPrimary,
          }}
          disabled
          title="Demo only — punchout out to Amazon Business via the demo URL"
        >
          + New requisition
        </button>
      </div>

      {/* KPI strip ------------------------------------------------------- */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Pending approval" value={String(pending.length)} />
        <Kpi label="Approved / ordered" value={String(inFlight.length)} />
        <Kpi
          label="Total open spend"
          value={formatCurrency(totalSpend, reqs[0]?.currency ?? "USD")}
        />
      </div>

      {/* Requisitions table --------------------------------------------- */}
      <PortalCard title="All requisitions">
        {reqs.length === 0 ? (
          <p
            className="text-[13px]"
            style={{ color: buyerSystemColors.textSecondary }}
          >
            No requisitions yet. Punch out from Amazon Business to create one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr
                  className="text-left text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: buyerSystemColors.textSecondary }}
                >
                  <th className="pb-2 pr-4">PR #</th>
                  <th className="pb-2 pr-4">Submitter</th>
                  <th className="pb-2 pr-4">Department</th>
                  <th className="pb-2 pr-4">Items</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {reqs.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t"
                    style={{ borderColor: buyerSystemColors.divider }}
                  >
                    <td className="py-2.5 pr-4">
                      <Link
                        href={r.buyerSystemUrl}
                        className="font-mono hover:underline"
                        style={{ color: buyerSystemColors.link }}
                      >
                        {r.id}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">{r.submitter.name}</td>
                    <td
                      className="py-2.5 pr-4"
                      style={{ color: buyerSystemColors.textSecondary }}
                    >
                      {r.submitter.department}
                    </td>
                    <td className="py-2.5 pr-4">{r.itemCount}</td>
                    <td className="py-2.5 pr-4 font-mono">
                      {formatCurrency(r.total, r.currency)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusPill status={r.status} />
                    </td>
                    <td
                      className="py-2.5 text-[12px]"
                      style={{ color: buyerSystemColors.textSecondary }}
                    >
                      {formatDate(r.submittedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PortalCard>

      {/* Footer breadcrumb back to the storefront ----------------------- */}
      <p
        className="mt-6 text-[12px]"
        style={{ color: buyerSystemColors.textSecondary }}
      >
        Or{" "}
        <Link
          href="/demos/amazon-punchout-smoke"
          className="hover:underline"
          style={{ color: buyerSystemColors.link }}
        >
          punch out to Amazon Business
        </Link>{" "}
        to start a new shopping session.
      </p>
    </BuyerSystemShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded border px-4 py-3"
      style={{
        backgroundColor: buyerSystemColors.surface,
        borderColor: buyerSystemColors.divider,
      }}
    >
      <div
        className="mb-1 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: buyerSystemColors.textSecondary }}
      >
        {label}
      </div>
      <div className="text-[22px] font-semibold leading-none">{value}</div>
    </div>
  );
}

function formatCurrency(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
