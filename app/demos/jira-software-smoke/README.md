# Jira Software smoke

Two-surface Jira Software demo — the Sprint 42 board at
`/demos/jira-software-smoke` and the canonical issue page at
`/demos/jira-software-smoke/browse/{key}`. Both share a KV-backed store, so
issues created via the mock's REST API appear on the board and at the share
URL without a refresh round-trip.

This mirrors the JSM smoke pattern: a primary work surface (board) plus a
canonical share-link page (issue detail at `/browse/<KEY>`), with one durable
store underneath. The `/browse/<KEY>` URL shape is what every Slack-pasted
Jira link in history looks like — that's why it's the natural target for
`_mockViewUrl`.

## Submitter identity

When an Elementum agent creates an issue, it passes the calling user's
identity through `submitterName` and `submitterEmail`, which the automation
maps to `fields.reporter.{displayName, accountId}` on the create body. The
mock honors that and stores both — the Atlassian-style avatar + name renders
on the issue page's Reporter field.

If the agent's session context only has the user's email (not display name),
the skill instructions tell it to derive a reasonable name from the email's
local part rather than skip the field. `coerceString` and `userField` in the
route handler both filter chip-name literals (`"submitterName"`,
`"displayName"`, `"accountId"`) so a chip that didn't resolve falls back to
"Unknown User" instead of being stored as a fake name.

---

## Demo URLs

| Surface | URL |
|---|---|
| Sprint board | `/demos/jira-software-smoke` |
| Issue detail (canonical share link) | `/demos/jira-software-smoke/browse/{issueKey}` |
| **API** — create issue | `POST /demos/jira-software-smoke/api/rest/api/3/issue` |
| **API** — list / search issues | `GET /demos/jira-software-smoke/api/rest/api/3/issue` |
| **API** — get one issue | `GET /demos/jira-software-smoke/api/rest/api/3/issue/{issueKeyOrId}` |

API paths intentionally prefix with `/demos/jira-software-smoke/` so multiple
platform mocks can coexist on the same Vercel deployment. Real Jira Cloud
serves these at `/rest/api/3/...` on the tenant root; when you point the
Elementum `api_task` at this mock, use the full
`/demos/jira-software-smoke/api` prefix and the rest of the path lines up
byte-for-byte.

---

## SE talking points (30-second walkthrough)

1. **Open the board** — `/demos/jira-software-smoke`. Show Sprint 42 with 8
   issues across To Do / In Progress / In Review / Done. Click a card to
   open the side panel — point out the epic-colored left border, story
   points, priority icon, and the "Open ↗" link to the canonical issue page.

2. **Open the canonical issue page** — click "Open ↗" on the side panel, or
   paste an issue key into the URL: `/browse/WEB-145`. Show the breadcrumb,
   details panel (status, assignee, story points, epic link, labels), and
   the dates section. This is what the share-link in Slack would resolve to.

3. **Fire the Elementum automation** that POSTs a new issue to the mock's
   API. Wait for the chat reply to surface a `_mockViewUrl` back to the
   user.

4. **Click that URL** — lands at `/browse/WEB-148` (or whatever key the mock
   minted) showing the freshly-created issue. Then refresh the board — the
   new card is in the To Do column at the top.

5. Narrate: "Elementum's API task is configured exactly as if it were
   hitting a real Atlassian tenant — same path, same `fields` envelope,
   same 201 Created response shape. When you point this at production
   Jira, nothing changes except the base URL and the auth header."

---

## API contract

### POST `/demos/jira-software-smoke/api/rest/api/3/issue`

Create a Jira issue. Mirrors
[Atlassian's real Jira Cloud REST endpoint](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-post).

**Request body**
```json
{
  "fields": {
    "project":  { "key": "WEB" },
    "issuetype": { "name": "Story" },
    "summary": "Add Apple Pay to checkout",
    "description": "Finance wants Apple Pay enabled for US customers...",
    "priority": { "name": "High" },
    "assignee": {
      "accountId": "5b10a2844c20165700ede21g",
      "displayName": "Priya Shah"
    },
    "labels": ["payments", "checkout"],
    "customfield_10016": 5
  }
}
```

- `fields.project.key` — defaults to `"WEB"` when omitted.
- `fields.issuetype.name` — required to be one of `Story`, `Task`, `Bug`,
  `Epic`, `Subtask`, `Service Request`, `Incident`. Defaults to `Task`.
- `fields.summary` — **required**.
- `fields.description` — accepts ADF (real Jira's format) **or** a bare
  string for SE convenience. ADF gets flattened to plain text on the way
  in, then re-inflated to a single-paragraph ADF doc on the way out.
- `fields.priority.name` — one of `Highest`/`High`/`Medium`/`Low`/`Lowest`.
  Defaults to `Medium`.
- `fields.assignee` / `fields.reporter` — `{accountId, displayName}` objects.
- `fields.labels` — array of strings.
- `fields.customfield_10016` (or top-level `storyPoints` shorthand) — number.
- Authorization header is accepted but not validated. (Real Jira requires
  Basic + API token, OAuth 2.0, Forge JWT, or Connect HS256 JWT.)

**Response (201 Created)** — matches real Jira's intentionally-thin POST body:
```json
{
  "id": "10109",
  "key": "WEB-148",
  "self": "https://elementum-translator.vercel.app/rest/api/3/issue/10109",
  "_mockViewUrl": "https://elementum-translator.vercel.app/demos/jira-software-smoke/browse/WEB-148"
}
```

- **`_mockViewUrl`** is **non-standard, demo-only**. Real Jira never returns
  it. It's the share-link URL that opens the canonical `/browse/<KEY>`
  page so Elementum automations can template a clickable link into chat
  replies. When you repoint the automation at a real tenant, build the URL
  from `key` instead: `https://<tenant>.atlassian.net/browse/<key>`.

### Error envelope

Matches Jira's real error shape (PLATFORMS/jira.md § Error envelope):
```json
{
  "errorMessages": [],
  "errors": { "summary": "summary is required." }
}
```

### GET `/demos/jira-software-smoke/api/rest/api/3/issue/{issueKeyOrId}`

Returns the full Jira REST issue envelope (with ADF description, status with
statusCategory, customfields, `_links.web` to the share URL, and the demo-only
`_mockViewUrl`). Accepts either the key (`WEB-145`) or the numeric id
(`10101`). 404 with the Jira error envelope if not found.

### GET `/demos/jira-software-smoke/api/rest/api/3/issue`

**Mock convenience.** Real Jira lists issues via `POST /rest/api/3/search/jql`
with a JQL expression — building a JQL parser is out of scope for a smoke,
so the mock exposes simple query-param filters instead.

Query params:
- `project` — filter by project key (e.g., `WEB`)
- `status` — case-insensitive substring on the status name
- `assignee` — substring on assignee `accountId` or `displayName`
- `startAt` — pagination offset, default `0`
- `maxResults` — page size, default `50`

Envelope matches Jira's `total / startAt / maxResults / issues`:
```json
{
  "expand": "schema,names",
  "startAt": 0,
  "maxResults": 50,
  "total": 9,
  "issues": [ /* same shape as the GET single response */ ]
}
```

---

## Elementum API task config

Drop this into your Elementum `api_task` HCL. Base URL is the Vercel
deployment; path picks up from there.

```hcl
resource "elementum_api_task" "create_jira_issue" {
  parent = elementum_automation.bug_intake.refs["triggered"]
  name   = "Create Jira issue"

  method = "POST"
  url    = "https://elementum-translator.vercel.app/demos/jira-software-smoke/api/rest/api/3/issue"

  headers = {
    "Content-Type" = "application/json"
    # Real Jira would need: "Authorization" = "Basic ${base64(email:api_token)}"
    # The mock accepts any Authorization header (or none).
  }

  body = jsonencode({
    fields = {
      project   = { key = "WEB" }
      issuetype = { name = "Bug" }
      summary   = elementum_automation.bug_intake.refs["Title"]
      description = elementum_automation.bug_intake.refs["Description"]
      priority  = { name = "High" }
      labels    = ["from-elementum", "auto-triaged"]
      customfield_10016 = 3
    }
  })

  # Extract fields from the Jira 201 response into refs for later tasks.
  response_fields = {
    "Issue Key"   = "$.key"
    "Issue Id"    = "$.id"
    "Browse URL"  = "$._mockViewUrl"   # demo-only; swap to a templated tenant URL for prod
  }
}

resource "elementum_message_task" "notify_team" {
  parent  = elementum_api_task.create_jira_issue
  name    = "Notify engineering"
  channel = "slack"
  to      = "#bugs-prod"
  body    = <<-EOT
    New bug filed from intake:
    ${elementum_api_task.create_jira_issue.refs["Issue Key"]} —
    ${elementum_api_task.create_jira_issue.refs["Browse URL"]}
  EOT
}
```

Field-name conventions: Elementum fields are Title Case with spaces
(`"Issue Key"`, `"Browse URL"`) — snake_case and camelCase get rejected.

---

## What's fake vs. what's real

| Element | Real Jira? | Mock behavior |
|---|---|---|
| URL path `/rest/api/3/issue` | ✅ real | matches byte-for-byte |
| Request body shape (`fields` envelope) | ✅ real | matches byte-for-byte |
| 201 Created response (id, key, self) | ✅ real | matches byte-for-byte |
| `_mockViewUrl` top-level field | ❌ **demo only** | swap for templated `https://<tenant>.atlassian.net/browse/<key>` in prod |
| GET single issue envelope (fields, statusCategory, customfields) | ✅ real | matches |
| ADF description format | ✅ real | mock accepts ADF or plain string; emits single-paragraph ADF |
| GET list / `_search` via JQL | ✅ real | **simplified** — mock uses query-param filters, not JQL |
| Error envelope `{errorMessages, errors}` | ✅ real | matches |
| Authorization header | ✅ real | **mock accepts anything** (demo shortcut) |
| Data persistence | ✅ real (durable) | **Vercel KV (durable) when env vars set, globalThis (warm-only) otherwise** |
| Workflow transitions / state machine | ✅ real | static — issues land in the leftmost column on create |
| Webhook outbound on create | ✅ real | **not mocked** — Elementum can poll GET instead |
| Issue links / sub-tasks | ✅ real | not modeled — flat list only |

If the prospect asks a question that would require any of the "❌" rows to be
real, be upfront: "This is demo-mode — in the production integration we'd
configure [thing]." Don't paper over it.

---

## Vercel KV setup (one-time)

This mock needs **Vercel KV** (Upstash Redis under the hood) to persist state
across cold starts and across serverless function instances. Without KV the
mock still runs — it falls back to a per-function-instance in-memory store —
but issues created via `POST` won't reliably show up on the board because
Vercel routes the POST and the board render to different function instances
with separate memory.

One-time setup in the Vercel dashboard:

1. Go to https://vercel.com/dashboard → open the `elementum-translator` project.
2. Click the **Storage** tab.
3. Click **Create Database** → pick **KV** (or **Upstash for Redis** if the
   "KV" branding is gone — same thing).
4. Name it `elementum-translator-store` (any name works). Pick the region
   closest to where the SEs demo from. **If the JSM mock already provisioned
   one, skip this — both mocks share the same KV instance and use distinct
   key prefixes (`jsm-queue-smoke:requests:v1` vs.
   `jira-software-smoke:issues:v1`) so they don't collide.**
5. After it's created, click **Connect Project** and select
   `elementum-translator`. Link it to all three environments (Production,
   Preview, Development).
6. Vercel auto-injects `KV_REST_API_URL` / `KV_REST_API_TOKEN` (and
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) into every build.
7. Redeploy if Vercel didn't auto-redeploy on the connect step.

Verify it worked:
```bash
curl -sS https://elementum-translator.vercel.app/demos/jira-software-smoke/api/rest/api/3/issue | jq '.total'
```
Fire a `POST` (see API contract), wait ~2 seconds, curl the same GET again —
`total` should go up by one. Then open `/browse/<key>` for the new issue
and it'll render with the data you posted.

Local dev without KV: just run `npm run dev` — the store falls back to
`globalThis`. POSTs persist within the same running dev server but reset
between restarts. Good enough for local iteration.

## Caveats

- **Cold starts still hit KV.** The store survives cold starts (that's the
  whole point), but the first KV read on a newly-minted function instance
  adds ~50ms of latency. Negligible for demos.
- **Field names are Title Case with spaces** in Elementum. Not snake_case,
  not camelCase. `"Issue Key"` yes, `"issueKey"` no, `"issue_key"` no.
- **Always `await` the POST** inside the automation before firing the next
  task. The procurement demo had a fire-and-forget bug that silently dropped
  every PUT — same trap applies here.
- **Store resets are manual.** Seeds re-seed only when the KV key is empty.
  If you want a fresh demo, call `resetStore()` (from `_lib/store.ts`) or
  delete the `jira-software-smoke:issues:v1` key from the Upstash console.
- **No JQL.** The GET list uses query-param filters instead of real Jira's
  JQL. If a prospect asks about JQL specifically, point at the
  `customfield_10016` story-points round-trip as evidence of fidelity, then
  redirect: "We didn't build a JQL parser into the mock — in the production
  integration the Elementum API task uses the real `/rest/api/3/search/jql`
  endpoint with whatever JQL expression you want."
- **Issue keys increment per project.** POSTing with `project.key = "WEB"`
  mints `WEB-149`, `WEB-150`, etc. POSTing with a new project key (e.g.,
  `"OPS"`) mints `OPS-1`. Numeric ids are global and start at 10101.
