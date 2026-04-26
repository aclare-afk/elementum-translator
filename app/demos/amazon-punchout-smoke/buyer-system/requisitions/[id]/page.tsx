// Procurement Portal — single-requisition detail view.
//
// This is where `_mockViewUrl` from POST /api/punchout/cart-return points.
// When an Elementum automation templates the mock URL into a chat reply, the
// recipient clicks through and lands here. So this page has to look credible
// as the "view PR" page a real procurement system would surface — header,
// status pill, line-item table, totals, submitter block, history rail.
//
// Server component; reads from the KV store via getRequisition(). Bypasses
// caching so newly-returned carts show up without a redeploy.
//
// Fidelity anchor: PLATFORMS/amazon-business.md § COMMON SE SCENARIOS.

import { notFound } from "next/navigation";
import { getRequisition } from "../../../_lib/store";
import {
  BuyerSystemShell,
  StatusPill,
  PortalCard,
  buyerSystemColors,
} from "../../_BuyerSystemShell";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function RequisitionDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const rec = await getRequisition(id);
  if (!rec) notFound();

  return (
    <BuyerSystemShell
      breadcrumbs={[
        { label: "Requisitions", href: "/demos/amazon-punchout-smoke/buyer-system" },
        { label: rec.id },
      ]}
      userName={rec.submitter.name}
    >
      <header className="mb-5 flex items-start justify-between">
        <div>
          <div
            className="mb-1 text-[12px] font-semibold uppercase tracking-wide"
            style={{ color: buyerSystemColors.textSecondary }}
          >
            Purchase Requisition
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-[24px] font-semibold leading-none">
              {rec.id}
            </h1>
            <StatusPill status={rec.status} />
          </div>
          <p
            className="mt-1 text-[13px]"
            style={{ color: buyerSystemColors.textSecondary }}
          >
            Returned from {rec.buyerSystem === "Elementum"
              ? "Amazon Business punchout"
              : `${rec.buyerSystem} punchout`}
            {" · "}
            {formatDate(rec.submittedAt)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded border px-3 py-1.5 text-[13px] font-medium"
            style={{
              backgroundColor: buyerSystemColors.surface,
              borderColor: buyerSystemColors.divider,
              color: buyerSystemColors.textPrimary,
            }}
            disabled
            title="Demo only"
          >
            Print
          </button>
          {rec.status === "Pending Approval" && (
            <button
              className="rounded px-3 py-1.5 text-[13px] font-medium text-white"
              style={{ backgroundColor: buyerSystemColors.link }}
              disabled
              title="Demo only — approval flows would normally fire downstream tasks"
            >
              Approve
            </button>
          )}
        </div>
      </header>

      {/* Two-column layout: items + summary rail ------------------------ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* LEFT: line items ------------------------------------------- */}
        <div className="space-y-5">
          <PortalCard title="Line items">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr
                    className="text-left text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: buyerSystemColors.textSecondary }}
                  >
                    <th className="pb-2 pr-4">#</th>
                    <th className="pb-2 pr-4">Item</th>
                    <th className="pb-2 pr-4">ASIN</th>
                    <th className="pb-2 pr-4 text-right">Qty</th>
                    <th className="pb-2 pr-4 text-right">Unit price</th>
                    <th className="pb-2 text-right">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {rec.items.map((item, idx) => (
                    <tr
                      key={item.asin}
                      className="border-t align-top"
                      style={{ borderColor: buyerSystemColors.divider }}
                    >
                      <td
                        className="py-2.5 pr-4 font-mono text-[12px]"
                        style={{ color: buyerSystemColors.textSecondary }}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <td className="py-2.5 pr-4 max-w-[460px]">
                        <div>{item.title}</div>
                      </td>
                      <td
                        className="py-2.5 pr-4 font-mono text-[12px]"
                        style={{ color: buyerSystemColors.textSecondary }}
                      >
                        {item.asin}
                      </td>
                      <td className="py-2.5 pr-4 text-right">{item.quantity}</td>
                      <td className="py-2.5 pr-4 text-right font-mono">
                        {formatCurrency(item.unitPrice, item.currency)}
                      </td>
                      <td className="py-2.5 text-right font-mono">
                        {formatCurrency(item.lineTotal, item.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr
                    className="border-t font-semibold"
                    style={{ borderColor: buyerSystemColors.divider }}
                  >
                    <td className="pt-3" colSpan={3}></td>
                    <td className="pt-3 pr-4 text-right">{rec.itemCount}</td>
                    <td className="pt-3 pr-4 text-right">Total</td>
                    <td className="pt-3 text-right font-mono">
                      {formatCurrency(rec.total, rec.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </PortalCard>

          <PortalCard title="History">
            <ol className="space-y-2 text-[13px]">
              <HistoryRow
                when={rec.submittedAt}
                who={rec.submitter.name}
                event="Cart returned from Amazon Business punchout"
              />
              {rec.status !== "Pending Approval" &&
                rec.status !== "Draft" && (
                  <HistoryRow
                    when={rec.submittedAt}
                    who="Approval Workflow"
                    event={`Status changed to ${rec.status}`}
                  />
                )}
            </ol>
          </PortalCard>
        </div>

        {/* RIGHT: summary rail ---------------------------------------- */}
        <aside className="space-y-5">
          <PortalCard title="Summary">
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[13px]">
              <dt style={{ color: buyerSystemColors.textSecondary }}>Status</dt>
              <dd>
                <StatusPill status={rec.status} />
              </dd>
              <dt style={{ color: buyerSystemColors.textSecondary }}>Total</dt>
              <dd className="font-mono">
                {formatCurrency(rec.total, rec.currency)}
              </dd>
              <dt style={{ color: buyerSystemColors.textSecondary }}>Items</dt>
              <dd>
                {rec.itemCount} ({rec.items.length} line
                {rec.items.length === 1 ? "" : "s"})
              </dd>
              <dt style={{ color: buyerSystemColors.textSecondary }}>Source</dt>
              <dd>Amazon Business</dd>
              <dt style={{ color: buyerSystemColors.textSecondary }}>Session</dt>
              <dd
                className="font-mono text-[11px]"
                style={{ color: buyerSystemColors.textSecondary }}
              >
                {rec.sessionId}
              </dd>
            </dl>
          </PortalCard>

          <PortalCard title="Submitter">
            <div className="space-y-1 text-[13px]">
              <div className="font-semibold">{rec.submitter.name}</div>
              <div style={{ color: buyerSystemColors.textSecondary }}>
                {rec.submitter.department}
              </div>
              <div
                className="font-mono text-[12px]"
                style={{ color: buyerSystemColors.textSecondary }}
              >
                {rec.submitter.email}
              </div>
            </div>
          </PortalCard>

          <PortalCard title="System">
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[12px]">
              <dt style={{ color: buyerSystemColors.textSecondary }}>PR ID</dt>
              <dd className="font-mono">{rec.id}</dd>
              <dt style={{ color: buyerSystemColors.textSecondary }}>Buyer system</dt>
              <dd>{rec.buyerSystem}</dd>
              <dt style={{ color: buyerSystemColors.textSecondary }}>
                Submitted at
              </dt>
              <dd className="font-mono">{rec.submittedAt}</dd>
            </dl>
          </PortalCard>
        </aside>
      </div>
    </BuyerSystemShell>
  );
}

function HistoryRow({
  when,
  who,
  event,
}: {
  when: string;
  who: string;
  event: string;
}) {
  return (
    <li
      className="flex items-start gap-3 border-l-2 pl-3"
      style={{ borderColor: buyerSystemColors.divider }}
    >
      <div className="flex-1">
        <div>
          <span className="font-semibold">{who}</span>
          <span style={{ color: buyerSystemColors.textSecondary }}> · </span>
          <span>{event}</span>
        </div>
        <div
          className="text-[11px]"
          style={{ color: buyerSystemColors.textSecondary }}
        >
          {formatDate(when)}
        </div>
      </div>
    </li>
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
