// Durable requisition store for the Amazon Business punchout smoke.
//
// Underscore-prefixed folder = Next.js does not route it.
//
// PERSISTENCE STRATEGY (mirrors jsm-queue-smoke/_lib/store.ts):
//   - When Vercel KV / Upstash env vars are present, requisitions persist to
//     a versioned Redis key. This is what makes the mock work on Vercel where
//     the cart-return POST and the buyer-system page render land on
//     different serverless function instances.
//   - When env vars are missing (local dev), we fall back to a globalThis
//     namespace so writes survive module re-evaluations within the same
//     process. POSTs reset between dev-server restarts in this mode.
//
// Design rationale:
//   - The "Amazon Business" punchout in real life ends with a cart-return
//     payload landing on the buyer system's BrowserFormPost URL. The buyer
//     system creates a requisition from that payload. Our mock plays both
//     halves: Amazon returns the cart, AND we host a fake "Procurement
//     Portal" that catches it. So the store records what was returned and
//     becomes the source of truth for the buyer-system surface.
//
// Versioned key (`...:requisitions:v1`) lets us evolve the seed shape later
// without dirtying old demos that share the same Upstash database.

import { Redis } from "@upstash/redis";

import seedRequisitions from "../data/requisitions";

export type RequisitionStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Ordered"
  | "Received";

export type RequisitionLineItem = {
  asin: string;
  title: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  lineTotal: number;
};

export type Submitter = {
  name: string;
  email: string;
  department: string;
};

export type StoredRequisition = {
  id: string; // 10-digit, "0010xxxxxx" — matches SAP-style PR id convention
  sessionId: string;
  buyerSystem: string;
  submittedAt: string; // ISO 8601
  status: RequisitionStatus;
  submitter: Submitter;
  items: RequisitionLineItem[];
  total: number;
  currency: string;
  itemCount: number;
  // The URL the procurement portal would surface as "view this PR" — built
  // at write time so the API response can hand it back to the cart-return
  // caller for chat-replyable deep linking.
  buyerSystemUrl: string;
};

// ---- KV plumbing -----------------------------------------------------------

const STORE_KEY = "amazon-punchout-smoke:requisitions:v1";

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
  var __amazonPunchoutRequisitions: StoredRequisition[] | undefined;
}

function seedInitial(): StoredRequisition[] {
  // Deep-clone so mutations don't bleed back into the imported JSON module.
  return JSON.parse(JSON.stringify(seedRequisitions)) as StoredRequisition[];
}

async function loadStore(): Promise<StoredRequisition[]> {
  if (kvEnabled()) {
    const existing =
      await getRedis().get<StoredRequisition[]>(STORE_KEY);
    if (existing && Array.isArray(existing) && existing.length > 0) {
      return existing;
    }
    const seeded = seedInitial();
    await getRedis().set(STORE_KEY, seeded);
    return seeded;
  }
  if (!globalThis.__amazonPunchoutRequisitions) {
    globalThis.__amazonPunchoutRequisitions = seedInitial();
  }
  return globalThis.__amazonPunchoutRequisitions;
}

async function saveStore(reqs: StoredRequisition[]): Promise<void> {
  if (kvEnabled()) {
    await getRedis().set(STORE_KEY, reqs);
    return;
  }
  globalThis.__amazonPunchoutRequisitions = reqs;
}

// ---- Public API ------------------------------------------------------------

export async function listRequisitions(): Promise<StoredRequisition[]> {
  return loadStore();
}

export async function getRequisition(
  id: string,
): Promise<StoredRequisition | undefined> {
  const all = await loadStore();
  return all.find((r) => r.id === id);
}

export type CreateRequisitionInput = {
  sessionId: string;
  buyerSystem: string;
  items: Array<{
    asin: string;
    title: string;
    quantity: number;
    unitPrice: number;
    currency: string;
  }>;
  // Submitter is optional in the input — punchout cart-return doesn't carry
  // user details directly. We default to a stable demo persona so seed +
  // newly-created PRs are visually consistent in the buyer-system view.
  submitter?: Submitter;
};

export async function createRequisition(
  input: CreateRequisitionInput,
): Promise<StoredRequisition> {
  const all = await loadStore();
  const id = nextRequisitionId(all);

  const items: RequisitionLineItem[] = input.items.map((i) => ({
    asin: i.asin,
    title: i.title,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    currency: i.currency,
    lineTotal: round2(i.unitPrice * i.quantity),
  }));

  const total = round2(items.reduce((acc, i) => acc + i.lineTotal, 0));
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);
  const currency = items[0]?.currency ?? "USD";

  const submitter: Submitter =
    input.submitter ?? {
      name: "Sam Reeves",
      email: "sam.reeves@acme.example",
      department: "Procurement",
    };

  const rec: StoredRequisition = {
    id,
    sessionId: input.sessionId,
    buyerSystem: input.buyerSystem,
    submittedAt: new Date().toISOString(),
    status: "Pending Approval", // newly-returned carts always need approval
    submitter,
    items,
    total,
    currency,
    itemCount,
    buyerSystemUrl: `/demos/amazon-punchout-smoke/buyer-system/requisitions/${id}`,
  };

  // Newest first — matches what a procurement portal would surface.
  all.unshift(rec);
  await saveStore(all);
  return rec;
}

export async function resetStore(): Promise<StoredRequisition[]> {
  const fresh = seedInitial();
  await saveStore(fresh);
  return fresh;
}

// ---- helpers ---------------------------------------------------------------

function nextRequisitionId(existing: StoredRequisition[]): string {
  // Format: 10 digits, leading "0010" + 6 digits. Mirrors the original
  // cart-return route's id shape for back-compat.
  const used = new Set(existing.map((r) => r.id));
  // Iterate until we find a free id. Worst case linear over the (small)
  // existing set — fine for demo workloads.
  while (true) {
    const id = `0010${String(
      Math.floor(Math.random() * 900000) + 100000,
    )}`;
    if (!used.has(id)) return id;
  }
}

function round2(n: number): number {
  return Number(n.toFixed(2));
}
