// Durable Jira Software issue store for the jira-software-smoke mock.
//
// `_lib` is underscore-prefixed so Next.js does not route it. Pages and route
// handlers import from here, but no public URL resolves to it.
//
// Backing strategy mirrors jsm-queue-smoke/_lib/store.ts:
//   1. Vercel KV (Upstash Redis) when KV_* / UPSTASH_* env vars are set.
//      State survives cold starts and bridges across serverless function
//      instances — POST that creates WEB-148 on one instance and the board
//      page rendering WEB-148 on another instance now agree.
//   2. globalThis fallback for `npm run dev` without KV provisioning.
//
// One key (`jira-software-smoke:issues:v1`) holds the full StoredIssue[].
// Read-modify-write is fine for demo workloads — one SE firing one
// automation at a time.
//
// Real Jira REST envelope shaping is in `shapeIssueForRest()` so route
// handlers can return a Jira-faithful envelope without dragging the chrome
// types into the API surface.

import { Redis } from "@upstash/redis";
import {
  seedIssues,
  boardColumns,
  epics,
  type BoardSeedIssue,
} from "../data/issues";
import type { JiraStatusCategory } from "@/components/platforms/jira-shared";

// ---- Types ----------------------------------------------------------------

export type StoredIssue = BoardSeedIssue & {
  /** ISO 8601 creation timestamp. Real Jira returns this as `fields.created`. */
  createdIso: string;
  /** ISO 8601 last-update timestamp. Mirrors `fields.updated`. */
  updatedIso: string;
  /** Project key — denormalized off `key` so creates can use any project. */
  projectKey: string;
  /** Free-form labels carried via `fields.labels`. */
  labels?: string[];
};

const STORE_KEY = "jira-software-smoke:issues:v1";

// Project metadata used when shaping the REST response. Real Jira projects
// have a numeric `id`; for the smoke we hard-code one matching the seed.
const PROJECT = {
  id: "10000",
  key: "WEB",
  name: "Acme Web Platform",
  projectTypeKey: "software",
} as const;

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
  var __jiraSoftwareSmokeStore: StoredIssue[] | undefined;
}

// ---- Seed -----------------------------------------------------------------

function seedInitial(): StoredIssue[] {
  // Deep-clone so mutations don't bleed back into the imported seeds.
  const cloned = JSON.parse(JSON.stringify(seedIssues)) as BoardSeedIssue[];
  const now = new Date();
  return cloned.map((i, idx) => ({
    ...i,
    createdIso: offsetFromNow(now, -(idx + 1) * 6 * 3600 * 1000).toISOString(),
    updatedIso: offsetFromNow(now, -(idx + 1) * 1 * 3600 * 1000).toISOString(),
    projectKey: i.key.split("-")[0] ?? "WEB",
    labels: [],
  }));
}

async function loadStore(): Promise<StoredIssue[]> {
  if (kvEnabled()) {
    const existing = await getRedis().get<StoredIssue[]>(STORE_KEY);
    if (existing && Array.isArray(existing) && existing.length > 0) {
      return existing;
    }
    const seeded = seedInitial();
    await getRedis().set(STORE_KEY, seeded);
    return seeded;
  }
  if (!globalThis.__jiraSoftwareSmokeStore) {
    globalThis.__jiraSoftwareSmokeStore = seedInitial();
  }
  return globalThis.__jiraSoftwareSmokeStore;
}

async function saveStore(issues: StoredIssue[]): Promise<void> {
  if (kvEnabled()) {
    await getRedis().set(STORE_KEY, issues);
    return;
  }
  globalThis.__jiraSoftwareSmokeStore = issues;
}

// ---- Readers --------------------------------------------------------------

export async function listIssues(): Promise<StoredIssue[]> {
  return loadStore();
}

export async function getIssueByKey(
  key: string,
): Promise<StoredIssue | undefined> {
  const all = await loadStore();
  return all.find((i) => i.key === key);
}

export async function getIssueById(
  id: string,
): Promise<StoredIssue | undefined> {
  const all = await loadStore();
  return all.find((i) => i.id === id);
}

// ---- Writers --------------------------------------------------------------

export type CreateIssueInput = {
  projectKey: string;
  issueType: BoardSeedIssue["issueType"];
  summary: string;
  description?: string;
  priority?: BoardSeedIssue["priority"];
  assignee?: { accountId: string; displayName: string };
  reporter?: { accountId: string; displayName: string };
  storyPoints?: number;
  labels?: string[];
};

export async function createIssue(
  input: CreateIssueInput,
): Promise<StoredIssue> {
  const all = await loadStore();

  const key = nextIssueKey(all, input.projectKey);
  const id = nextIssueId(all);
  const nowIso = new Date().toISOString();

  // New issues default to the leftmost (To Do / new) column. Real Jira honors
  // the project's workflow's "create" transition target — for the smoke,
  // landing in the leftmost column matches what almost every Jira project
  // does out of the box.
  const initialColumn = boardColumns[0];

  // Reporter falls back to a stable demo persona so chat output reads
  // naturally even when the create call doesn't pass one.
  const reporter =
    input.reporter ?? {
      accountId: "5b10a2844c20165700ede301",
      displayName: "Jane Davis",
    };

  const stored: StoredIssue = {
    id,
    key,
    columnId: initialColumn.id,
    statusName: initialColumn.name,
    summary: input.summary,
    description:
      input.description ??
      "Created via the mock REST API; no description supplied.",
    issueType: input.issueType,
    priority: input.priority ?? "Medium",
    storyPoints: input.storyPoints,
    epicColor: undefined,
    epicKey: undefined,
    assignee: input.assignee,
    reporter,
    createdText: "just now",
    updatedText: "just now",
    createdIso: nowIso,
    updatedIso: nowIso,
    projectKey: input.projectKey,
    labels: input.labels ?? [],
  };

  // Newest-first matches the way Jira's "Recently created" filter renders.
  all.unshift(stored);
  await saveStore(all);
  return stored;
}

/**
 * Wipe and re-seed. Used in test/demo reset flows.
 */
export async function resetStore(): Promise<StoredIssue[]> {
  const seeded = seedInitial();
  if (kvEnabled()) {
    await getRedis().set(STORE_KEY, seeded);
  } else {
    globalThis.__jiraSoftwareSmokeStore = seeded;
  }
  return seeded;
}

// ---- Envelope shaping -----------------------------------------------------

/**
 * Shape a stored issue into the response envelope returned by real Jira's
 * `GET /rest/api/3/issue/{idOrKey}` and `GET /rest/api/3/search` endpoints.
 *
 * Pure function over a single record — no store access, no async.
 *
 * `baseUrl` is the scheme+host of the deployment. We use it to build
 * `self`, `_links.web` (the share-link `/browse/{key}` URL), and the
 * non-standard `_mockViewUrl` deep-link.
 */
export function shapeIssueForRest(
  i: StoredIssue,
  baseUrl: string,
): Record<string, unknown> {
  const browseUrl = `${baseUrl}/demos/jira-software-smoke/browse/${i.key}`;
  const column = boardColumns.find((c) => c.id === i.columnId);
  const epic = i.epicKey
    ? Object.values(epics).find((e) => e.key === i.epicKey)
    : undefined;

  return {
    id: i.id,
    key: i.key,
    self: `${baseUrl}/rest/api/3/issue/${i.id}`,
    fields: {
      summary: i.summary,
      // Real Jira returns ADF for `description`. Wrap the plain string so
      // clients that expect ADF (most Jira REST consumers) parse cleanly.
      description: adfFromPlain(i.description),
      issuetype: {
        id: issueTypeId(i.issueType),
        name: i.issueType,
        iconUrl: `${baseUrl}/icons/issuetype-${i.issueType.toLowerCase().replace(/\s+/g, "-")}.png`,
        subtask: i.issueType === "Subtask",
      },
      project: {
        id: PROJECT.id,
        key: PROJECT.key,
        name: PROJECT.name,
        projectTypeKey: PROJECT.projectTypeKey,
        self: `${baseUrl}/rest/api/3/project/${PROJECT.id}`,
      },
      status: {
        id: columnIdToStatusId(i.columnId),
        name: i.statusName,
        statusCategory: {
          id: statusCategoryId(column?.category ?? "new"),
          key: column?.category ?? "new",
          name: statusCategoryLabel(column?.category ?? "new"),
          colorName: statusCategoryColor(column?.category ?? "new"),
        },
        self: `${baseUrl}/rest/api/3/status/${columnIdToStatusId(i.columnId)}`,
      },
      priority: {
        id: priorityId(i.priority),
        name: i.priority,
        iconUrl: `${baseUrl}/icons/priority-${i.priority.toLowerCase()}.png`,
      },
      assignee: i.assignee
        ? {
            accountId: i.assignee.accountId,
            displayName: i.assignee.displayName,
            active: true,
            timeZone: "America/New_York",
            self: `${baseUrl}/rest/api/3/user?accountId=${i.assignee.accountId}`,
          }
        : null,
      reporter: i.reporter
        ? {
            accountId: i.reporter.accountId,
            displayName: i.reporter.displayName,
            active: true,
            timeZone: "America/New_York",
            self: `${baseUrl}/rest/api/3/user?accountId=${i.reporter.accountId}`,
          }
        : null,
      created: i.createdIso,
      updated: i.updatedIso,
      labels: i.labels ?? [],
      components: [],
      // Story points live on customfield_10016 in real Jira. Echo here so
      // downstream automations that read this exact custom field see it.
      customfield_10016: i.storyPoints ?? null,
      // Epic link (Jira's classic name was customfield_10014; "next-gen" /
      // "Jira Cloud" projects expose it as `parent` for issuetype-of-Epic
      // hierarchy). We surface both for fidelity.
      customfield_10014: epic?.key ?? null,
      parent: epic
        ? {
            id: "epic",
            key: epic.key,
            fields: {
              summary: epic.name,
              issuetype: { name: "Epic" },
            },
          }
        : null,
    },
    // Non-standard, demo-only. Real Jira does NOT include this. It's the
    // Slack/email-pasteable URL that opens the issue detail page in the mock
    // UI — Elementum automations template it into chat replies.
    _mockViewUrl: browseUrl,
    _links: {
      web: browseUrl,
      self: `${baseUrl}/rest/api/3/issue/${i.id}`,
      board: `${baseUrl}/demos/jira-software-smoke?selected=${i.key}`,
    },
  };
}

/**
 * Minimal create-response shape — real Jira's `POST /rest/api/3/issue`
 * returns just `{ id, key, self }` (the 201 Created body is intentionally
 * thin so clients that need the full record GET it back). We add
 * `_mockViewUrl` for chat-replyable deep linking.
 */
export function shapeCreateResponse(
  i: StoredIssue,
  baseUrl: string,
): Record<string, unknown> {
  return {
    id: i.id,
    key: i.key,
    self: `${baseUrl}/rest/api/3/issue/${i.id}`,
    _mockViewUrl: `${baseUrl}/demos/jira-software-smoke/browse/${i.key}`,
  };
}

// ---- Helpers --------------------------------------------------------------

/** Generate the next `<PROJECT>-<n>` issue key. Increments past the max seed. */
function nextIssueKey(existing: StoredIssue[], projectKey: string): string {
  const re = new RegExp(`^${projectKey}-(\\d+)$`);
  const highest = existing.reduce<number>((max, i) => {
    const m = i.key.match(re);
    if (!m) return max;
    const n = parseInt(m[1], 10);
    return n > max ? n : max;
  }, 0);
  return `${projectKey}-${highest + 1}`;
}

/** Generate the next numeric issue id. Real Jira ids are cloud-wide counters. */
function nextIssueId(existing: StoredIssue[]): string {
  const highest = existing.reduce<number>((max, i) => {
    const n = parseInt(i.id, 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 10100);
  return String(highest + 1);
}

/** Seed-stable mapping from columnId to a synthetic Jira status id. */
function columnIdToStatusId(columnId: string): string {
  switch (columnId) {
    case "col-todo":
      return "10001";
    case "col-inprogress":
      return "10002";
    case "col-review":
      return "10003";
    case "col-done":
      return "10004";
    default:
      return "10000";
  }
}

function issueTypeId(t: BoardSeedIssue["issueType"]): string {
  switch (t) {
    case "Story":
      return "10001";
    case "Task":
      return "10002";
    case "Bug":
      return "10003";
    case "Epic":
      return "10004";
    case "Subtask":
      return "10005";
    case "Service Request":
      return "10006";
    case "Incident":
      return "10007";
  }
}

function priorityId(p: BoardSeedIssue["priority"]): string {
  switch (p) {
    case "Highest":
      return "1";
    case "High":
      return "2";
    case "Medium":
      return "3";
    case "Low":
      return "4";
    case "Lowest":
      return "5";
  }
}

function statusCategoryId(c: JiraStatusCategory): number {
  switch (c) {
    case "new":
      return 2;
    case "indeterminate":
      return 4;
    case "done":
      return 3;
  }
}

function statusCategoryLabel(c: JiraStatusCategory): string {
  switch (c) {
    case "new":
      return "To Do";
    case "indeterminate":
      return "In Progress";
    case "done":
      return "Done";
  }
}

function statusCategoryColor(c: JiraStatusCategory): string {
  // Real Jira colorNames are the small set Atlassian publishes.
  switch (c) {
    case "new":
      return "blue-gray";
    case "indeterminate":
      return "yellow";
    case "done":
      return "green";
  }
}

/**
 * Wrap a plain-string description in a minimal Atlassian Document Format
 * (ADF) doc. ADF is what real Jira REST returns for `fields.description`.
 * Real ADF supports headings, lists, mentions, code blocks, etc. — for the
 * smoke we always emit a single paragraph wrapping the plain text, which is
 * what most LLM-generated Jira descriptions look like in practice.
 */
function adfFromPlain(text: string): Record<string, unknown> {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

function offsetFromNow(base: Date, deltaMs: number): Date {
  return new Date(base.getTime() + deltaMs);
}
