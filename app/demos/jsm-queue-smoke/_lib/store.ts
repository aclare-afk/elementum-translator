// Durable JSM-ish store for the jsm-queue-smoke mock.
//
// `_lib` is underscore-prefixed so Next.js does not route it — pages and route
// handlers import from here, but there is no public URL that resolves to it.
//
// Backing:
//   1. Vercel KV (Upstash Redis under the hood) when the KV_* / UPSTASH_*
//      env vars are set. This is what production uses. State survives cold
//      starts and is shared across different serverless function instances —
//      which is the whole reason we moved off globalThis. The POST that
//      creates ITH-421 and the portal page that renders ITH-421 can now
//      land on different Vercel function instances and still agree.
//   2. globalThis fallback when no KV is configured. Keeps `npm run dev`
//      working locally without forcing the SE to provision KV just to poke
//      at the mock. Same semantics as the original in-memory store: seeds
//      on cold start, mutations persist within a warm instance, never
//      across instances.
//
// Shape: a single key `jsm-queue-smoke:requests:v1` holds the full
// StoredRequest[]. Writes are read-modify-write — fine for the demo because
// there's one SE firing one automation at a time. If a customer demo ever
// surfaces concurrent-write bugs, swap to a sorted set keyed by issue id.

import { Redis } from "@upstash/redis";
import { seedRequests, type RequestSeed } from "../data/requests";

export type StoredRequest = RequestSeed & {
  /** ISO 8601 creation timestamp. Seeds get synthesized values lazily. */
  createdIso: string;
  /**
   * Email supplied on the create via `raiseOnBehalfOf`. Seeds don't have one;
   * created-via-API records do.
   */
  reporterEmail?: string;
  /**
   * `requestFieldValues` the create call supplied. Echoed back in the GET
   * response so Elementum automations can read back what they wrote.
   */
  requestFieldValues?: Record<string, unknown>;
};

// Versioned key so we can rev the schema without stepping on old data. Bump
// the `v<n>` suffix if the StoredRequest shape changes in a breaking way.
const STORE_KEY = "jsm-queue-smoke:requests:v1";

// ---- KV client -------------------------------------------------------------

// Vercel's "KV database" marketplace integration sets KV_REST_API_URL and
// KV_REST_API_TOKEN. Bringing your own Upstash Redis sets
// UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. Accept both so the
// same code works regardless of how the SE provisioned the store.
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

// ---- globalThis fallback for local dev -------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __jsmQueueSmokeStore: StoredRequest[] | undefined;
}

// ---- Seed ------------------------------------------------------------------

function seedInitial(): StoredRequest[] {
  // Deep clone so mutations don't bleed into the imported seeds.
  const cloned = JSON.parse(JSON.stringify(seedRequests)) as RequestSeed[];
  const now = new Date();
  return cloned.map((r, idx) => ({
    ...r,
    // Synthesize plausible created timestamps for seeds so the GET response
    // has a real ISO 8601 value to return (real JSM never returns
    // human-relative strings like "3h ago" — that's UI-only).
    createdIso: offsetFromNow(now, -idx * 3600 * 1000).toISOString(),
  }));
}

// ---- Load / save -----------------------------------------------------------

async function loadStore(): Promise<StoredRequest[]> {
  if (kvEnabled()) {
    // `@upstash/redis` returns `null` for missing keys. Typed generically
    // because KV stores arbitrary JSON.
    const existing = await getRedis().get<StoredRequest[]>(STORE_KEY);
    if (existing && Array.isArray(existing) && existing.length > 0) {
      return existing;
    }
    // Seed on first access. Two SEs hitting a cold KV simultaneously could
    // race here and both write the seed; that's fine because the seed is
    // deterministic so whichever write lands last is equivalent.
    const seeded = seedInitial();
    await getRedis().set(STORE_KEY, seeded);
    return seeded;
  }
  // Local/dev fallback: warm-instance globalThis.
  if (!globalThis.__jsmQueueSmokeStore) {
    globalThis.__jsmQueueSmokeStore = seedInitial();
  }
  return globalThis.__jsmQueueSmokeStore;
}

async function saveStore(requests: StoredRequest[]): Promise<void> {
  if (kvEnabled()) {
    await getRedis().set(STORE_KEY, requests);
    return;
  }
  globalThis.__jsmQueueSmokeStore = requests;
}

// ---- Readers ---------------------------------------------------------------

export async function listRequests(): Promise<StoredRequest[]> {
  return loadStore();
}

export async function getRequestByKey(
  key: string,
): Promise<StoredRequest | undefined> {
  const all = await loadStore();
  return all.find((r) => r.key === key);
}

export async function getRequestById(
  id: string,
): Promise<StoredRequest | undefined> {
  const all = await loadStore();
  return all.find((r) => r.id === id);
}

// ---- Writers ---------------------------------------------------------------

export type CreateRequestInput = {
  serviceDeskId: string;
  requestTypeId: string;
  summary: string;
  description?: string;
  reporterEmail?: string;
  requestFieldValues?: Record<string, unknown>;
};

export async function createRequest(
  input: CreateRequestInput,
): Promise<StoredRequest> {
  const all = await loadStore();

  const key = nextRequestKey(all);
  const id = nextRequestId(all);
  const nowIso = new Date().toISOString();

  // Derive a reporter account. If the Elementum automation passes a known
  // seed email via raiseOnBehalfOf, reuse that account; otherwise mint a
  // fresh opaque accountId and use the email local part as the display name.
  const reporter = reporterFromEmail(input.reporterEmail, all);

  const stored: StoredRequest = {
    id,
    key,
    requestTypeId: input.requestTypeId,
    summary: input.summary,
    description: input.description ?? "",
    status: { name: "Waiting for support", category: "new" },
    priority: "Medium",
    reporter,
    assignee: undefined,
    slaResponseRemainingMs: 4 * 60 * 60 * 1000,
    slaResponseTargetMs: 4 * 60 * 60 * 1000,
    slaResolutionRemainingMs: 24 * 60 * 60 * 1000,
    slaResolutionTargetMs: 24 * 60 * 60 * 1000,
    createdText: "just now",
    comments: [],
    createdIso: nowIso,
    reporterEmail: input.reporterEmail,
    requestFieldValues: input.requestFieldValues,
  };

  // Unshift so new records sort to the top of the queue — matches what real
  // JSM queues do by default (sort by created desc for new items).
  all.unshift(stored);
  await saveStore(all);
  return stored;
}

/**
 * Wipe the store and re-seed. Used by the `/api/__mock__/reset` utility
 * endpoint so SEs can start a fresh demo without waiting for a cold start.
 */
export async function resetStore(): Promise<StoredRequest[]> {
  const seeded = seedInitial();
  if (kvEnabled()) {
    await getRedis().set(STORE_KEY, seeded);
  } else {
    globalThis.__jsmQueueSmokeStore = seeded;
  }
  return seeded;
}

// ---- Envelope shaping ------------------------------------------------------

/**
 * Shape a stored request into the response envelope returned by JSM's real
 * POST /rest/servicedeskapi/request and GET /rest/servicedeskapi/request/{key}
 * endpoints. The envelope matches PLATFORMS/jira.md § API SURFACE > JSM.
 *
 * Pure function over a single record — no store access, stays synchronous.
 *
 * `baseUrl` is the scheme+host of the mock deployment. We use it to build
 * `_links.web` and `_links.self` plus the `_mockViewUrl` deep-link.
 */
export function shapeRequestForServiceDeskApi(
  r: StoredRequest,
  baseUrl: string,
  serviceDeskId: string,
): Record<string, unknown> {
  const portalUrl = `${baseUrl}/demos/jsm-queue-smoke/portal/requests/${r.key}`;
  return {
    _expands: [
      "participant",
      "status",
      "sla",
      "requestType",
      "serviceDesk",
      "attachment",
      "action",
      "comment",
    ],
    issueId: r.id,
    issueKey: r.key,
    requestTypeId: r.requestTypeId,
    serviceDeskId,
    createdDate: {
      iso8601: r.createdIso,
      jira: r.createdIso,
      friendly: r.createdText,
      epochMillis: new Date(r.createdIso).getTime(),
    },
    reporter: r.reporter
      ? {
          accountId: r.reporter.accountId,
          emailAddress: r.reporterEmail,
          displayName: r.reporter.displayName,
          active: true,
          timeZone: "America/New_York",
          _links: {
            jiraRest: `${baseUrl}/rest/api/3/user?accountId=${r.reporter.accountId}`,
          },
        }
      : null,
    requestFieldValues: [
      {
        fieldId: "summary",
        label: "Summary",
        value: r.summary,
      },
      {
        fieldId: "description",
        label: "Description",
        value: r.description,
      },
      ...Object.entries(r.requestFieldValues ?? {})
        .filter(([k]) => k !== "summary" && k !== "description")
        .map(([fieldId, value]) => ({
          fieldId,
          label: fieldId,
          value,
        })),
    ],
    currentStatus: {
      status: r.status.name,
      statusCategory: statusCategoryToJiraConst(r.status.category),
      statusDate: {
        iso8601: r.createdIso,
        jira: r.createdIso,
        friendly: r.createdText,
        epochMillis: new Date(r.createdIso).getTime(),
      },
    },
    _links: {
      jiraRest: `${baseUrl}/rest/api/3/issue/${r.key}`,
      self: `${baseUrl}/rest/servicedeskapi/request/${r.key}`,
      web: portalUrl,
      agent: `${baseUrl}/demos/jsm-queue-smoke?selected=${r.key}`,
    },
    // Non-standard extension for demo clickability. Real JSM does NOT return
    // this field — it exists so Elementum can template a URL back to the user
    // that actually opens something the customer can look at during the demo.
    // Document this in the README as a demo affordance, not a real field.
    _mockViewUrl: portalUrl,
  };
}

// ---- Utilities -------------------------------------------------------------

/** Generate the next `ITH-<n>` issue key by incrementing past the max seed. */
function nextRequestKey(existing: StoredRequest[]): string {
  const highest = existing.reduce<number>((max, r) => {
    const m = r.key.match(/^ITH-(\d+)$/);
    if (!m) return max;
    const n = parseInt(m[1], 10);
    return n > max ? n : max;
  }, 0);
  return `ITH-${highest + 1}`;
}

/** Generate the next numeric issue id. Real Jira ids are cloud-wide counters. */
function nextRequestId(existing: StoredRequest[]): string {
  const highest = existing.reduce<number>((max, r) => {
    const n = parseInt(r.id, 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 30100);
  return String(highest + 1);
}

/**
 * Resolve a reporter. If the email matches a seeded account we reuse it so
 * the queue doesn't explode with ghost users on every demo run. Otherwise
 * mint a new 24-char accountId and derive a name from the email local part.
 */
function reporterFromEmail(
  email: string | undefined,
  existing: StoredRequest[],
): { accountId: string; displayName: string } {
  if (email) {
    const match = existing.find(
      (r) => r.reporterEmail === email && r.reporter,
    );
    if (match?.reporter) {
      return {
        accountId: match.reporter.accountId,
        displayName: match.reporter.displayName,
      };
    }
    const local = email.split("@")[0] ?? "customer";
    const displayName = local
      .split(/[._-]+/)
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ") || local;
    return { accountId: randomAccountId(), displayName };
  }
  return { accountId: randomAccountId(), displayName: "Portal Customer" };
}

/** 24-char hex accountId, the shape real Atlassian accounts use. */
function randomAccountId(): string {
  const bytes = new Uint8Array(12);
  // `crypto` is global on Node 18+ and Edge runtime. Next.js polyfills it.
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Our seed uses lowercase StatusPill categories; JSM returns uppercase. */
function statusCategoryToJiraConst(
  c: "new" | "indeterminate" | "done",
): string {
  switch (c) {
    case "new":
      return "NEW";
    case "indeterminate":
      return "INDETERMINATE";
    case "done":
      return "DONE";
  }
}

function offsetFromNow(base: Date, deltaMs: number): Date {
  return new Date(base.getTime() + deltaMs);
}
