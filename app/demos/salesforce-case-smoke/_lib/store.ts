// Durable Case store for the salesforce-case-smoke mock.
//
// `_lib` is underscore-prefixed so Next.js does not route it. Pages and route
// handlers import from here, but no public URL resolves to it.
//
// Backing strategy mirrors the other smoke mocks:
//   1. Vercel KV (Upstash Redis) when KV_* / UPSTASH_* env vars are set —
//      state survives cold starts and bridges across serverless function
//      instances. POSTing to one instance and the Service Console list page
//      rendering on another instance now agree.
//   2. globalThis fallback for `npm run dev` without KV provisioning.
//
// One key (`salesforce-case-smoke:cases:v1`) holds the full SalesforceCase[].
// Read-modify-write is fine for demo workloads — one SE firing one
// automation at a time.
//
// Salesforce REST envelope shaping is in `shapeCaseForApi()` so route
// handlers can return the exact `attributes`/`Id`/field shape that
// integrations expect, without dragging chrome types into the API surface.
// IDs, key prefixes, CaseNumber assignment, and the ISO date format all
// originate here so behavior stays consistent between the sObject endpoint
// and the SOQL query endpoint.

import { Redis } from "@upstash/redis";
import { seedCases } from "../data/cases";
import type {
  SalesforceCase,
  CaseOrigin,
  CasePriority,
  CaseReason,
  SalesforceCaseStatus,
} from "../data/types";

// ---- Constants ------------------------------------------------------------

const STORE_KEY = "salesforce-case-smoke:cases:v1";

/** Salesforce REST API version pinned for this mock. Real orgs ship three
 *  versions per year (Spring/Summer/Winter); pinning to a stable version
 *  is industry-standard practice for integrations. v63.0 maps to Winter '25
 *  per § API SURFACE in PLATFORMS/salesforce.md. */
export const API_VERSION = "v63.0";

/** sObject name. Capitalized, no `__c` suffix — Case is a standard object. */
const SOBJECT_NAME = "Case";

/** Case key prefix (first 3 chars of every Case Id). § HYGIENE > Key prefixes. */
const CASE_KEY_PREFIX = "500";

/** Counter seed used by `nextCaseId()`. Real orgs allocate IDs from the
 *  platform's central pool; the mock just bumps a stable suffix counter so
 *  IDs stay sequential and case-safe. Must stay above the highest seed
 *  suffix or new IDs will collide. */
const ID_COUNTER_BASE = 7; // seeds use suffixes 1..6

// ---- KV plumbing ----------------------------------------------------------

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

declare global {
  // eslint-disable-next-line no-var
  var __salesforceCaseSmokeStore: SalesforceCase[] | undefined;
}

// ---- Seed -----------------------------------------------------------------

function seedInitial(): SalesforceCase[] {
  // Deep-clone so mutations don't bleed back into the imported seeds.
  return JSON.parse(JSON.stringify(seedCases)) as SalesforceCase[];
}

async function loadStore(): Promise<SalesforceCase[]> {
  if (kvEnabled()) {
    const existing = await getRedis().get<SalesforceCase[]>(STORE_KEY);
    if (existing && Array.isArray(existing) && existing.length > 0) {
      return existing;
    }
    const seeded = seedInitial();
    await getRedis().set(STORE_KEY, seeded);
    return seeded;
  }
  if (!globalThis.__salesforceCaseSmokeStore) {
    globalThis.__salesforceCaseSmokeStore = seedInitial();
  }
  return globalThis.__salesforceCaseSmokeStore;
}

async function saveStore(cases: SalesforceCase[]): Promise<void> {
  if (kvEnabled()) {
    await getRedis().set(STORE_KEY, cases);
    return;
  }
  globalThis.__salesforceCaseSmokeStore = cases;
}

// ---- Readers --------------------------------------------------------------

export async function listCases(): Promise<SalesforceCase[]> {
  return loadStore();
}

/**
 * Retrieve a Case by Id. Salesforce APIs accept either a 15-char or 18-char
 * Id and return the 18-char form everywhere. We normalize the lookup so
 * either form resolves to the stored 18-char record.
 */
export async function getCaseById(
  id: string,
): Promise<SalesforceCase | undefined> {
  const all = await loadStore();
  const target = id.slice(0, 15);
  return all.find((c) => c.Id.slice(0, 15) === target);
}

/** Find a Case by its display CaseNumber, e.g., "00001045". Useful for
 *  customer-friendly URLs even though the API uses Ids. */
export async function getCaseByNumber(
  caseNumber: string,
): Promise<SalesforceCase | undefined> {
  const all = await loadStore();
  return all.find((c) => c.CaseNumber === caseNumber);
}

// ---- Writers --------------------------------------------------------------

export type CreateCaseInput = {
  Subject: string;
  Description?: string;
  Status?: SalesforceCaseStatus;
  Priority?: CasePriority;
  Origin?: CaseOrigin;
  Reason?: CaseReason;
  AccountId?: string;
  AccountName?: string;
  ContactId?: string;
  ContactName?: string;
  ContactEmail?: string;
  OwnerId?: string;
  OwnerName?: string;
};

export async function createCase(
  input: CreateCaseInput,
): Promise<SalesforceCase> {
  const all = await loadStore();
  const now = new Date();
  const status = input.Status ?? "New";

  const created: SalesforceCase = {
    Id: nextCaseId(all),
    CaseNumber: nextCaseNumber(all),
    Subject: input.Subject,
    Description: input.Description ?? "",
    Status: status,
    Priority: input.Priority ?? "Medium",
    Origin: input.Origin ?? "Web",
    Reason: input.Reason,
    AccountId: input.AccountId,
    AccountName: input.AccountName,
    ContactId: input.ContactId,
    ContactName: input.ContactName,
    ContactEmail: input.ContactEmail,
    // Owner is non-null in real Salesforce. If the integrator didn't pass
    // one, default to a stable "API User" so the record is well-formed.
    OwnerId: input.OwnerId ?? "0055g00000QAPI001AAJ",
    OwnerName: input.OwnerName ?? "API User",
    IsClosed: status === "Closed",
    CreatedDate: formatSalesforceDate(now),
    LastModifiedDate: formatSalesforceDate(now),
  };

  // Newest-first matches what Salesforce list views show by default
  // ("Recently Viewed" + "All Cases" sort by LastModifiedDate desc).
  all.unshift(created);
  await saveStore(all);
  return created;
}

/**
 * Wipe and re-seed. Used in test/demo reset flows.
 */
export async function resetStore(): Promise<SalesforceCase[]> {
  const seeded = seedInitial();
  if (kvEnabled()) {
    await getRedis().set(STORE_KEY, seeded);
  } else {
    globalThis.__salesforceCaseSmokeStore = seeded;
  }
  return seeded;
}

// ---- REST envelope shaping ------------------------------------------------

/**
 * Salesforce sObject REST response shape — every record carries an
 * `attributes` block with `type` (the sObject API name) and `url` (the
 * canonical retrieve URL). Real Salesforce includes EVERY field on the
 * response unless the request specified a `fields=` filter; the smoke does
 * the same — we always emit the full set.
 *
 * `baseUrl` is the scheme+host of the deployment. We use it for the
 * non-standard `_mockViewUrl` deep-link only — the `attributes.url` path is
 * always the real Salesforce-shaped relative URL so integrations parsing it
 * with naive `path.join("/services/...")` logic still work.
 *
 * Date format: ISO 8601 with millisecond precision and a trailing `+0000`
 * UTC offset, exactly per § HYGIENE > Dates.
 */
export function shapeCaseForApi(
  c: SalesforceCase,
  baseUrl: string,
): Record<string, unknown> {
  const attributesUrl = `/services/data/${API_VERSION}/sobjects/${SOBJECT_NAME}/${c.Id}`;
  const browseUrl = `${baseUrl}/demos/salesforce-case-smoke/lightning/r/Case/${c.Id}/view`;

  return {
    attributes: {
      type: SOBJECT_NAME,
      url: attributesUrl,
    },
    Id: c.Id,
    CaseNumber: c.CaseNumber,
    Subject: c.Subject,
    Description: c.Description,
    Status: c.Status,
    Priority: c.Priority,
    Origin: c.Origin,
    Reason: c.Reason ?? null,
    AccountId: c.AccountId ?? null,
    ContactId: c.ContactId ?? null,
    OwnerId: c.OwnerId,
    IsClosed: c.IsClosed,
    CreatedDate: c.CreatedDate,
    LastModifiedDate: c.LastModifiedDate,
    SystemModstamp: c.LastModifiedDate,
    // Non-standard, demo-only. Real Salesforce does NOT include this. It's
    // the Slack/email-pasteable URL that opens the Case record page in the
    // mock UI — Elementum automations template it into chat replies.
    _mockViewUrl: browseUrl,
  };
}

/**
 * 201 Created body for `POST /sobjects/Case`. Real Salesforce returns a
 * minimal envelope with `id`, `success`, and `errors` — NOT the full
 * record. Integrations must follow up with a GET if they want the persisted
 * fields. This matches that contract exactly.
 *
 * Reference: § API SURFACE > sObject REST endpoints.
 */
export function shapeCreateResponse(
  c: SalesforceCase,
): Record<string, unknown> {
  return {
    id: c.Id,
    success: true,
    errors: [],
  };
}

/**
 * SOQL query response envelope. § API SURFACE > SOQL query endpoint.
 * `done: true` means the result set fits in this response — no
 * `nextRecordsUrl`. The smoke doesn't paginate (cap is 6 + however many
 * the SE creates), so done is always true.
 */
export function shapeQueryResponse(
  cases: SalesforceCase[],
  baseUrl: string,
): Record<string, unknown> {
  return {
    totalSize: cases.length,
    done: true,
    records: cases.map((c) => shapeCaseForApi(c, baseUrl)),
  };
}

/**
 * Salesforce error envelope. § API SURFACE > Error envelope. Always an
 * array (even with one element) — that surprises first-time integrators
 * but is the universal contract.
 *
 * Common errorCode values: REQUIRED_FIELD_MISSING, INVALID_FIELD,
 * MALFORMED_QUERY, INSUFFICIENT_ACCESS_OR_READONLY, NOT_FOUND.
 */
export function shapeError(
  errorCode: string,
  message: string,
  fields?: string[],
): Record<string, unknown>[] {
  const out: Record<string, unknown> = {
    message,
    errorCode,
  };
  if (fields && fields.length > 0) {
    out.fields = fields;
  }
  return [out];
}

// ---- Helpers --------------------------------------------------------------

/**
 * Generate the next 18-char Case Id. Real Salesforce generates IDs from a
 * platform-wide counter and adds a 3-char case-safe checksum. Deriving the
 * real checksum is fiddly (it encodes the case pattern of the 15-char
 * portion); for a mock, a stable 3-char suffix that LOOKS like the real
 * checksum (uppercase alphanumeric) is sufficient. We use "AAJ" everywhere
 * because that's what the seeds use, so seed Ids and minted Ids stay
 * visually consistent.
 *
 * Format: `500` + `5g00000` + `<padded counter>` + `AAJ` = 18 chars total.
 */
function nextCaseId(existing: SalesforceCase[]): string {
  // Find the highest counter suffix used so far. Seeds embed numbers 1..6;
  // newly created Cases push it monotonically.
  const highest = existing.reduce<number>((max, c) => {
    const m = c.Id.match(/K9aP(\d+)/);
    if (!m) return max;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, ID_COUNTER_BASE - 1);
  const next = highest + 1;
  return `${CASE_KEY_PREFIX}5g00000K9aP${next}AAJ`.padEnd(18, "A").slice(0, 18);
}

/**
 * Generate the next CaseNumber. Real Salesforce auto-numbers via the
 * standard CaseNumber field (configurable per-org but defaults to 8-digit
 * leading-zero). Seeds run from 00001036 to 00001045; new ones increment.
 */
function nextCaseNumber(existing: SalesforceCase[]): string {
  const highest = existing.reduce<number>((max, c) => {
    const n = parseInt(c.CaseNumber, 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 1045);
  return String(highest + 1).padStart(8, "0");
}

/**
 * Format a Date as Salesforce wire format: `2026-04-22T09:45:30.000+0000`.
 * Real Salesforce always uses UTC `+0000` (no colon) on responses; mocks
 * emit the same so naive ISO parsers in integration code (which often
 * choke on a colon-less offset) behave identically.
 */
function formatSalesforceDate(d: Date): string {
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const pad3 = (n: number) => String(n).padStart(3, "0");
  return (
    `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}` +
    `.${pad3(d.getUTCMilliseconds())}+0000`
  );
}
