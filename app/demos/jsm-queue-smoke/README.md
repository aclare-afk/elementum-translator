# JSM queue smoke

Two-surface Jira Service Management demo — the agent queue at
`/demos/jsm-queue-smoke` and the customer portal at
`/demos/jsm-queue-smoke/portal`. Both share an in-memory store, so records
created via the mock's REST API appear in both UIs without a refresh round-trip.

This is the **reference implementation** for interactive mocks: the write-API
pattern, the `_mockViewUrl` return field, and the server-component store
integration all come from here.

---

## Demo URLs

| Surface | URL |
|---|---|
| Agent queue | `/demos/jsm-queue-smoke` |
| Customer portal | `/demos/jsm-queue-smoke/portal` |
| Portal — request detail | `/demos/jsm-queue-smoke/portal/requests/{issueKey}` |
| **API** — create request | `POST /demos/jsm-queue-smoke/api/rest/servicedeskapi/request` |
| **API** — list requests | `GET /demos/jsm-queue-smoke/api/rest/servicedeskapi/request` |
| **API** — get one request | `GET /demos/jsm-queue-smoke/api/rest/servicedeskapi/request/{issueKeyOrId}` |

The API paths intentionally prefix with `/demos/jsm-queue-smoke/` so multiple
platform mocks can coexist on the same Vercel deployment without stepping on
each other's URLs. Real JSM lives at `/rest/servicedeskapi/...` on the tenant
root; when you configure the Elementum `api_task` to use this mock, point its
base URL at the full `/demos/jsm-queue-smoke/api` prefix and the rest of the
path will line up.

---

## SE talking points (30-second walkthrough)

1. **Open the portal** — `/demos/jsm-queue-smoke/portal`. Show the request-type
   tiles and the "My recent requests" list. Point out that real JSM customer
   portals are this minimal by design — no left nav, no internal agent tools.

2. **Open the agent queue** — `/demos/jsm-queue-smoke`. Click a request to
   open the detail pane. Point out the SLA chips (healthy / at-risk / breached
   / paused / done) all live in the seeds, and the pending-approval request
   (`ITH-417`) where the viewer can Approve/Decline inline.

3. **Fire the Elementum automation** that does a `POST` to the mock's API.
   Wait for the chat response to surface a URL back to the user (this is the
   `_mockViewUrl` the mock returns).

4. **Click that URL** — the customer lands on the portal's request-detail
   page with the summary, description, and status the automation posted. Then
   **refresh the agent queue** — the new request is at the top with a
   "Waiting for support" pill.

5. Narrate: "Elementum's API task is configured exactly as if it were hitting
   a real Atlassian tenant — same path, same request body, same response
   envelope. When you point this at your production JSM, nothing changes
   except the base URL and the auth header."

---

## API contract

### POST `/demos/jsm-queue-smoke/api/rest/servicedeskapi/request`

Create a customer request. Mirrors
[Atlassian's real JSM create-request endpoint](https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-request/#api-rest-servicedeskapi-request-post).

**Request body**
```json
{
  "serviceDeskId": "7",
  "requestTypeId": "25",
  "requestFieldValues": {
    "summary": "Laptop won't boot after update",
    "description": "Spacebar unresponsive, hangs on startup."
  },
  "raiseOnBehalfOf": "customer@example.com"
}
```

- `serviceDeskId` — accepts any string; the mock uses `"7"` regardless.
- `requestTypeId` — one of `"25"` (Get IT help), `"26"` (Request hardware),
  `"27"` (Request access), `"28"` (Report outage). See `data/requests.ts`.
- `requestFieldValues.summary` is **required**.
- `requestFieldValues.description` is optional; defaults to empty string.
- `raiseOnBehalfOf` — email or accountId. If it looks like an email, we use
  the local part as the display name.
- Authorization header is accepted but not validated. (Real JSM requires
  Basic or OAuth Bearer.)

**Response (201 Created)**
```json
{
  "issueId": "30107",
  "issueKey": "ITH-421",
  "requestTypeId": "25",
  "serviceDeskId": "7",
  "createdDate": { "iso8601": "2026-04-24T17:20:00.000Z", "friendly": "just now" },
  "reporter": {
    "accountId": "f2b1c9...",
    "displayName": "Customer",
    "emailAddress": "customer@example.com"
  },
  "requestFieldValues": [
    { "fieldId": "summary", "label": "Summary", "value": "Laptop won't boot..." },
    { "fieldId": "description", "label": "Description", "value": "..." }
  ],
  "currentStatus": {
    "status": "Waiting for support",
    "statusCategory": "NEW"
  },
  "_links": {
    "jiraRest": ".../rest/api/3/issue/ITH-421",
    "self": ".../rest/servicedeskapi/request/ITH-421",
    "web": ".../demos/jsm-queue-smoke/portal/requests/ITH-421"
  },
  "_mockViewUrl": ".../demos/jsm-queue-smoke/portal/requests/ITH-421"
}
```

- **`_mockViewUrl`** is a **non-standard, demo-only** field. Real JSM never
  returns it. It exists so the Elementum automation can template a URL back
  to the end user that actually opens something during the demo. When you
  repoint the automation at a real tenant, swap the refs value for a
  template using `_links.web` or build the URL from `issueKey`.

### Error envelope

Matches JSM's real error shape (PLATFORMS/jira.md § Error envelope):
```json
{
  "errorMessages": [],
  "errors": { "summary": "Summary is required." }
}
```

### GET `/demos/jsm-queue-smoke/api/rest/servicedeskapi/request/{issueKeyOrId}`

Returns the same shape as POST. Accepts either the key (`ITH-421`) or the id
(`30107`). 404 with the JSM error envelope if not found.

### GET `/demos/jsm-queue-smoke/api/rest/servicedeskapi/request`

Paged list. Query params: `start`, `limit`, `requestTypeId`. Envelope matches
a JSM `PagedDTOCustomerRequestDTO`:

```json
{
  "size": 7, "start": 0, "limit": 50, "isLastPage": true,
  "values": [ /* same shape as POST response */ ]
}
```

---

## Elementum API task config

Drop this into your Elementum `api_task` HCL. Base URL is the Vercel
deployment; path picks up from there.

```hcl
resource "elementum_api_task" "create_jsm_request" {
  parent = elementum_automation.it_support.refs["triggered"]
  name   = "Create JSM request"

  method = "POST"
  url    = "https://elementum-translator.vercel.app/demos/jsm-queue-smoke/api/rest/servicedeskapi/request"

  headers = {
    "Content-Type" = "application/json"
    # Real JSM would need: "Authorization" = "Basic ${base64(user:api_token)}"
    # The mock accepts any Authorization header (or none).
  }

  body = jsonencode({
    serviceDeskId  = "7"
    requestTypeId  = "25"
    raiseOnBehalfOf = elementum_automation.it_support.refs["Requester Email"]
    requestFieldValues = {
      summary     = elementum_automation.it_support.refs["Title"]
      description = elementum_automation.it_support.refs["Description"]
    }
  })

  # Extract fields from the JSM response into refs for later tasks.
  response_fields = {
    "Issue Key"    = "$.issueKey"
    "Issue Id"     = "$.issueId"
    "Portal URL"   = "$._mockViewUrl"   # demo-only; swap to "$._links.web" for prod
    "Status"       = "$.currentStatus.status"
  }
}

resource "elementum_message_task" "notify_requester" {
  parent = elementum_api_task.create_jsm_request
  name   = "Notify requester"
  channel = "email"
  to      = elementum_automation.it_support.refs["Requester Email"]
  subject = "Your IT request is in: ${elementum_api_task.create_jsm_request.refs["Issue Key"]}"
  body    = <<-EOT
    We got your request and our IT team is on it. You can track progress here:
    ${elementum_api_task.create_jsm_request.refs["Portal URL"]}
  EOT
}
```

Field-name conventions: Elementum fields are Title Case with spaces
(`"Issue Key"`, `"Portal URL"`) — snake_case and camelCase get rejected. This
is a gotcha lifted straight from the procurement demo export.

---

## What's fake vs. what's real

| Element | Real JSM? | Mock behavior |
|---|---|---|
| URL path `/rest/servicedeskapi/request` | ✅ real | matches byte-for-byte |
| Request body shape | ✅ real | matches byte-for-byte |
| Response envelope (issueKey, issueId, reporter, _links) | ✅ real | matches byte-for-byte |
| `_mockViewUrl` top-level field | ❌ **demo only** | swap for `_links.web` in prod |
| 201 Created status on POST | ✅ real | matches |
| Error envelope `{errorMessages, errors}` | ✅ real | matches |
| Authorization header | ✅ real | **mock accepts anything** (demo shortcut) |
| Data persistence | ✅ real (durable) | **Vercel KV (durable) when env vars set, globalThis (warm-only) otherwise** |
| SLA timers advancing in real time | ✅ real | static — seeded ms values only |
| Approval decisions actually sticking | ✅ real | UI updates locally, not persisted |
| Webhook outbound on create | ✅ real | **not mocked** — Elementum can still poll GET |

If the prospect asks a question that would require any of the "❌" rows to be
real, be upfront: "This is demo-mode — in the production integration we'd
configure [thing]." Don't paper over it.

---

## Vercel KV setup (one-time)

This mock needs **Vercel KV** (Upstash Redis under the hood) to persist state
across cold starts and across serverless function instances. Without KV the
mock still runs — it falls back to a per-function-instance in-memory store —
but records created via `POST` won't reliably show up in the portal or queue
UI because Vercel routes those to different function instances with separate
memory. That's the bug the KV swap fixes.

One-time setup in the Vercel dashboard:

1. Go to https://vercel.com/dashboard → open the `elementum-translator` project.
2. Click the **Storage** tab.
3. Click **Create Database** → pick **KV** (or **Upstash for Redis** if the
   "KV" branding is gone — same thing).
4. Name it `elementum-translator-store` (any name works). Pick the region
   closest to where the SEs demo from.
5. After it's created, click **Connect Project** and select
   `elementum-translator`. Link it to all three environments (Production,
   Preview, Development) so PR preview URLs and your production URL both
   get the same store.
6. Vercel will auto-inject these env vars into every build:
   - `KV_REST_API_URL` (or `UPSTASH_REDIS_REST_URL`)
   - `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_TOKEN`)
   - plus a few others that `@upstash/redis` ignores
7. Redeploy (Vercel auto-redeploys on the connect step, but if not, click
   **Deployments** → `...` → **Redeploy** on the latest main build).

Verify it worked: `curl -sS https://elementum-translator.vercel.app/demos/jsm-queue-smoke/api/rest/servicedeskapi/request | jq '.size'`.
Fire a `POST` (see above), wait ~2 seconds, curl the same GET again — `size`
should go up by one. Then open the portal detail page for the new issue key
and it'll render.

Local dev without KV: just run `npm run dev` — the store falls back to
`globalThis`. POSTs persist within the same running dev server but reset
between restarts. Good enough for local iteration.

## Caveats (from the procurement demo gotchas)

- **Cold starts still hit KV.** The store survives cold starts (that's the
  whole point), but the first KV read on a newly-minted function instance
  adds ~50ms of latency. Negligible for demos; worth knowing if you wire this
  into a latency-sensitive flow.
- **Field names are Title Case with spaces** in Elementum. Not
  snake_case, not camelCase. `"Issue Key"` yes, `"issueKey"` no, `"issue_key"` no.
- **Always `await` the POST** inside the automation before firing the next
  task. The procurement demo had a fire-and-forget bug that silently dropped
  every PUT — same trap applies here.
- **Store resets are manual.** Seeds re-seed only when the KV key is empty.
  If you want a fresh demo, call `resetStore()` (from `_lib/store.ts`) or
  delete the `jsm-queue-smoke:requests:v1` key from the Upstash console.
