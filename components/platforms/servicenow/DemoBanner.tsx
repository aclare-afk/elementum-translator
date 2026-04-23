// Subtle but visible banner indicating this is a mock.
// Required by SKILL.md § Step 4 hard rule: "Include a subtle `[DEMO]` banner
// at the top of every mock screen so nobody confuses the mock for a real
// instance in a screenshot."

export function DemoBanner() {
  return (
    <div
      role="note"
      className="flex items-center justify-center gap-2 border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-amber-800"
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
      <span>[DEMO] ServiceNow mock — not a real instance</span>
    </div>
  );
}
