// Durable Purchase Requisition store for the sap-me5a-smoke mock.
//
// `_lib` is underscore-prefixed so Next.js does not route it. Pages and route
// handlers import from here, but no public URL resolves to it.
//
// Backing strategy mirrors jsm-queue-smoke / jira-software-smoke:
//   1. Vercel KV (Upstash Redis) when KV_* / UPSTASH_* env vars are set.
//      State survives cold starts and bridges across serverless function
//      instances — POSTing 0010001240 on one instance and the ME5A list page
//      rendering 0010001240 on another instance now agree.
//   2. globalThis fallback for `npm run dev` without KV provisioning.
//
// One key (`sap-me5a-smoke:prs:v1`) holds the full StoredPR[]. Read-modify-
// write is fine for demo workloads — one SE firing one automation at a time.
//
// OData v2 envelope shaping is in `shapePRForOData()` so route handlers can
// return a SAP-faithful `{d: {...}}` envelope without dragging chrome types
// into the API surface. Date strings, __metadata blocks, __deferred navs,
// and PurReqnReleaseStatus codes all originate here so behavior stays
// consistent between the list and single-entity endpoints.

import { Redis } from "@upstash/redis";
import { seedPRs, type PurchaseRequisition } from "../data/prs";
import type { SapPrStatus } from "../data/types";

// ---- Types ----------------------------------------------------------------

export type StoredPR = PurchaseRequisition & {
  /** ISO 8601 creation timestamp. Wire-format SAP responses convert this to
   *  `/Date(<ms>)/`. We keep an ISO copy because it round-trips cleanly through
   *  KV serialization and is what JavaScript expects. */
  createdIso: string;
  /** 4-char SAP Company Code. Not in the original seed (which only carried
   *  Plant + Purchasing Group), but real SAP requires it on PR header — we
   *  back-fill from the plant's parent company code at seed time and accept
   *  it on create. */
  companyCode: string;
};

const STORE_KEY = "sap-me5a-smoke:prs:v1";

/** Service identity used inside __metadata.type. Real SAP exposes a TYPE
 *  named `<service>.<entity>Type` so integration libraries can deserialize
 *  to typed objects. */
const SERVICE_NAMESPACE = "API_PURCHASEREQ_PROCESS_SRV";

/** Plant → Company Code mapping. Real customers configure this in T001K /
 *  T001W; for the smoke we only need a stable lookup so seed entries get a
 *  consistent Company Code. */
const PLANT_TO_COMPANY: Record<string, string> = {
  US01: "1000",
  US02: "1000",
  // Default for unknown plants — keeps create flows tolerant of typos.
  __default: "1000",
};

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
  var __sapMe5aSmokeStore: StoredPR[] | undefined;
}

// ---- Seed -----------------------------------------------------------------

function seedInitial(): StoredPR[] {
  // Deep-clone so mutations don't bleed back into the imported seeds.
  const cloned = JSON.parse(JSON.stringify(seedPRs)) as PurchaseRequisition[];
  const now = new Date();
  return cloned.map((pr, idx) => ({
    ...pr,
    // Stagger the seeds so created-recent shows newest-first ordering even
    // before any creates happen. 6h apart is plenty of resolution.
    createdIso: offsetFromNow(now, -(idx + 1) * 6 * 3600 * 1000).toISOString(),
    companyCode:
      PLANT_TO_COMPANY[pr.plant] ?? PLANT_TO_COMPANY.__default,
  }));
}

async function loadStore(): Promise<StoredPR[]> {
  if (kvEnabled()) {
    const existing = await getRedis().get<StoredPR[]>(STORE_KEY);
    if (existing && Array.isArray(existing) && existing.length > 0) {
      return existing;
    }
    const seeded = seedInitial();
    await getRedis().set(STORE_KEY, seeded);
    return seeded;
  }
  if (!globalThis.__sapMe5aSmokeStore) {
    globalThis.__sapMe5aSmokeStore = seedInitial();
  }
  return globalThis.__sapMe5aSmokeStore;
}

async function saveStore(prs: StoredPR[]): Promise<void> {
  if (kvEnabled()) {
    await getRedis().set(STORE_KEY, prs);
    return;
  }
  globalThis.__sapMe5aSmokeStore = prs;
}

// ---- Readers --------------------------------------------------------------

export async function listPRs(): Promise<StoredPR[]> {
  return loadStore();
}

export async function getPRByNumber(
  prNumber: string,
): Promise<StoredPR | undefined> {
  const all = await loadStore();
  return all.find((p) => p.prNumber === prNumber);
}

// ---- Writers --------------------------------------------------------------

export type CreatePRInput = {
  description: string;
  material: string;
  quantity: number;
  unit: string;
  deliveryDate: string; // DD.MM.YYYY
  plant: string;
  purchasingGroup: string;
  requester: string;
  netPrice: number;
  currency: PurchaseRequisition["currency"];
  /** Optional. Defaults to `OPEN` to mirror real SAP's "create lands in
   *  Not Released pending release strategy" behavior — see PLATFORMS/sap.md
   *  § COMMON SE SCENARIOS > Create Purchase Requisition. */
  status?: SapPrStatus;
  companyCode?: string;
};

export async function createPR(input: CreatePRInput): Promise<StoredPR> {
  const all = await loadStore();
  const prNumber = nextPrNumber(all);
  const now = new Date();
  const todayDdMmYyyy = formatDdMmYyyy(now);

  const stored: StoredPR = {
    prNumber,
    item: "00010",
    material: input.material,
    description: input.description,
    quantity: input.quantity,
    unit: input.unit,
    deliveryDate: input.deliveryDate,
    plant: input.plant,
    purchasingGroup: input.purchasingGroup,
    requester: input.requester.toUpperCase(),
    netPrice: input.netPrice,
    currency: input.currency,
    // Real SAP creates land in "Not Released" pending release strategy. Our
    // SapPrStatus → release-code mapping puts that at OPEN ("01"). SE can
    // override via `status` in the create body when demoing a custom flow.
    status: input.status ?? "OPEN",
    createdOn: todayDdMmYyyy,
    createdIso: now.toISOString(),
    companyCode:
      input.companyCode ??
      PLANT_TO_COMPANY[input.plant] ??
      PLANT_TO_COMPANY.__default,
  };

  // Newest-first matches what real SAP `$orderby=CreationDate desc` returns.
  all.unshift(stored);
  await saveStore(all);
  return stored;
}

/**
 * Wipe and re-seed. Used in test/demo reset flows.
 */
export async function resetStore(): Promise<StoredPR[]> {
  const seeded = seedInitial();
  if (kvEnabled()) {
    await getRedis().set(STORE_KEY, seeded);
  } else {
    globalThis.__sapMe5aSmokeStore = seeded;
  }
  return seeded;
}

// ---- OData v2 envelope shaping --------------------------------------------

/**
 * Shape a stored PR into the SAP OData v2 PurchaseRequisitionHeader entity.
 *
 * Pure function over a single record — no store access, no async.
 *
 * `baseUrl` is the scheme+host of the deployment. We use it inside the
 * `__metadata.id` / `__metadata.uri` fields and the `__deferred.uri` for
 * `to_PurchaseReqnItem`, plus the non-standard `_mockViewUrl` deep-link.
 *
 * Field naming follows real SAP conventions:
 *   prNumber          -> PurchaseRequisition (10-digit string)
 *   description       -> PurReqnDescription (header-level free text)
 *   requester         -> CreatedByUser (SAP user id, ALL-CAPS)
 *   createdIso        -> CreationDate (/Date(<ms>)/)
 *   status            -> PurReqnReleaseStatus (release code "01"-"05")
 *   purchasingGroup   -> PurchasingGroup (3-char)
 *   companyCode       -> CompanyCode (4-char)
 *
 * Item-level fields (Material, Quantity, Plant, NetPriceAmount,
 * DeliveryDate, etc.) live behind the `to_PurchaseReqnItem` navigation —
 * they don't appear here; integrations request them separately or via
 * `$expand`. The mock doesn't implement `$expand` (out of scope), but the
 * deferred URI and the items endpoint cover the common case.
 */
export function shapePRForOData(
  pr: StoredPR,
  baseUrl: string,
): Record<string, unknown> {
  const serviceRoot = `${baseUrl}/demos/sap-me5a-smoke/api/sap/opu/odata/sap/${SERVICE_NAMESPACE}`;
  const entityUri = `${serviceRoot}/PurchaseRequisitionHeader('${pr.prNumber}')`;
  const browseUrl = `${baseUrl}/demos/sap-me5a-smoke/me53n/${pr.prNumber}`;

  return {
    __metadata: {
      id: entityUri,
      uri: entityUri,
      type: `${SERVICE_NAMESPACE}.PurchaseRequisitionHeaderType`,
    },
    PurchaseRequisition: pr.prNumber,
    PurReqnDescription: pr.description,
    CreatedByUser: pr.requester,
    CreationDate: formatODataDate(pr.createdIso),
    PurReqnReleaseStatus: releaseStatusCode(pr.status),
    PurchasingGroup: pr.purchasingGroup,
    CompanyCode: pr.companyCode,
    // Items are deferred. Integrations follow the URL or use `$expand` —
    // PLATFORMS/sap.md § "Navigation properties" rule 3.
    to_PurchaseReqnItem: {
      __deferred: {
        uri: `${entityUri}/to_PurchaseReqnItem`,
      },
    },
    // Non-standard, demo-only. Real SAP does NOT include this. It's the
    // Slack/email-pasteable URL that opens the ME53N detail in the mock UI —
    // Elementum automations template it into chat replies.
    _mockViewUrl: browseUrl,
  };
}

/**
 * Shape a stored PR into a single PurchaseRequisitionItem entity. The smoke
 * carries one item per PR (item 00010), so this returns a single object.
 *
 * Field mapping:
 *   item            -> PurchaseRequisitionItem (5-digit "00010")
 *   material        -> Material
 *   description     -> PurchaseRequisitionItemText
 *   quantity        -> RequestedQuantity
 *   unit            -> BaseUnit
 *   plant           -> Plant
 *   netPrice        -> NetPriceAmount
 *   currency        -> NetPriceCurrency (also DocumentCurrency)
 *   deliveryDate    -> DeliveryDate (/Date(<ms>)/)
 *   purchasingGroup -> PurchasingGroup (denormalized from header)
 */
export function shapeItemForOData(
  pr: StoredPR,
  baseUrl: string,
): Record<string, unknown> {
  const serviceRoot = `${baseUrl}/demos/sap-me5a-smoke/api/sap/opu/odata/sap/${SERVICE_NAMESPACE}`;
  const itemKey = `(PurchaseRequisition='${pr.prNumber}',PurchaseRequisitionItem='${pr.item}')`;
  const itemUri = `${serviceRoot}/PurchaseRequisitionItem${itemKey}`;
  const headerUri = `${serviceRoot}/PurchaseRequisitionHeader('${pr.prNumber}')`;

  return {
    __metadata: {
      id: itemUri,
      uri: itemUri,
      type: `${SERVICE_NAMESPACE}.PurchaseRequisitionItemType`,
    },
    PurchaseRequisition: pr.prNumber,
    PurchaseRequisitionItem: pr.item,
    Material: pr.material,
    PurchaseRequisitionItemText: pr.description,
    RequestedQuantity: pr.quantity.toFixed(3),
    BaseUnit: pr.unit,
    Plant: pr.plant,
    NetPriceAmount: pr.netPrice.toFixed(2),
    NetPriceCurrency: pr.currency,
    DocumentCurrency: pr.currency,
    DeliveryDate: formatODataDate(deliveryDateToIso(pr.deliveryDate)),
    PurchasingGroup: pr.purchasingGroup,
    // Inverse navigation — every item references its header. Real SAP exposes
    // this so integrations can roundtrip from item back to header.
    to_PurchaseRequisitionHeader: {
      __deferred: { uri: headerUri },
    },
  };
}

/**
 * 201 Created body for `POST /PurchaseRequisitionHeader`. Real SAP returns
 * the persisted entity wrapped in the standard `{d: {...}}` envelope — this
 * is heavier than Jira's thin response, but it's the OData v2 contract and
 * is what integrations expect.
 */
export function shapeCreateResponse(
  pr: StoredPR,
  baseUrl: string,
): Record<string, unknown> {
  return { d: shapePRForOData(pr, baseUrl) };
}

/**
 * OData v2 error envelope. PLATFORMS/sap.md § "Error envelope" verbatim.
 * Real SAP error codes look like `MEPO/006`, `SY/530`, etc. — we use
 * domain-correct prefixes so integrations parsing on `error.code` recognize
 * the family.
 */
export function shapeError(
  code: string,
  message: string,
): Record<string, unknown> {
  return {
    error: {
      code,
      message: { lang: "en", value: message },
      innererror: {
        application: {
          component_id: "MM-PUR",
          service_namespace: "/SAP/",
          service_id: SERVICE_NAMESPACE,
        },
        // Fake transactionid kept stable across calls so log scraping in a
        // demo stays predictable.
        transactionid: "A1B2C3D4E5F6",
      },
    },
  };
}

// ---- Helpers --------------------------------------------------------------

/**
 * Generate the next 10-digit PR number, incrementing past the current max.
 * Real SAP allocates from the BANFN number range object via NRIV; for a
 * mock, monotonic-from-max is indistinguishable.
 */
function nextPrNumber(existing: StoredPR[]): string {
  const highest = existing.reduce<number>((max, p) => {
    const n = parseInt(p.prNumber, 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 10001233); // one less than the lowest seed (0010001234) so seeds + creates share the range
  return String(highest + 1).padStart(10, "0");
}

/**
 * Map our internal `SapPrStatus` enum to the SAP `PurReqnReleaseStatus`
 * release-code field. Real release strategies vary per customer; the codes
 * below are an invented-but-plausible mapping documented in the README.
 *
 *   OPEN        -> "01"  (Not Released — fresh PR pending approval)
 *   IN_PROCESS  -> "02"  (Partially Released — some approvers signed off)
 *   RELEASED    -> "03"  (Fully Released — ready for PO conversion)
 *   BLOCKED     -> "04"  (Blocked / Rejected)
 *   CLOSED      -> "05"  (Closed — converted or canceled)
 */
export function releaseStatusCode(s: SapPrStatus): string {
  switch (s) {
    case "OPEN":
      return "01";
    case "IN_PROCESS":
      return "02";
    case "RELEASED":
      return "03";
    case "BLOCKED":
      return "04";
    case "CLOSED":
      return "05";
  }
}

/**
 * Convert an ISO 8601 timestamp into the OData v2 `/Date(<ms>)/` token.
 * PLATFORMS/sap.md § HYGIENE > "Dates (OData v2)".
 */
export function formatODataDate(iso: string): string {
  const ms = new Date(iso).getTime();
  return `/Date(${ms})/`;
}

/**
 * Convert a DD.MM.YYYY display date into ISO 8601 at UTC midnight.
 * Used to feed `formatODataDate` for `DeliveryDate`. Lossy on time, which
 * matches real SAP — `EBAN-LFDAT` is a date-only field.
 */
function deliveryDateToIso(ddmmyyyy: string): string {
  const m = ddmmyyyy.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return new Date().toISOString();
  const [, dd, mm, yyyy] = m;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`).toISOString();
}

/**
 * Format a Date as DD.MM.YYYY for display fields like `EBAN-BADAT` (creation
 * date). Real SAP shows DD.MM.YYYY in the GUI on European locales; the mock
 * sticks to that to look right in screenshots.
 */
function formatDdMmYyyy(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function offsetFromNow(base: Date, deltaMs: number): Date {
  return new Date(base.getTime() + deltaMs);
}
