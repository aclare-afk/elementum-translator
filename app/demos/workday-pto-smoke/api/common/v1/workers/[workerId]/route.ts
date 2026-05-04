// GET /common/v1/workers/{workerId}
//
// Single-worker fetch. The {workerId} segment can be a WID, an Employee_ID,
// or an email — same flexibility as the absenceRequests route, since the
// Elementum dynamic-submitter pattern hands the agent an email rather than
// a WID.
//
// Real Workday only accepts the WID; the mock relaxes this so demos don't
// need a separate worker-lookup hop.

import { NextRequest, NextResponse } from "next/server";
import {
  getWorker,
  getWorkerByEmail,
  listWorkers,
} from "../../../../../_lib/store";

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
  const worker = getWorker(wid);
  if (!worker) {
    return NextResponse.json(
      { error: "WORKER_NOT_FOUND", message: `No worker matched ${workerId}` },
      { status: 404 },
    );
  }

  const manager = worker.managerWid ? getWorker(worker.managerWid) : undefined;

  return NextResponse.json({
    id: worker.wid,
    descriptor: worker.displayName,
    employeeId: worker.employeeId,
    email: worker.email,
    primaryWorkEmail: worker.email,
    name: {
      formatted: worker.displayName,
    },
    primaryJob: {
      title: worker.positionTitle,
      supervisoryOrganization: {
        descriptor: worker.supervisoryOrg,
      },
      costCenter: {
        id: worker.costCenter,
        descriptor: worker.costCenter,
      },
    },
    manager: manager
      ? {
          id: manager.wid,
          descriptor: manager.displayName,
          email: manager.email,
        }
      : null,
    hireDate: worker.hireDate,
  });
}
