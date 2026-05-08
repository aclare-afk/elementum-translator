// Durable Workday-ish store for the PTO smoke mock.
// Underscore-prefixed folder = Next.js does not route it.
//
// PERSISTENCE STRATEGY (mirrors servicenow-itsm-exemplar/_lib/db.ts):
//   - When Vercel KV / Upstash env vars are present, absence requests
//     persist to a versioned Redis key. This is what makes the mock work
//     on Vercel where POST and SSR reads land on different serverless
//     function instances.
//   - When env vars are missing (local dev), falls back to a globalThis
//     namespace so writes survive module re-evaluations within the same
//     process. POSTs reset between dev-server restarts in this mode.
//   - Workers and balances are seed-only and read-only in this mock, so
//     they're cached as in-process module references and never written
//     to KV. Drops bandwidth and keeps read-modify-write logic small.
//
// Versioned key (`...:absenceRequests:v1`) lets the seed shape evolve
// later without dirtying old demos that share the same Upstash database.

import { Redis } from "@upstash/redis";

import {
  seedAbsenceRequests,
  type SeedAbsenceRequest,
} from "../data/absence-requests";
import { seedWorkers, type Worker } from "../data/workers";
import {
  absenceTypes,
  seedBalances,
  type AbsenceType,
  type AbsenceBalanceSnapshot,
} from "../data/balances";

export type StoredAbsenceRequest = SeedAbsenceRequest;

// ---- KV plumbing -----------------------------------------------------------

const STORE_KEY = "workday-onboarding-brennan:absenceRequests:v1";

function kvEnabled(): boolean {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

let redisSingleton: Redis | null = null;
function getRedis(): Redis {
  if (redisSingleton) return redisSingleton;
  redisSingleton = new Redis({
    url: (process.env.UPSTASH_REDIS_REST_URL ??
      process.env.KV_REST_API_URL)!,
    token: (process.env.UPSTASH_REDIS_REST_TOKEN ??
      process.env.KV_REST_API_TOKEN)!,
  });
  return redisSingleton;
}

// globalThis fallback so warm function instances share state across module
// re-evaluations when KV is not configured (local dev only).
declare global {
  // eslint-disable-next-line no-var
  var __workdayPtoAbsenceRequests: StoredAbsenceRequest[] | undefined;
}

function seedClone(): StoredAbsenceRequest[] {
  // Deep-clone so mutations don't bleed back into the imported module.
  return JSON.parse(JSON.stringify(seedAbsenceRequests));
}

async function loadStore(): Promise<StoredAbsenceRequest[]> {
  if (kvEnabled()) {
    const existing =
      await getRedis().get<StoredAbsenceRequest[]>(STORE_KEY);
    if (existing && Array.isArray(existing) && existing.length > 0) {
      return existing;
    }
    const seeded = seedClone();
    await getRedis().set(STORE_KEY, seeded);
    return seeded;
  }
  if (!globalThis.__workdayPtoAbsenceRequests) {
    globalThis.__workdayPtoAbsenceRequests = seedClone();
  }
  return globalThis.__workdayPtoAbsenceRequests;
}

async function saveStore(rows: StoredAbsenceRequest[]): Promise<void> {
  if (kvEnabled()) {
    await getRedis().set(STORE_KEY, rows);
    return;
  }
  globalThis.__workdayPtoAbsenceRequests = rows;
}

// Workers + balances + absence types are static. Cache once at module load.
const workersCache: Worker[] = JSON.parse(JSON.stringify(seedWorkers));
const balancesCache: AbsenceBalanceSnapshot[] = JSON.parse(
  JSON.stringify(seedBalances),
);
const absenceTypesCache: AbsenceType[] = JSON.parse(JSON.stringify(absenceTypes));

// ---- Readers --------------------------------------------------------------

export async function listAbsenceRequests(): Promise<StoredAbsenceRequest[]> {
  return loadStore();
}

export async function listAbsenceRequestsForWorker(
  workerWid: string,
): Promise<StoredAbsenceRequest[]> {
  const all = await loadStore();
  return all.filter((r) => r.workerWid === workerWid);
}

export async function getAbsenceRequestByWid(
  wid: string,
): Promise<StoredAbsenceRequest | undefined> {
  const all = await loadStore();
  return all.find((r) => r.wid === wid);
}

export async function getAbsenceRequestByDisplayId(
  displayId: string,
): Promise<StoredAbsenceRequest | undefined> {
  const all = await loadStore();
  return all.find((r) => r.absenceRequestId === displayId);
}

// Sync — cached lookups, no KV round-trip.
export function getWorker(wid: string): Worker | undefined {
  return workersCache.find((w) => w.wid === wid);
}

export function getWorkerByEmail(email: string): Worker | undefined {
  const lc = email.trim().toLowerCase();
  return workersCache.find((w) => w.email.toLowerCase() === lc);
}

export function listWorkers(): Worker[] {
  return workersCache;
}

export function listAbsenceTypes(): AbsenceType[] {
  return absenceTypesCache;
}

export function getAbsenceType(id: string): AbsenceType | undefined {
  return absenceTypesCache.find((t) => t.id === id);
}

export function listBalancesForWorker(
  workerWid: string,
): AbsenceBalanceSnapshot[] {
  return balancesCache.filter((b) => b.workerWid === workerWid);
}

// ---- Writers --------------------------------------------------------------

export type CreateAbsenceRequestInput = {
  workerWid: string;
  absenceTypeId: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  hoursPerDay?: number;
  comment?: string;
  /** Initial state. Real Workday lands new requests in IN_PROGRESS until
   *  the worker explicitly Submits. The mock honors that default. */
  state?: StoredAbsenceRequest["state"];
};

export async function createAbsenceRequest(
  input: CreateAbsenceRequestInput,
): Promise<StoredAbsenceRequest> {
  const all = await loadStore();
  const now = new Date();
  const hoursPerDay = input.hoursPerDay ?? 8;
  const totalHours = hoursPerDay * countInclusiveDays(input.from, input.to);

  const created: StoredAbsenceRequest = {
    wid: genWid(),
    absenceRequestId: nextDisplayId(all, now),
    workerWid: input.workerWid,
    absenceTypeId: input.absenceTypeId,
    from: input.from,
    to: input.to,
    hoursPerDay,
    totalHours,
    state: input.state ?? "SUBMITTED",
    comment: input.comment,
    submittedAt: now.toISOString(),
    lastModifiedAt: now.toISOString(),
  };

  // Newest-first matches the way the Time Off worklet's "Recent Requests"
  // list renders.
  all.unshift(created);
  await saveStore(all);
  return created;
}

export async function resetStore(): Promise<StoredAbsenceRequest[]> {
  const fresh = seedClone();
  await saveStore(fresh);
  return fresh;
}

// ---- Utilities ------------------------------------------------------------

function genWid(): string {
  // Workday WIDs are 32-char lowercase hex. Same shape as ServiceNow sys_ids.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  return crypto.randomBytes(16).toString("hex");
}

function nextDisplayId(
  rows: StoredAbsenceRequest[],
  now: Date,
): string {
  const year = now.getUTCFullYear();
  const prefix = `ABS-${year}-`;
  const highest = rows.reduce<number>((max, r) => {
    if (!r.absenceRequestId.startsWith(prefix)) return max;
    const tail = r.absenceRequestId.slice(prefix.length);
    const n = parseInt(tail, 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  // Pad with leading zeros to 6 digits, e.g. ABS-2026-001046.
  return `${prefix}${String(highest + 1).padStart(6, "0")}`;
}

function countInclusiveDays(from: string, to: string): number {
  const f = Date.parse(from);
  const t = Date.parse(to);
  if (!Number.isFinite(f) || !Number.isFinite(t)) return 1;
  const days = Math.round((t - f) / 86400000) + 1;
  return Math.max(1, days);
}

// ---- Filter + paginate helpers --------------------------------------------

/**
 * Apply a small subset of REST query params relevant to the Absence
 * Management endpoints.
 *
 * - `worker` matches against either WID or email (the dynamic-submitter
 *   pattern hands the agent an email; we want the API to find by either).
 * - `state` is a comma-separated allow-list (e.g. "SUBMITTED,APPROVED").
 * - `from` / `to` filter by the request's date range overlapping the
 *   given window.
 *
 * Empty-string values are treated as "user didn't filter on this field"
 * — same chip-resolution defensive shape as the ServiceNow + SAP mocks.
 */
export function applyAbsenceFilter(
  rows: StoredAbsenceRequest[],
  q: URLSearchParams,
): StoredAbsenceRequest[] {
  const empty = (v: string | null) => {
    if (v === null) return true;
    const lc = v.trim().toLowerCase();
    return (
      lc === "" ||
      lc === "null" ||
      lc === "undefined" ||
      lc === "worker" ||
      lc === "state" ||
      lc === "from" ||
      lc === "to"
    );
  };

  const workerRaw = q.get("worker");
  const workerKey = empty(workerRaw) ? null : workerRaw!.trim();
  const stateRaw = q.get("state");
  const stateKey = empty(stateRaw) ? null : stateRaw!.trim();
  const fromRaw = q.get("from");
  const fromKey = empty(fromRaw) ? null : fromRaw!.trim();
  const toRaw = q.get("to");
  const toKey = empty(toRaw) ? null : toRaw!.trim();

  return rows.filter((r) => {
    if (workerKey) {
      const w = getWorker(r.workerWid);
      const matchesWid = r.workerWid === workerKey;
      const matchesEmail =
        w !== undefined && w.email.toLowerCase() === workerKey.toLowerCase();
      if (!matchesWid && !matchesEmail) return false;
    }
    if (stateKey) {
      const allowed = stateKey
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      if (!allowed.includes(r.state)) return false;
    }
    if (fromKey && r.to < fromKey) return false;
    if (toKey && r.from > toKey) return false;
    return true;
  });
}

export function paginate<T>(
  rows: T[],
  limit: number,
  offset: number,
): T[] {
  return rows.slice(offset, offset + limit);
}
