// Seed time-off balances per worker per absence type.
//
// Real Workday accrues absence balances against per-tenant configuration —
// monthly accrual, carry-over caps, sabbatical eligibility, etc. The mock
// just hard-codes a snapshot per worker so the Time Off worklet has
// realistic numbers to render.
//
// Balances are units the absence type tracks in (Hours for Vacation/Sick/
// Personal, Days for Bereavement). We render them with the unit suffix.
//
// Per-worker tenure adjustment: longer-tenured workers get higher
// vacation balances. We compute years-of-tenure from hireDate at module
// load instead of hardcoding WIDs (was a pain to maintain across seed
// edits). Sarah Chen — hire date in the future — gets a "starting"
// balance of 0 vacation, matching real Workday's accrual-from-hire
// semantics.

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

function yearsSinceHire(hireDate: string): number {
  const now = Date.now();
  const hire = new Date(hireDate).getTime();
  if (Number.isNaN(hire)) return 0;
  const ms = now - hire;
  if (ms <= 0) return 0; // future hire date — not yet started
  return ms / (365.25 * 24 * 60 * 60 * 1000);
}

function vacationFor(hireDate: string): number {
  const yrs = yearsSinceHire(hireDate);
  if (yrs === 0) return 0;       // future hire (Sarah Chen)
  if (yrs < 2) return 80;        // first-2-year accrual
  if (yrs < 5) return 120;       // mid-tenure
  return 168;                    // long-tenure cap-ish
}

function balanceSnapshots(): AbsenceBalanceSnapshot[] {
  const asOf = new Date().toISOString().slice(0, 10);
  const out: AbsenceBalanceSnapshot[] = [];
  for (const w of seedWorkers) {
    out.push(
      { workerWid: w.wid, absenceTypeId: "VACATION", balance: vacationFor(w.hireDate), asOf },
      { workerWid: w.wid, absenceTypeId: "SICK", balance: 48, asOf },
      { workerWid: w.wid, absenceTypeId: "PERSONAL", balance: 16, asOf },
      { workerWid: w.wid, absenceTypeId: "BEREAVEMENT", balance: 5, asOf },
    );
  }
  return out;
}

export const seedBalances: AbsenceBalanceSnapshot[] = balanceSnapshots();
