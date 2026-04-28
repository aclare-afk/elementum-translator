// Durable ServiceNow-ish store for the ITSM exemplar mock.
// Underscore-prefixed folder = Next.js does not route it.
//
// PERSISTENCE STRATEGY (mirrors jsm-queue-smoke/_lib/store.ts):
//   - When Vercel KV / Upstash env vars are present, incidents persist to a
//     versioned Redis key. This is what makes the mock work on Vercel where
//     POST and SSR reads land on different serverless function instances.
//   - When env vars are missing (local dev), we fall back to a globalThis
//     namespace so writes survive module re-evaluations within the same
//     process. POSTs reset between dev-server restarts in this mode.
//   - Users and groups are seed-only and read-only in this mock, so we keep
//     them as in-process module caches and never write them to KV. Drops
//     KV bandwidth and keeps the read-modify-write logic small.
//
// Versioned key (`...:incidents:v1`) lets us swap the seed shape later
// without dirtying old demos that share the same Upstash database.

import { Redis } from "@upstash/redis";

import incidentsSeed from "../data/incidents.json";
import usersSeed from "../data/users.json";
import groupsSeed from "../data/groups.json";

export type StoredIncident = {
  sys_id: string;
  number: string;
  short_description: string;
  description: string;
  priority: string;
  urgency: string;
  impact: string;
  state: string;
  category: string;
  subcategory: string;
  assignment_group: string; // sys_id, may be empty string
  assigned_to: string; // sys_id, may be empty string
  caller_id: string; // sys_id, may be empty string
  opened_at: string;
  sys_created_on: string;
  sys_updated_on: string;
  sys_created_by: string;
  active: string; // "true" | "false"
};

export type User = {
  sys_id: string;
  user_name: string;
  name: string;
  email: string;
};

export type Group = {
  sys_id: string;
  name: string;
  email: string;
};

// ---- KV plumbing -----------------------------------------------------------

const STORE_KEY = "servicenow-itsm-exemplar:incidents:v1";

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
  var __snowItsmExemplarIncidents: StoredIncident[] | undefined;
}

function seedIncidents(): StoredIncident[] {
  // Deep-clone so mutations don't bleed back into the imported JSON module.
  return JSON.parse(JSON.stringify(incidentsSeed)) as StoredIncident[];
}

async function loadIncidents(): Promise<StoredIncident[]> {
  if (kvEnabled()) {
    const existing = await getRedis().get<StoredIncident[]>(STORE_KEY);
    if (existing && Array.isArray(existing) && existing.length > 0) {
      return existing;
    }
    const seeded = seedIncidents();
    await getRedis().set(STORE_KEY, seeded);
    return seeded;
  }
  if (!globalThis.__snowItsmExemplarIncidents) {
    globalThis.__snowItsmExemplarIncidents = seedIncidents();
  }
  return globalThis.__snowItsmExemplarIncidents;
}

async function saveIncidents(incidents: StoredIncident[]): Promise<void> {
  if (kvEnabled()) {
    await getRedis().set(STORE_KEY, incidents);
    return;
  }
  globalThis.__snowItsmExemplarIncidents = incidents;
}

// Users + groups are static seeds. Cache them once at module load — no KV.
const usersCache: User[] = JSON.parse(JSON.stringify(usersSeed));
const groupsCache: Group[] = JSON.parse(JSON.stringify(groupsSeed));

// ---- Readers ---------------------------------------------------------------

export async function listIncidents(): Promise<StoredIncident[]> {
  return loadIncidents();
}

export async function getIncident(
  sysId: string,
): Promise<StoredIncident | undefined> {
  const incidents = await loadIncidents();
  return incidents.find((i) => i.sys_id === sysId);
}

// Sync — module-cache lookup, no KV round-trip.
export function getUser(sysId: string): User | undefined {
  return usersCache.find((u) => u.sys_id === sysId);
}

export function getGroup(sysId: string): Group | undefined {
  return groupsCache.find((g) => g.sys_id === sysId);
}

// ---- Writers ---------------------------------------------------------------

export async function createIncident(
  patch: Partial<StoredIncident>,
): Promise<StoredIncident> {
  const incidents = await loadIncidents();
  const sys_id = patch.sys_id ?? genSysId();
  const number = patch.number ?? nextIncidentNumber(incidents);
  const now = nowSnow();
  const rec: StoredIncident = {
    sys_id,
    number,
    short_description: patch.short_description ?? "",
    description: patch.description ?? "",
    priority: patch.priority ?? "4",
    urgency: patch.urgency ?? "3",
    impact: patch.impact ?? "3",
    state: patch.state ?? "1",
    category: patch.category ?? "inquiry",
    subcategory: patch.subcategory ?? "",
    assignment_group: patch.assignment_group ?? "",
    assigned_to: patch.assigned_to ?? "",
    caller_id: patch.caller_id ?? "",
    opened_at: patch.opened_at ?? now,
    sys_created_on: now,
    sys_updated_on: now,
    sys_created_by: patch.sys_created_by ?? "admin",
    active: patch.active ?? "true",
  };
  incidents.unshift(rec);
  await saveIncidents(incidents);
  return rec;
}

export async function updateIncident(
  sysId: string,
  patch: Partial<StoredIncident>,
): Promise<StoredIncident | undefined> {
  const incidents = await loadIncidents();
  const idx = incidents.findIndex((i) => i.sys_id === sysId);
  if (idx === -1) return undefined;
  const merged: StoredIncident = {
    ...incidents[idx],
    ...patch,
    sys_id: incidents[idx].sys_id, // immutable
    number: incidents[idx].number, // immutable
    sys_created_on: incidents[idx].sys_created_on,
    sys_updated_on: nowSnow(),
  };
  incidents[idx] = merged;
  await saveIncidents(incidents);
  return merged;
}

export async function deleteIncident(sysId: string): Promise<boolean> {
  const incidents = await loadIncidents();
  const before = incidents.length;
  const filtered = incidents.filter((i) => i.sys_id !== sysId);
  if (filtered.length === before) return false;
  await saveIncidents(filtered);
  return true;
}

// Wipe the durable store and re-seed. Useful for `ei`-style demo resets.
export async function resetIncidents(): Promise<StoredIncident[]> {
  const fresh = seedIncidents();
  await saveIncidents(fresh);
  return fresh;
}

// ---- Utilities -------------------------------------------------------------

function genSysId(): string {
  // Note: lib/utils.ts has a browser-aware version; mirror it here for Node.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  return crypto.randomBytes(16).toString("hex");
}

function nextIncidentNumber(incidents: StoredIncident[]): string {
  const highest = incidents.reduce<number>((max, i) => {
    const m = i.number.match(/^INC(\d+)$/);
    if (!m) return max;
    const n = parseInt(m[1], 10);
    return n > max ? n : max;
  }, 0);
  const next = highest + 1;
  return `INC${next.toString().padStart(7, "0")}`;
}

function nowSnow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

// ---- Table API envelope helpers -------------------------------------------

// ServiceNow's Table API renders reference fields as { link, value } where
// `link` is an absolute URL into the Table API. The caller passes the base URL
// because we don't know it at seed time.
export function shapeIncidentForTableApi(
  inc: StoredIncident,
  baseUrl: string,
): Record<string, unknown> {
  const ref = (table: string, sysId: string) =>
    sysId
      ? {
          link: `${baseUrl}/api/now/table/${table}/${sysId}`,
          value: sysId,
        }
      : "";

  return {
    sys_id: inc.sys_id,
    number: inc.number,
    short_description: inc.short_description,
    description: inc.description,
    priority: inc.priority,
    urgency: inc.urgency,
    impact: inc.impact,
    state: inc.state,
    category: inc.category,
    subcategory: inc.subcategory,
    assignment_group: ref("sys_user_group", inc.assignment_group),
    assigned_to: ref("sys_user", inc.assigned_to),
    caller_id: ref("sys_user", inc.caller_id),
    opened_at: inc.opened_at,
    sys_created_on: inc.sys_created_on,
    sys_updated_on: inc.sys_updated_on,
    sys_created_by: inc.sys_created_by,
    active: inc.active,
  };
}

// Very small subset of sysparm_query. Supports `field=value` joined by `^`.
// Enough for demo filters like `active=true^priority=1`.
//
// Empty-value clauses (e.g. `state=`) are treated as "user didn't filter on
// this field" and skipped. Real ServiceNow rejects those clauses outright,
// but Elementum api_task URL templates always interpolate every reference
// chip — including empties — so we'd otherwise filter every row out the
// moment any optional filter is unused. Skipping empties keeps the demo
// agent's "list all open incidents" call (active="true", others empty)
// working as the user expects.
//
// We also treat the literal strings "null", "undefined", and the chip
// names themselves (e.g. "state", "priority", "limit") the same as empty,
// because agents and chip-rendering edge cases sometimes pass those when
// they mean "don't filter". This is a demo affordance — real ServiceNow
// would either reject or take these literally.
const NO_FILTER_VALUES = new Set([
  "",
  "null",
  "undefined",
  "state",
  "priority",
  "limit",
  "active",
]);

export function applySysparmQuery<T extends Record<string, unknown>>(
  rows: T[],
  query: string | null,
): T[] {
  if (!query) return rows;
  const clauses = query.split("^").filter(Boolean);
  return rows.filter((row) =>
    clauses.every((c) => {
      const m = c.match(/^([a-zA-Z0-9_.]+)=(.*)$/);
      if (!m) return true;
      const [, field, value] = m;
      if (NO_FILTER_VALUES.has(value.trim().toLowerCase())) return true;
      return String(row[field] ?? "") === value;
    }),
  );
}

export function paginate<T>(rows: T[], limit: number, offset: number): T[] {
  return rows.slice(offset, offset + limit);
}
