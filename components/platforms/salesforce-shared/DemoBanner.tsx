// Standard [DEMO] banner required by SKILL.md § Step 4. Used by every
// Salesforce mock so there's no chance a screenshot gets mistaken for a
// real production org.

export function DemoBanner() {
  return (
    <div
      role="note"
      className="flex items-center justify-center gap-2 border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-amber-800"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
      <span>[DEMO] Salesforce mock — not a real org</span>
    </div>
  );
}
