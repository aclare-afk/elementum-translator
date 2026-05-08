// Seed absence (PTO) requests for the Brennan onboarding demo mock.
//
// Five seeds covering every state in the BPF (In Progress / Submitted /
// Approved / Denied / Canceled) so the Time Off history list has variety
// when an audience clicks into the Time Off worklet during the demo. PTO
// is NOT the demo focus — it's chrome decoration to make the worker
// profiles feel populated. None of these reference Sarah Chen (index 0)
// because she's a new hire starting Monday and shouldn't have a history
// yet.
//
// Hygiene rules from PLATFORMS/workday.md § HYGIENE:
//   - WID: 32-char lowercase hex
//   - Absence Request ID (display): ABS-YYYY-NNNNNN
//   - from / to: YYYY-MM-DD (date-only, no time)
//
// Created/from/to dates are computed RELATIVE TO NOW at module load so the
// demo always looks current. Re-evaluated on Vercel cold starts.

import { daysAgo, daysFromNow, formatIso } from "../../../../lib/dates";
import type { WorkdayAbsenceStateKey } from "@/components/platforms/workday";
import { seedWorkers } from "./workers";

export type SeedAbsenceRequest = {
  /** WID (internal Workday ID) — 32-char hex. */
  wid: string;
  /** Display ID — ABS-YYYY-NNNNNN. */
  absenceRequestId: string;
  /** Worker WID this request belongs to. */
  workerWid: string;
  /** Absence type ID — see data/balances.ts#absenceTypes. */
  absenceTypeId: string;
  /** Start date (YYYY-MM-DD). */
  from: string;
  /** End date (YYYY-MM-DD), inclusive. */
  to: string;
  /** Hours per day requested (typically 8 for full days). */
  hoursPerDay: number;
  /** Total hours requested across the date range. */
  totalHours: number;
  /** Lifecycle state — drives the chip color. */
  state: WorkdayAbsenceStateKey;
  /** Worker-supplied comment, optional. */
  comment?: string;
  /** Submission timestamp — ISO with timezone. */
  submittedAt: string;
  /** Last-modified timestamp. */
  lastModifiedAt: string;
};

// YYYY-MM-DD helper. Date.toISOString returns full ISO; slice off time.
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Skip index 0 (Sarah Chen — the new hire being onboarded; no PTO history).
const W_KAREN = seedWorkers[1].wid;
const W_MARCUS_P = seedWorkers[3].wid;
const W_LINDA = seedWorkers[4].wid;

export const seedAbsenceRequests: SeedAbsenceRequest[] = [
  {
    wid: "abs01a3f4b7c92345678abcdef0112201",
    absenceRequestId: "ABS-2026-001045",
    workerWid: W_KAREN,
    absenceTypeId: "VACATION",
    from: ymd(daysFromNow(28)),
    to: ymd(daysFromNow(32)),
    hoursPerDay: 12,
    totalHours: 60,
    state: "SUBMITTED",
    comment: "Family trip — Olympic Peninsula.",
    submittedAt: formatIso(daysAgo(2, undefined, 14, 6)),
    lastModifiedAt: formatIso(daysAgo(2, undefined, 14, 6)),
  },
  {
    wid: "abs02b4c6d8a91234567890abcdef0223",
    absenceRequestId: "ABS-2026-001044",
    workerWid: W_KAREN,
    absenceTypeId: "SICK",
    from: ymd(daysAgo(1)),
    to: ymd(daysAgo(1)),
    hoursPerDay: 12,
    totalHours: 12,
    state: "APPROVED",
    comment: "Migraine — out for the shift.",
    submittedAt: formatIso(daysAgo(1, undefined, 7, 14)),
    lastModifiedAt: formatIso(daysAgo(1, undefined, 9, 30)),
  },
  {
    wid: "abs03c5d7e9aa1234567890abcdef0334",
    absenceRequestId: "ABS-2026-001038",
    workerWid: W_MARCUS_P,
    absenceTypeId: "VACATION",
    from: ymd(daysFromNow(45)),
    to: ymd(daysFromNow(52)),
    hoursPerDay: 8,
    totalHours: 48,
    state: "APPROVED",
    comment: "Pre-planned conference + family time.",
    submittedAt: formatIso(daysAgo(11, undefined, 10, 22)),
    lastModifiedAt: formatIso(daysAgo(9, undefined, 16, 5)),
  },
  {
    wid: "abs04d6e8f0bb1234567890abcdef0445",
    absenceRequestId: "ABS-2026-001029",
    workerWid: W_MARCUS_P,
    absenceTypeId: "PERSONAL",
    from: ymd(daysFromNow(7)),
    to: ymd(daysFromNow(7)),
    hoursPerDay: 4,
    totalHours: 4,
    state: "IN_PROGRESS",
    comment: "Specialty appointment — half day.",
    submittedAt: formatIso(daysAgo(3, undefined, 9, 2)),
    lastModifiedAt: formatIso(daysAgo(3, undefined, 9, 2)),
  },
  {
    wid: "abs05e7f9a1cc1234567890abcdef0556",
    absenceRequestId: "ABS-2026-001017",
    workerWid: W_LINDA,
    absenceTypeId: "VACATION",
    from: ymd(daysAgo(20)),
    to: ymd(daysAgo(15)),
    hoursPerDay: 8,
    totalHours: 48,
    state: "DENIED",
    comment: "Originally planned — overlapped with month-end registration push.",
    submittedAt: formatIso(daysAgo(35, undefined, 8, 50)),
    lastModifiedAt: formatIso(daysAgo(33, undefined, 11, 12)),
  },
];
