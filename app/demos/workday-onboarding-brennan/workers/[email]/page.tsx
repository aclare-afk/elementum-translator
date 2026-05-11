// Worker Profile page — Workday-style UI for a single worker.
//
// Two jobs:
//   1. RENDER — display the worker's identity, position, manager, and key
//      job data in a layout that visibly reads as "real Workday."
//   2. UPDATE THE DYNAMIC CHROME — write to the lastViewedWorker store so
//      the top-bar avatar across the entire mock reflects this worker after
//      the page is opened. This is the same dynamic-chrome pattern the
//      absence-request store uses — repurposed so a profile view (not just
//      a PTO submission) tells the tenant "this is now the active worker."
//
// Fidelity anchor: PLATFORMS/workday.md § UI PATTERNS > Worker profile.

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getWorkerByEmail,
  getWorker,
  listBalancesForWorker,
  setLastViewedWorker,
} from "../../_lib/store";
import { listAbsenceTypes } from "../../_lib/store";
import { workdayColors } from "@/components/platforms/workday";

// Force dynamic so each view re-runs setLastViewedWorker and the chrome
// reflects whoever was just visited (same posture as the parent layout).
export const dynamic = "force-dynamic";

type Params = { email: string };

export default async function WorkerProfilePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { email: rawEmail } = await params;
  const email = decodeURIComponent(rawEmail);

  const worker = getWorkerByEmail(email);
  if (!worker) {
    notFound();
  }

  // Mark this worker as the most recently viewed — drives the chrome.
  await setLastViewedWorker(worker.email);

  const manager = worker.managerWid ? getWorker(worker.managerWid) : undefined;
  const initials = (worker.displayName || worker.email)
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const balances = listBalancesForWorker(worker.wid);
  const types = listAbsenceTypes();
  const vacationBal = balances.find((b) => b.absenceTypeId === "VACATION");
  const vacationType = types.find((t) => t.id === "VACATION");

  const hireDateDisplay = formatHireDate(worker.hireDate);
  const tenureDisplay = formatTenure(worker.hireDate);

  return (
    <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header band: avatar + name + position + actions */}
      <section
        style={{
          background: workdayColors.surface,
          border: `1px solid ${workdayColors.divider}`,
          borderRadius: 8,
          padding: "24px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 24,
        }}
      >
        {/* Avatar — orange-filled circle with initials */}
        <div
          aria-hidden
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: workdayColors.brandOrange,
            color: workdayColors.textOnDark,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 28,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 26,
              fontWeight: 600,
              color: workdayColors.textPrimary,
            }}
          >
            {worker.displayName}
          </h1>
          <div
            style={{
              marginTop: 4,
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 15,
              color: workdayColors.textSecondary,
            }}
          >
            {worker.positionTitle}
            {worker.supervisoryOrg ? ` · ${worker.supervisoryOrg}` : ""}
          </div>
          <div
            style={{
              marginTop: 10,
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 13,
              color: workdayColors.textSecondary,
              display: "flex",
              gap: 18,
              flexWrap: "wrap",
            }}
          >
            <span>
              <span style={{ color: workdayColors.textMuted }}>
                Employee ID:
              </span>{" "}
              {worker.employeeId}
            </span>
            <span>
              <span style={{ color: workdayColors.textMuted }}>Manager:</span>{" "}
              {manager ? (
                <Link
                  href={`/demos/workday-onboarding-brennan/workers/${encodeURIComponent(manager.email)}`}
                  style={{
                    color: workdayColors.actionBlue,
                    textDecoration: "none",
                  }}
                >
                  {manager.displayName}
                </Link>
              ) : (
                <span>—</span>
              )}
            </span>
            <span>
              <span style={{ color: workdayColors.textMuted }}>
                Time in Position:
              </span>{" "}
              {tenureDisplay}
            </span>
          </div>
        </div>

        {/* Right-side "Actions" button — visual only */}
        <div style={{ flexShrink: 0 }}>
          <button
            type="button"
            disabled
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 13,
              padding: "8px 14px",
              borderRadius: 4,
              border: `1px solid ${workdayColors.divider}`,
              background: workdayColors.surface,
              color: workdayColors.textPrimary,
              cursor: "default",
            }}
          >
            Actions ▾
          </button>
        </div>
      </section>

      {/* Tab strip — Job tab is active by default. Other tabs are visual only. */}
      <section
        style={{
          background: workdayColors.surface,
          border: `1px solid ${workdayColors.divider}`,
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${workdayColors.divider}`,
            padding: "0 16px",
          }}
        >
          {[
            { label: "Job", active: true },
            { label: "Compensation", active: false },
            { label: "Time Off", active: false },
            { label: "Pay", active: false },
            { label: "Personal", active: false },
            { label: "Career", active: false },
            { label: "Performance", active: false },
            { label: "Documents", active: false },
          ].map((t) => (
            <div
              key={t.label}
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 13,
                padding: "14px 16px",
                color: t.active
                  ? workdayColors.textPrimary
                  : workdayColors.textSecondary,
                fontWeight: t.active ? 600 : 400,
                borderBottom: t.active
                  ? `3px solid ${workdayColors.brandOrange}`
                  : "3px solid transparent",
                marginBottom: -1,
                cursor: t.active ? "default" : "not-allowed",
              }}
            >
              {t.label}
            </div>
          ))}
        </div>

        {/* Job tab content */}
        <div style={{ padding: 24, display: "grid", gap: 20 }}>
          <div>
            <h2
              style={{
                margin: 0,
                marginBottom: 4,
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: workdayColors.textPrimary,
              }}
            >
              Position
            </h2>
            <FieldGrid>
              <Field label="Job Title" value={worker.positionTitle} />
              <Field label="Job Family" value={inferJobFamily(worker.positionTitle)} />
              <Field
                label="Supervisory Organization"
                value={worker.supervisoryOrg}
              />
              <Field label="Cost Center" value={worker.costCenter} />
            </FieldGrid>
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                marginBottom: 4,
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: workdayColors.textPrimary,
              }}
            >
              Hire & Tenure
            </h2>
            <FieldGrid>
              <Field label="Hire Date" value={hireDateDisplay} />
              <Field label="Time in Position" value={tenureDisplay} />
              <Field label="Worker Type" value="Regular Full-Time" />
              <Field label="Location" value="Brennan Health · Main Campus" />
            </FieldGrid>
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                marginBottom: 4,
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: workdayColors.textPrimary,
              }}
            >
              Manager
            </h2>
            <FieldGrid>
              <Field
                label="Manager"
                value={manager ? manager.displayName : "—"}
              />
              <Field
                label="Manager Email"
                value={manager ? manager.email : "—"}
              />
              <Field
                label="Manager's Position"
                value={manager ? manager.positionTitle : "—"}
              />
              <Field label="Reporting Org Tier" value="Direct Report" />
            </FieldGrid>
          </div>
        </div>
      </section>

      {/* Time Off summary card — small visual nod to the worker's PTO balance */}
      {vacationBal && vacationType && (
        <section
          style={{
            background: workdayColors.surface,
            border: `1px solid ${workdayColors.divider}`,
            borderRadius: 8,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 13,
                color: workdayColors.textSecondary,
              }}
            >
              {vacationType.label}
            </div>
            <div
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 22,
                fontWeight: 600,
                color: workdayColors.textPrimary,
              }}
            >
              {vacationBal.balance.toLocaleString()} {vacationType.unit}
            </div>
            <div
              style={{
                fontFamily: "Inter, system-ui, sans-serif",
                fontSize: 12,
                color: workdayColors.textMuted,
                marginTop: 2,
              }}
            >
              As of {vacationBal.asOf}
            </div>
          </div>
          <Link
            href="/demos/workday-onboarding-brennan/time-off"
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 13,
              color: workdayColors.actionBlue,
              textDecoration: "none",
            }}
          >
            View Time Off →
          </Link>
        </section>
      )}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "12px 32px",
        marginTop: 8,
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 12,
          color: workdayColors.textMuted,
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 14,
          color: workdayColors.textPrimary,
        }}
      >
        {value || "—"}
      </div>
    </div>
  );
}

// "Job Family" is a Workday concept — a grouping above Job Profile. We
// infer a sensible label from the position title so the field doesn't
// render empty.
function inferJobFamily(positionTitle: string): string {
  const t = (positionTitle || "").toLowerCase();
  if (t.includes("nurse")) return "Nursing";
  if (t.includes("hospitalist") || t.includes("md")) return "Medicine — Physician";
  if (t.includes("patient access")) return "Patient Access & Admissions";
  if (t.includes("chief")) return "Executive Leadership";
  if (t.includes("manager")) return "Operations Management";
  return "General";
}

function formatHireDate(hireDate: string): string {
  if (!hireDate) return "—";
  try {
    const d = new Date(hireDate);
    if (Number.isNaN(d.getTime())) return hireDate;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return hireDate;
  }
}

function formatTenure(hireDate: string): string {
  if (!hireDate) return "—";
  const d = new Date(hireDate);
  if (Number.isNaN(d.getTime())) return "—";
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 0) return "Starting soon";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "Day 1";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(days / 365.25);
  const remMonths = Math.floor((days % 365.25) / 30);
  return remMonths > 0
    ? `${years} yr${years === 1 ? "" : "s"} ${remMonths} mo`
    : `${years} year${years === 1 ? "" : "s"}`;
}
