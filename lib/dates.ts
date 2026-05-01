// Shared helpers for relative-to-now seed dates across all platform mocks.
//
// Why this exists: hardcoded ISO timestamps in seed data drift over time.
// When an SE records a demo, seed records dated April 2026 look stale next
// to agent-created records that just got current timestamps. The fix is to
// compute every seed date relative to "now" at module load, so the demo
// always looks current regardless of when it's run.
//
// Each platform has its own native date format on the wire (ServiceNow's
// `YYYY-MM-DD HH:mm:ss`, Salesforce's ISO with `+0000`, SAP's `DD.MM.YYYY`,
// Amazon's standard ISO). The formatters here emit the right shape per
// platform — the SE-facing chrome and any integration parsing it gets the
// same wire format it would from the real platform.
//
// All helpers are pure and computed at module load — fast, no async, no
// side effects. Re-evaluated on every Vercel cold start.

// ---- Relative time anchors ------------------------------------------------

/**
 * Stable "now" reference for an entire seed module. Each seed file imports
 * `now()` to anchor its relative dates. Computed once when the module first
 * loads, then re-used so all the seed records in a file share the same
 * reference frame.
 */
export function now(): Date {
  return new Date();
}

/**
 * `n` days before the given anchor. Optional `setHourMinute` adjusts the
 * time-of-day so seed records look like they were created during business
 * hours (default 9:30 AM).
 */
export function daysAgo(
  n: number,
  anchor: Date = now(),
  hour = 9,
  minute = 30,
): Date {
  const d = new Date(anchor);
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** `n` hours before the anchor. Minute jitter optional. */
export function hoursAgo(n: number, anchor: Date = now()): Date {
  const d = new Date(anchor);
  d.setHours(d.getHours() - n);
  return d;
}

/** `n` minutes before the anchor. */
export function minutesAgo(n: number, anchor: Date = now()): Date {
  const d = new Date(anchor);
  d.setMinutes(d.getMinutes() - n);
  return d;
}

/** `n` days after the anchor — for delivery-date / due-date style fields. */
export function daysFromNow(
  n: number,
  anchor: Date = now(),
  hour = 9,
  minute = 0,
): Date {
  const d = new Date(anchor);
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ---- Per-platform formatters ----------------------------------------------

/**
 * ServiceNow Table API format: `YYYY-MM-DD HH:mm:ss` in UTC, no timezone
 * marker, no `T` separator, no milliseconds.
 *
 *   "2026-04-22 08:12:47"
 */
export function formatServiceNow(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  );
}

/**
 * Salesforce REST/SOQL response format: ISO 8601 with `+0000` offset and
 * millisecond precision.
 *
 *   "2026-04-23T13:32:11.000+0000"
 */
export function formatSalesforce(d: Date): string {
  return d.toISOString().replace("Z", "+0000");
}

/**
 * SAP S/4HANA display format used in the GUI/ME53N: `DD.MM.YYYY`.
 *
 *   "19.04.2026"
 */
export function formatSapDisplay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * Standard ISO 8601 with `Z` timezone — used by Amazon's submittedAt and
 * a few other generic fields that aren't platform-specific.
 *
 *   "2026-04-21T14:22:18.000Z"
 */
export function formatIso(d: Date): string {
  return d.toISOString();
}

/**
 * Jira-style human-readable relative phrase ("2d ago", "5h ago", "20m ago").
 * The Jira board UI shows these on every card. Computed from the difference
 * between now and the given date.
 */
export function formatJiraAgo(d: Date, anchor: Date = now()): string {
  const diffMs = anchor.getTime() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}
