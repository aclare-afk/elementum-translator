// POST /rest/api/3/issue        — create a Jira issue.
// GET  /rest/api/3/issue        — non-standard convenience: list / filter
//                                  issues. Real Jira does this via /search
//                                  with JQL, but a JQL parser is way out of
//                                  scope for a smoke. The query-param flavor
//                                  here keeps the demo URLs short.
//
// URL path mirrors the real Jira Cloud REST API exactly
// (PLATFORMS/jira.md § Issue — the core endpoints). Elementum automations
// point an `api_task` at this URL with the same body shape they would send
// to a real tenant and get back the same response envelope. One non-standard
// extension: a top-level `_mockViewUrl` field pointing into the mock UI so
// demo messages can link the user somewhere clickable.
//
// Auth note: real Jira requires Basic + API token, OAuth 2.0 (3LO), Forge
// JWT, or Connect HS256 JWT. The mock accepts any Authorization header (or
// none) so SEs can demo without provisioning creds.

import { NextRequest, NextResponse } from "next/server";
import {
  createIssue,
  listIssues,
  shapeCreateResponse,
  shapeIssueForRest,
  type CreateIssueInput,
} from "../../../../../_lib/store";
import type { BoardSeedIssue } from "../../../../../data/issues";

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

/**
 * Jira REST error envelope.
 * Real shape: `{ errorMessages: string[], errors: Record<string,string> }`,
 * mirroring PLATFORMS/jira.md § Error envelope.
 */
function jiraError(
  status: number,
  errorMessages: string[],
  errors: Record<string, string> = {},
) {
  return NextResponse.json({ errorMessages, errors }, { status });
}

// ---- POST /rest/api/3/issue ----------------------------------------------

const VALID_ISSUE_TYPES: BoardSeedIssue["issueType"][] = [
  "Story",
  "Task",
  "Bug",
  "Epic",
  "Subtask",
  "Service Request",
  "Incident",
];

const VALID_PRIORITIES: BoardSeedIssue["priority"][] = [
  "Highest",
  "High",
  "Medium",
  "Low",
  "Lowest",
];

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jiraError(400, ["Request body must be valid JSON."]);
  }

  // Real Jira nests user-controlled fields under `fields`. Be lenient: also
  // accept top-level shorthand for SE convenience, but prefer `fields` when
  // both are present (matches real Jira behavior).
  const fieldsRaw = body.fields;
  const fields =
    typeof fieldsRaw === "object" && fieldsRaw !== null
      ? (fieldsRaw as Record<string, unknown>)
      : body;

  const errors: Record<string, string> = {};

  // project --------------------------------------------------------------
  const project = fields.project as Record<string, unknown> | undefined;
  const projectKey =
    typeof project?.key === "string" ? (project.key as string) : "WEB";

  // issuetype ------------------------------------------------------------
  const issuetype = fields.issuetype as Record<string, unknown> | undefined;
  const issueTypeName =
    typeof issuetype?.name === "string" ? (issuetype.name as string) : "Task";
  if (
    !VALID_ISSUE_TYPES.includes(
      issueTypeName as BoardSeedIssue["issueType"],
    )
  ) {
    errors.issuetype = `issuetype.name must be one of ${VALID_ISSUE_TYPES.join(", ")}.`;
  }

  // summary --------------------------------------------------------------
  const summary = coerceString(fields.summary);
  if (!summary) {
    errors.summary = "summary is required.";
  }

  // description ----------------------------------------------------------
  // Real Jira accepts ADF objects for description. The mock accepts ADF and
  // also bare strings for SE convenience — flatten ADF to plain text on the
  // way into the store, then re-inflate to ADF when shaping the GET
  // response. Lossless for single-paragraph descriptions, which covers ~all
  // automation-generated content.
  const description = adfOrStringToPlain(fields.description) ?? "";

  // priority -------------------------------------------------------------
  const priorityRaw = fields.priority as Record<string, unknown> | undefined;
  const priorityName =
    typeof priorityRaw?.name === "string"
      ? (priorityRaw.name as string)
      : undefined;
  if (
    priorityName &&
    !VALID_PRIORITIES.includes(priorityName as BoardSeedIssue["priority"])
  ) {
    errors.priority = `priority.name must be one of ${VALID_PRIORITIES.join(", ")}.`;
  }

  // assignee + reporter --------------------------------------------------
  const assignee = userField(fields.assignee);
  const reporter = userField(fields.reporter);

  // labels ---------------------------------------------------------------
  const labels = Array.isArray(fields.labels)
    ? (fields.labels as unknown[]).filter((l): l is string => typeof l === "string")
    : undefined;

  // story points ---------------------------------------------------------
  // Real Jira: customfield_10016. Accept it OR a `storyPoints` shorthand.
  const storyPointsRaw =
    fields.customfield_10016 ?? fields.storyPoints ?? body.storyPoints;
  const storyPoints =
    typeof storyPointsRaw === "number" ? storyPointsRaw : undefined;

  if (Object.keys(errors).length > 0) {
    return jiraError(400, [], errors);
  }

  const input: CreateIssueInput = {
    projectKey,
    issueType: issueTypeName as BoardSeedIssue["issueType"],
    summary: summary!,
    description,
    priority: priorityName as BoardSeedIssue["priority"] | undefined,
    assignee,
    reporter,
    storyPoints,
    labels,
  };

  const created = await createIssue(input);

  // Real Jira returns 201 Created with a thin body. Shape mirrors that.
  return NextResponse.json(shapeCreateResponse(created, baseUrl(req)), {
    status: 201,
  });
}

// ---- GET /rest/api/3/issue (mock convenience) ----------------------------

/**
 * GET /rest/api/3/issue — list issues.
 *
 * Real Jira lists issues via `POST /rest/api/3/search/jql` with a JQL
 * expression. Building a JQL parser is out of scope for a smoke; the mock
 * exposes simple query-param filters instead. Returns a paged envelope
 * roughly matching real Jira's `total / startAt / maxResults / issues`.
 *
 * Query params:
 *   - project   — filter by project key (default: any)
 *   - status    — case-insensitive substring on the status name
 *   - assignee  — substring on assignee accountId or displayName
 *   - startAt   — offset, default 0
 *   - maxResults — page size, default 50
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const projectFilter = url.searchParams.get("project");
  const statusFilter = url.searchParams.get("status")?.toLowerCase();
  const assigneeFilter = url.searchParams.get("assignee")?.toLowerCase();
  const startAt = parseInt(url.searchParams.get("startAt") ?? "0", 10);
  const maxResults = parseInt(
    url.searchParams.get("maxResults") ?? "50",
    10,
  );

  let issues = await listIssues();
  if (projectFilter) {
    issues = issues.filter((i) => i.projectKey === projectFilter);
  }
  if (statusFilter) {
    issues = issues.filter((i) =>
      i.statusName.toLowerCase().includes(statusFilter),
    );
  }
  if (assigneeFilter) {
    issues = issues.filter(
      (i) =>
        i.assignee &&
        (i.assignee.accountId.toLowerCase().includes(assigneeFilter) ||
          i.assignee.displayName.toLowerCase().includes(assigneeFilter)),
    );
  }

  const paged = issues.slice(startAt, startAt + maxResults);
  const root = baseUrl(req);

  return NextResponse.json({
    expand: "schema,names",
    startAt,
    maxResults,
    total: issues.length,
    issues: paged.map((i) => shapeIssueForRest(i, root)),
  });
}

// ---- Helpers --------------------------------------------------------------

function coerceString(v: unknown): string | undefined {
  if (typeof v === "string" && v.length > 0) return v;
  return undefined;
}

function userField(
  v: unknown,
): { accountId: string; displayName: string } | undefined {
  if (typeof v !== "object" || v === null) return undefined;
  const o = v as Record<string, unknown>;
  const accountId =
    typeof o.accountId === "string" ? (o.accountId as string) : undefined;
  if (!accountId) return undefined;
  const displayName =
    typeof o.displayName === "string"
      ? (o.displayName as string)
      : "Unknown User";
  return { accountId, displayName };
}

/**
 * Flatten an ADF doc to plain text. Real ADF can be deeply nested with
 * marks, lists, panels, etc. — for the smoke we walk the tree and pull out
 * any `text` nodes, joining with single newlines. Lossy for rich content,
 * lossless for the single-paragraph descriptions Elementum automations
 * emit in practice.
 */
function adfOrStringToPlain(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v !== "object" || v === null) return undefined;
  const out: string[] = [];
  walk(v as Record<string, unknown>);
  return out.join("\n").trim() || undefined;

  function walk(node: Record<string, unknown>) {
    if (typeof node.text === "string") out.push(node.text);
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        if (typeof child === "object" && child !== null) {
          walk(child as Record<string, unknown>);
        }
      }
    }
  }
}
