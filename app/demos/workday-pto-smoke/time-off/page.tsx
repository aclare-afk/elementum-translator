// Workday PTO smoke — Time Off worklet detail page.
//
// This is where agent-submitted absence requests land. Layout matches what
// real Workday shows for the Time Off worklet: a row of balance cards at
// the top (Vacation / Sick / Personal / Bereavement), a primary action
// button ("Request Absence"), and a "My Requests" history list below.
//
// Server Component — pulls absence requests from the durable store so any
// record created via POST /absenceManagement/v1/workers/{id}/absenceRequests
// appears here without a refresh trick.
//
// Fidelity anchor: PLATFORMS/workday.md § UI PATTERNS > Worklet detail page.

import Link from "next/link";
import { Calendar } from "lucide-react";
import {
  AbsenceBalanceRow,
  AbsenceStatusBadge,
  WorkletPageHeader,
  workdayColors,
  workdayFont,
  type AbsenceBalance,
} from "@/components/platforms/workday";
import {
  listAbsenceRequestsForWorker,
  listBalancesForWorker,
  listAbsenceTypes,
  getWorker,
} from "../_lib/store";
import { defaultViewerWid } from "../data/workers";

export const dynamic = "force-dynamic";

export default async function TimeOffWorkletPage() {
  // For the smoke we anchor on a single viewer (Alex Reeves). The chrome
  // separately shows the most-recent submitter — that's the layout's job.
  // The worklet itself focuses on this worker's balances + history.
  const viewer = getWorker(defaultViewerWid);
  const balanceSnapshots = listBalancesForWorker(defaultViewerWid);
  const absenceTypeMap = new Map(listAbsenceTypes().map((t) => [t.id, t]));

  // Map balance snapshots to display objects with the absence-type metadata.
  const balances: AbsenceBalance[] = balanceSnapshots.map((b) => {
    const type = absenceTypeMap.get(b.absenceTypeId);
    return {
      type: type?.label ?? b.absenceTypeId,
      balance: b.balance,
      unit: type?.unit ?? "Hours",
      asOf: b.asOf,
      accent: type?.accent,
    };
  });

  const requests = await listAbsenceRequestsForWorker(defaultViewerWid);

  return (
    <div style={{ fontFamily: workdayFont.family }}>
      <WorkletPageHeader
        title="Time Off"
        subtitle={
          viewer
            ? `${viewer.displayName} — ${viewer.positionTitle}`
            : "Your time off balances and recent requests"
        }
        icon={<Calendar size={22} aria-hidden />}
        actions={
          <button
            type="button"
            disabled
            title="Demo only — submit via the REST API"
            className="rounded px-3 py-1.5 text-[13px] font-semibold text-white"
            style={{ background: workdayColors.brandOrange }}
          >
            Request Absence
          </button>
        }
      />

      <section className="mb-6">
        <h2
          className="mb-3 text-[12px] font-semibold uppercase tracking-wide"
          style={{ color: workdayColors.textSecondary }}
        >
          Balances
        </h2>
        <AbsenceBalanceRow balances={balances} />
      </section>

      <section>
        <h2
          className="mb-3 text-[12px] font-semibold uppercase tracking-wide"
          style={{ color: workdayColors.textSecondary }}
        >
          My Requests
        </h2>
        {requests.length === 0 ? (
          <div
            className="rounded border bg-white px-4 py-6 text-center text-[13px]"
            style={{
              borderColor: workdayColors.divider,
              color: workdayColors.textSecondary,
            }}
          >
            No absence requests yet. Submit one via the Workday Absence
            Management REST API to see it appear here.
          </div>
        ) : (
          <div
            className="overflow-hidden rounded border bg-white"
            style={{ borderColor: workdayColors.divider }}
          >
            <table className="w-full text-[13px]">
              <thead>
                <tr
                  className="text-left text-[11px] font-semibold uppercase tracking-wide"
                  style={{
                    color: workdayColors.textSecondary,
                    borderBottom: `1px solid ${workdayColors.divider}`,
                  }}
                >
                  <th className="px-4 py-2.5">Request</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Dates</th>
                  <th className="px-4 py-2.5 text-right">Hours</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const type = absenceTypeMap.get(r.absenceTypeId);
                  return (
                    <tr
                      key={r.wid}
                      className="border-t"
                      style={{ borderColor: workdayColors.divider }}
                    >
                      <td className="px-4 py-2.5 font-mono">
                        <Link
                          href={`/demos/workday-pto-smoke/time-off/${r.absenceRequestId}`}
                          className="hover:underline"
                          style={{ color: workdayColors.actionBlue }}
                        >
                          {r.absenceRequestId}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        {type?.label ?? r.absenceTypeId}
                      </td>
                      <td className="px-4 py-2.5">
                        {formatDateRange(r.from, r.to)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {r.totalHours}
                      </td>
                      <td className="px-4 py-2.5">
                        <AbsenceStatusBadge state={r.state} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * Render a date range like "Apr 23 – Apr 27, 2026" or "Apr 23, 2026" for a
 * single day. Workday's UI does the same compaction.
 */
function formatDateRange(fromYmd: string, toYmd: string): string {
  const f = new Date(fromYmd);
  const t = new Date(toYmd);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) {
    return `${fromYmd} – ${toYmd}`;
  }
  const monthDay = (d: Date) =>
    d.toLocaleString("en-US", { month: "short", day: "numeric" });
  if (fromYmd === toYmd) {
    return `${monthDay(f)}, ${f.getFullYear()}`;
  }
  if (f.getFullYear() === t.getFullYear()) {
    return `${monthDay(f)} – ${monthDay(t)}, ${t.getFullYear()}`;
  }
  return `${monthDay(f)}, ${f.getFullYear()} – ${monthDay(t)}, ${t.getFullYear()}`;
}
