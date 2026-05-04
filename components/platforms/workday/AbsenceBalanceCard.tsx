// Time-Off balance summary card.
//
// Shown at the top of the Time Off worklet page — one card per absence
// type ("Vacation Hours", "Sick Hours", etc.). Each card surfaces:
//   - The absence type label
//   - The current balance (large, prominent)
//   - A unit suffix (Hours / Days)
//   - Optional "as of" date and accrual hint
//
// Real Workday colors these with subtle category accents — Vacation
// orange, Sick teal, Personal purple. The mock does the same so the row
// reads as a balance summary rather than a sea of identical cards.
//
// Fidelity anchor: PLATFORMS/workday.md § UI PATTERNS > Worklet detail page.

import { workdayColors, workdayFont } from "./design-tokens";

export type AbsenceBalance = {
  /** Absence type (e.g., "Vacation Hours", "Sick Hours"). */
  type: string;
  /** Numeric balance. */
  balance: number;
  /** Unit suffix — typically "Hours" or "Days". */
  unit: "Hours" | "Days";
  /** Optional "as of" display date. */
  asOf?: string;
  /** Optional accent color for the top stripe. Defaults to brand orange. */
  accent?: string;
};

export function AbsenceBalanceRow({ balances }: { balances: AbsenceBalance[] }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      style={{ fontFamily: workdayFont.family }}
    >
      {balances.map((b) => (
        <AbsenceBalanceCard key={b.type} balance={b} />
      ))}
    </div>
  );
}

function AbsenceBalanceCard({ balance }: { balance: AbsenceBalance }) {
  const accent = balance.accent ?? workdayColors.brandOrange;
  return (
    <section
      className="overflow-hidden rounded border bg-white"
      style={{ borderColor: workdayColors.divider }}
    >
      <div className="h-1" style={{ background: accent }} aria-hidden />
      <div className="px-4 py-3">
        <div
          className="text-[12px] font-semibold uppercase tracking-wide"
          style={{ color: workdayColors.textSecondary }}
        >
          {balance.type}
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span
            className="text-[28px] font-bold leading-none"
            style={{ color: workdayColors.textPrimary }}
          >
            {formatNumber(balance.balance)}
          </span>
          <span
            className="text-[12px]"
            style={{ color: workdayColors.textSecondary }}
          >
            {balance.unit}
          </span>
        </div>
        {balance.asOf && (
          <div
            className="mt-1 text-[11px]"
            style={{ color: workdayColors.textMuted }}
          >
            as of {balance.asOf}
          </div>
        )}
      </div>
    </section>
  );
}

function formatNumber(n: number): string {
  // Workday displays balances with up to 2 decimal places, dropping
  // trailing zeros (so 16 -> "16", 16.5 -> "16.5", 16.25 -> "16.25").
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, "");
}
