// Seed absence (PTO) requests for the Workday PTO smoke mock.
//
// Five seeds covering every state in the BPF (In Progress / Submitted /
// Approved / Denied / Canceled) so the Time Off history list has variety.
//
// Hygiene rules from PLATFORMS/workday.md § HYGIENE:
//   - WID: 32-char lowercase hex
//   - Absence Request ID (display): ABS-YYYY-NNNNNN
//   - from / to: YYYY-MM-DD (date-only, no time)
//
// Created/from/to dates are computed RELATIVE TO NOW at module load so the
// demo always looks current. Re-evaluated on Vercel cold starts. See
// `lib/dates.ts` for the helper functions.

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

const W_ALEX = seedWorkers[0].wid;
const W_PATRICIA = seedWorkers[1].wid;
const W_HENRY = seedWorkers[3].wid;
const W_LILY = seedWorkers[4].wid;

export const seedAbsenceRequests: SeedAbsenceRequest[] = [
  {
    wid: "abs01a3f4b7c92345678abcdef0112201",
    absenceRequestId: "ABS-2026-001045",
    workerWid: W_ALEX,
    absenceTypeId: "VACATION",
    from: ymd(daysFromNow(28)),
    to: ymd(daysFromNow(32)),
    hoursPerDay: 8,
    totalHours: 40,
    state: "SUBMITTED",
    comment: "Family trip — Crater Lake.",
    submittedAt: formatIso(daysAgo(2, undefined, 14, 6)),
    lastModifiedAt: formatIso(daysAgo(2, undefined, 14, 6)),
  },
  {
    wid: "abs02b4c6d8a91234567890abcdef0223",
    absenceRequestId: "ABS-2026-001044",
    workerWid: W_ALEX,
    absenceTypeId: "SICK",
    from: ymd(daysAgo(1)),
    to: ymd(daysAgo(1)),
    hoursPerDay: 8,
    totalHours: 8,
    state: "APPROVED",
    comment: "Migraine — out for the day.",
    submittedAt: formatIso(daysAgo(1, undefined, 7, 14)),
    lastModifiedAt: formatIso(daysAgo(1, undefined, 9, 30)),
  },
  {
    wid: "abs03c5d7e9aa1234567890abcdef0334",
    absenceRequestId: "ABS-2026-001038",
    workerWid: W_PATRICIA,
    absenceTypeId: "VACATION",
    from: ymd(daysFromNow(45)),
    to: ymd(daysFromNow(52)),
    hoursPerDay: 8,
    totalHours: 48,
    state: "APPROVED",
    comment: "Pre-planned summer break.",
    submittedAt: formatIso(daysAgo(11, undefined, 10, 22)),
    lastModifiedAt: formatIso(daysAgo(9, undefined, 16, 5)),
  },
  {
    wid: "abs04d6e8f0bb1234567890abcdef0445",
    absenceRequestId: "ABS-2026-001029",
    workerWid: W_HENRY,
    absenceTypeId: "PERSONAL",
    from: ymd(daysFromNow(7)),
    to: ymd(daysFromNow(7)),
    hoursPerDay: 4,
    totalHours: 4,
    state: "IN_PROGRESS",
    comment: "Doctor appointment — half day.",
    submittedAt: formatIso(daysAgo(3, undefined, 9, 2)),
    lastModifiedAt: formatIso(daysAgo(3, undefined, 9, 2)),
  },
  {
    wid: "abs05e7f9a1cc1234567890abcdef0556",
    absenceRequestId: "ABS-2026-001017",
    workerWid: W_LILY,
    absenceTypeId: "VACATION",
    from: ymd(daysAgo(20)),
    to: ymd(daysAgo(15)),
    hoursPerDay: 8,
    totalHours: 48,
    state: "DENIED",
    comment: "Originally planned — overlapped with quarterly close.",
    submittedAt: formatIso(daysAgo(35, undefined, 8, 50)),
    lastModifiedAt: formatIso(daysAgo(33, undefined, 11, 12)),
  },
];
