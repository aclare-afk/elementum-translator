// In-memory ServiceNow-ish store for this mock.
// Underscore-prefixed folder = Next.js does not route it.
//
// The store is intentionally a single process-global so mutations from API
// routes are visible to SSR pages during the same Vercel function lifetime.
// On cold starts, the store re-seeds from JSON — this matches what a fresh
// demo should look like, and prevents leaking state between demo sessions.

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

type Store = {
  incidents: StoredIncident[];
  users: User[];
  groups: Group[];
};

// Keep the store on globalThis so it survives across module re-evaluations
// (Vercel reuses warm function instances). Namespaced so multiple mocks in
// the same deploy don't collide.
declare global {
  // eslint-disable-next-line no-var
  var __snowItsmExemplarStore: Store | undefined;
}

function getStore(): Store {
  if (!globalThis.__snowItsmExemplarStore) {
    globalThis.__snowItsmExemplarStore = {
      incidents: JSON.parse(JSON.stringify(incidentsSeed)) as StoredIncident[],
      users: JSON.parse(JSON.stringify(usersSeed)) as User[],
      groups: JSON.parse(JSON.stringify(groupsSeed)) as Group[],
    };
  }
  return globalThis.__snowItsmExemplarStore;
}

// ---- Readers ---------------------------------------------------------------

export function listIncidents(): StoredIncident[] {
  return getStore().incidents;
}

export function getIncident(sysId: string): StoredIncident | undefined {
  return getStore().incidents.find((i) => i.sys_id === sysId);
}

export function getUser(sysId: string): User | undefined {
  return getStore().users.find((u) => u.sys_id === sysId);
}

export function getGroup(sysId: string): Group | undefined {
  return getStore().groups.find((g) => g.sys_id === sysId);
}

// ---- Writers ---------------------------------------------------------------

export function createIncident(patch: Partial<StoredIncident>): StoredIncident {
  const store = getStore();
  const sys_id = patch.sys_id ?? genSysId();
  const number = patch.number ?? nextIncidentNumber(store.incidents);
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
  store.incidents.unshift(rec);
  return rec;
}

export function updateIncident(
  sysId: string,
  patch: Partial<StoredIncident>,
): StoredIncident | undefined {
  const store = getStore();
  const idx = store.incidents.findIndex((i) => i.sys_id === sysId);
  if (idx === -1) return undefined;
  const merged: StoredIncident = {
    ...store.incidents[idx],
    ...patch,
    sys_id: store.incidents[idx].sys_id, // immutable
    number: store.incidents[idx].number, // immutable
    sys_created_on: store.incidents[idx].sys_created_on,
    sys_updated_on: nowSnow(),
  };
  store.incidents[idx] = merged;
  return merged;
}

export function deleteIncident(sysId: string): boolean {
  const store = getStore();
  const before = store.incidents.length;
  store.incidents = store.incidents.filter((i) => i.sys_id !== sysId);
  return store.incidents.length < before;
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
      return String(row[field] ?? "") === value;
    }),
  );
}

export function paginate<T>(rows: T[], limit: number, offset: number): T[] {
  return rows.slice(offset, offset + limit);
}
