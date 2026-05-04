// GET /absenceManagement/v1/workers/{workerId}/timeOffBalances
//
// Returns the worker's time-off balances per absence type. Real Workday
// uses this to populate the Time Off worklet balance row at the top of
// the page; the mock follows the same shape.
//
// Response envelope: { "data": [...], "total": N }. Each balance has the
// absence type descriptor, the numeric balance, the unit, and an asOf
// date.
//
// Auth: same pattern as the absenceRequests route — header read, not
// enforced.

import { NextRequest, NextResponse } from "next/server";
import {
  getAbsenceType,
  getWorker,
  getWorkerByEmail,
  listBalancesForWorker,
  listWorkers,
} from "../../../../../../_lib/store";

function resolveWorkerWid(workerKey: string): string | undefined {
  if (!workerKey) return undefined;
  const trimmed = workerKey.trim();
  if (trimmed.includes("@")) return getWorkerByEmail(trimmed)?.wid;
  if (/^[a-f0-9]{32}$/i.test(trimmed)) return getWorker(trimmed)?.wid;
  const lc = trimmed.toLowerCase();
  return listWorkers().find((w) => w.employeeId.toLowerCase() === lc)?.wid;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workerId: string }> },
) {
  const { workerId } = await params;
  const wid = resolveWorkerWid(workerId);
  if (!wid) {
    return NextResponse.json(
      { error: "WORKER_NOT_FOUND", message: `No worker matched ${workerId}` },
      { status: 404 },
    );
  }

  const balances = listBalancesForWorker(wid);
  const data = balances.map((b) => {
    const t = getAbsenceType(b.absenceTypeId);
    return {
      absenceType: t
        ? { id: t.id, descriptor: t.label, unit: t.unit }
        : { id: b.absenceTypeId, descriptor: b.absenceTypeId, unit: "Hours" },
      balance: b.balance,
      asOf: b.asOf,
    };
  });

  return NextResponse.json({ data, total: data.length });
}
