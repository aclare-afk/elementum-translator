// Workday PTO smoke — single absence request detail view (canonical link).
//
// This is where `_mockViewUrl` from POST /absenceManagement/v1/.../absenceRequests
// points. Real Workday's URL is tenant-scoped and uses an internal task ID; the
// mock keeps a clean shape:
//
//   /demos/workday-pto-smoke/time-off/ABS-2026-001045
//
// Server component; reads from the durable store via getAbsenceRequestByDisplayId.
// Bypasses caching so newly-created requests show up without a redeploy.
//
// Fidelity anchor: PLATFORMS/workday.md § UI PATTERNS > Worker profile +
// § COMMON SE SCENARIOS > PTO request.

import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar } from "lucide-react";
import {
  AbsenceStatusBadge,
  WorkletPageHeader,
  workdayColors,
  workdayFont,
} from "@/components/platforms/workday";
import {
  getAbsenceRequestByDisplayId,
  getAbsenceType,
  getWorker,
} from "../../_lib/store";

export const dynamic = "force-dynamic";

export default async function AbsenceRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const r = await getAbsenceRequestByDisplayId(requestId);
  if (!r) notFound();

  const worker = getWorker(r.workerWid);
  const type = getAbsenceType(r.absenceTypeId);
  const manager = worker?.managerWid ? getWorker(worker.managerWid) : undefined;

  return (
    <div style={{ fontFamily: workdayFont.family }}>
      {/* Breadcrumb back to Time Off worklet */}
      <nav className="mb-3 text-[12px]">
        <Link
          href="/demos/workday-pto-smoke/time-off"
          style={{ color: workdayColors.actionBlue }}
          className="hover:underline"
        >
          ← Time Off
        </Link>
      </nav>

      <WorkletPageHeader
        title={`Absence Request ${r.absenceRequestId}`}
        subtitle={
          worker
            ? `${worker.displayName} — ${worker.positionTitle}`
            : "Worker"
        }
        icon={<Calendar size={22} aria-hidden />}
        actions={<AbsenceStatusBadge state={r.state} />}
      />

      {/* Two-column body: details + side-rail meta */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        {/* Left: request details */}
        <section
          className="rounded border bg-white"
          style={{ borderColor: workdayColors.divider }}
        >
          <header
            className="border-b px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide"
            style={{
              color: workdayColors.textSecondary,
              borderColor: workdayColors.divider,
            }}
          >
            Details
          </header>
          <dl className="grid grid-cols-[160px_1fr] gap-y-3 px-4 py-4 text-[13px]">
            <Term>Request ID</Term>
            <Defn>
              <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
                {r.absenceRequestId}
              </span>
            </Defn>
            <Term>Type</Term>
            <Defn>{type?.label ?? r.absenceTypeId}</Defn>
            <Term>From</Term>
            <Defn>{formatDate(r.from)}</Defn>
            <Term>To</Term>
            <Defn>{formatDate(r.to)}</Defn>
            <Term>Hours per Day</Term>
            <Defn>{r.hoursPerDay}</Defn>
            <Term>Total {type?.unit ?? "Hours"}</Term>
            <Defn>
              <strong>{r.totalHours}</strong>
            </Defn>
            <Term>Status</Term>
            <Defn>
              <AbsenceStatusBadge state={r.state} />
            </Defn>
            {r.comment && (
              <>
                <Term>Comment</Term>
                <Defn>
                  <span style={{ whiteSpace: "pre-wrap" }}>{r.comment}</span>
                </Defn>
              </>
            )}
          </dl>
        </section>

        {/* Right: worker + system rail */}
        <aside className="space-y-4">
          {worker && (
            <section
              className="rounded border bg-white"
              style={{ borderColor: workdayColors.divider }}
            >
              <header
                className="border-b px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide"
                style={{
                  color: workdayColors.textSecondary,
                  borderColor: workdayColors.divider,
                }}
              >
                Worker
              </header>
              <div className="px-4 py-3 text-[13px]">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-bold text-white"
                    style={{ background: workdayColors.brandOrange }}
                    aria-hidden
                  >
                    {worker.displayName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase() ?? "")
                      .join("")}
                  </span>
                  <div>
                    <div className="font-semibold">{worker.displayName}</div>
                    <div
                      className="text-[12px]"
                      style={{ color: workdayColors.textSecondary }}
                    >
                      {worker.positionTitle}
                    </div>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-[100px_1fr] gap-y-1.5 text-[12px]">
                  <Term>Email</Term>
                  <Defn>
                    <span style={{ color: workdayColors.actionBlue }}>
                      {worker.email}
                    </span>
                  </Defn>
                  <Term>Employee ID</Term>
                  <Defn>{worker.employeeId}</Defn>
                  <Term>Cost Center</Term>
                  <Defn>{worker.costCenter}</Defn>
                  <Term>Manager</Term>
                  <Defn>
                    {manager?.displayName ?? "—"}
                  </Defn>
                </dl>
              </div>
            </section>
          )}

          <section
            className="rounded border bg-white"
            style={{ borderColor: workdayColors.divider }}
          >
            <header
              className="border-b px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide"
              style={{
                color: workdayColors.textSecondary,
                borderColor: workdayColors.divider,
              }}
            >
              System
            </header>
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 px-4 py-3 text-[12px]">
              <Term>WID</Term>
              <Defn>
                <span
                  style={{
                    fontFamily: "ui-monospace, SFMono-Regular, monospace",
                    fontSize: "11px",
                    wordBreak: "break-all",
                  }}
                >
                  {r.wid}
                </span>
              </Defn>
              <Term>Submitted</Term>
              <Defn>{formatTimestamp(r.submittedAt)}</Defn>
              <Term>Last Modified</Term>
              <Defn>{formatTimestamp(r.lastModifiedAt)}</Defn>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Term({ children }: { children: React.ReactNode }) {
  return (
    <dt
      className="text-[12px] font-medium"
      style={{ color: workdayColors.textSecondary }}
    >
      {children}
    </dt>
  );
}

function Defn({ children }: { children: React.ReactNode }) {
  return <dd style={{ color: workdayColors.textPrimary }}>{children}</dd>;
}

function formatDate(ymd: string): string {
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimestamp(iso: string): string {
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
