// Seed time-off balances per worker per absence type.
//
// Real Workday accrues absence balances against per-tenant configuration —
// monthly accrual, carry-over caps, sabbatical eligibility, etc. The mock
// just hard-codes a snapshot per worker so the Time Off worklet has
// realistic numbers to render.
//
// Balances are units the absence type tracks in (Hours for Vacation/Sick/
// Personal, Days for Bereavement). We render them with the unit suffix.

import { seedWorkers } from "./workers";

export type AbsenceType = {
  /** Stable identifier used in API requests. */
  id: string;
  /** Display label (e.g. "Vacation Hours"). */
  label: string;
  /** Unit suffix for the balance display. */
  unit: "Hours" | "Days";
  /** Optional accent color override for the balance card stripe. */
  accent?: string;
};

export const absenceTypes: AbsenceType[] = [
  { id: "VACATION", label: "Vacation Hours", unit: "Hours", accent: "#F38B00" },
  { id: "SICK", label: "Sick Hours", unit: "Hours", accent: "#0E9F6E" },
  { id: "PERSONAL", label: "Personal Hours", unit: "Hours", accent: "#7C3AED" },
  { id: "BEREAVEMENT", label: "Bereavement Days", unit: "Days", accent: "#475569" },
];

export type AbsenceBalanceSnapshot = {
  workerWid: string;
  absenceTypeId: string;
  balance: number;
  asOf: string; // YYYY-MM-DD
};

// Hardcoded balances per worker. Each worker has all four absence types,
// with realistic-looking numbers per role tenure.
function balanceSnapshots(): AbsenceBalanceSnapshot[] {
  // Today as YYYY-MM-DD — seed file is module-loaded once per cold start.
  const asOf = new Date().toISOString().slice(0, 10);
  const out: AbsenceBalanceSnapshot[] = [];
  for (const w of seedWorkers) {
    out.push(
      { workerWid: w.wid, absenceTypeId: "VACATION", balance: 96, asOf },
      { workerWid: w.wid, absenceTypeId: "SICK", balance: 48, asOf },
      { workerWid: w.wid, absenceTypeId: "PERSONAL", balance: 16, asOf },
      { workerWid: w.wid, absenceTypeId: "BEREAVEMENT", balance: 5, asOf },
    );
  }
  // Tenure-based bumps for a couple workers — Marcus and Patricia have been
  // here longer; their vacation balance is higher.
  for (const snap of out) {
    if (
      snap.absenceTypeId === "VACATION" &&
      (snap.workerWid === "9d2e4c12a0b1c23456789abcdef01234" || // Patricia
        snap.workerWid === "7c1eab3f7b1010102df1d2a7bdf6a76e") // Marcus
    ) {
      snap.balance = 144;
    }
  }
  return out;
}

export const seedBalances: AbsenceBalanceSnapshot[] = balanceSnapshots();
