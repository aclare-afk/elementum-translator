// In-memory JSM-ish store for the jsm-queue-smoke mock.
//
// `_lib` is underscore-prefixed so Next.js does not route it — pages and route
// handlers import from here, but there is no public URL that resolves to it.
//
// State lives on globalThis so mutations from POST /rest/servicedeskapi/request
// are visible to the SSR queue page and portal `My Requests` list within the
// same warm function instance. Cold starts re-seed from `data/requests.ts` —
// that's intentional: a fresh demo session should see the same seeds every
// time, and state never leaks between customer demos.
//
// IMPORTANT: Vercel serverless splits different API endpoints into different
// function instances. globalThis works across warm invocations of the SAME
// function, not across different routes. For a demo where one automation
// creates a request and the SE immediately clicks through to the mock UI, the
// hot-path hits the same render function and this works. For a durable flow,
// swap this module for a KV-backed implementation (see the `ui/featured-demo`
// follow-up PR for the KV helper pattern).

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

type Store = {
  requests: StoredRequest[];
};

// Namespace on globalThis so multiple mocks in the same deploy don't collide.
declare global {
  // eslint-disable-next-line no-var
  var __jsmQueueSmokeStore: Store | undefined;
}

function getStore(): Store {
  if (!globalThis.__jsmQueueSmokeStore) {
    // Deep clone so mutations don't bleed into the imported seeds.
    const cloned = JSON.parse(JSON.stringify(seedRequests)) as RequestSeed[];
    const now = new Date();
    const seeded: StoredRequest[] = cloned.map((r, idx) => ({
      ...r,
      // Synthesize plausible created timestamps for seeds so the GET response
      // has a real ISO 8601 value to return (real JSM never returns
      // human-relative strings like "3h ago" — that's UI-only).
      createdIso: offsetFromNow(now, -idx * 3600 * 1000).toISOString(),
    }));
    globalThis.__jsmQueueSmokeStore = { requests: seeded };
  }
  return globalThis.__jsmQueueSmokeStore;
}

// ---- Readers ---------------------------------------------------------------

export function listRequests(): StoredRequest[] {
  return getStore().requests;
}

export function getRequestByKey(key: string): StoredRequest | undefined {
  return getStore().requests.find((r) => r.key === key);
}

export function getRequestById(id: string): StoredRequest | undefined {
  return getStore().requests.find((r) => r.id === id);
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

export function createRequest(input: CreateRequestInput): StoredRequest {
  const store = getStore();

  const key = nextRequestKey(store.requests);
  const id = nextRequestId(store.requests);
  const nowIso = new Date().toISOString();

  // Derive a reporter account. If the Elementum automation passes a known
  // seed email via raiseOnBehalfOf, reuse that account; otherwise mint a
  // fresh opaque accountId and use the email local part as the display name.
  const reporter = reporterFromEmail(input.reporterEmail, store.requests);

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
  store.requests.unshift(stored);
  return stored;
}

// ---- Envelope shaping ------------------------------------------------------

/**
 * Shape a stored request into the response envelope returned by JSM's real
 * POST /rest/servicedeskapi/request and GET /rest/servicedeskapi/request/{key}
 * endpoints. The envelope matches PLATFORMS/jira.md § API SURFACE > JSM.
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
