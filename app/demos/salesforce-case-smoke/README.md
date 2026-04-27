# Salesforce Case smoke

Two-surface Salesforce Service Cloud demo — the Cases list at
`/demos/salesforce-case-smoke` and the canonical Case record page at
`/demos/salesforce-case-smoke/lightning/r/Case/{Id}/view`. Both share a
KV-backed store, so Cases created via the mock's REST API appear on the
list view and at the share URL without a refresh round-trip.

This mirrors the JSM, Jira-Software, and SAP smoke pattern: a primary
work surface (Service Console list view) plus a canonical share-link
page (Lightning Record Page), with one durable store underneath. The
`/lightning/r/Case/<Id>/view` URL is what `_mockViewUrl` from the create
API points at — Slack-pasteable, browser-renderable, and survives cold
starts.

---

## Demo URLs

| Surface | URL |
|---|---|
| Service Console — Cases list | `/demos/salesforce-case-smoke` |
| Lightning Record Page — Case detail (canonical share link) | `/demos/salesforce-case-smoke/lightning/r/Case/{Id}/view` |
| **API** — OAuth token | `POST /demos/salesforce-case-smoke/api/services/oauth2/token` |
| **API** — create Case | `POST /demos/salesforce-case-smoke/api/services/data/v63.0/sobjects/Case` |
| **API** — get one Case | `GET  .../sobjects/Case/{Id}` |
| **API** — Case object basic info | `GET  .../sobjects/Case` |
| **API** — SOQL query | `GET  .../query/?q={SOQL}` |
| **API** — SOQL query (long-string POST) | `POST .../query` |

API paths intentionally prefix with `/demos/salesforce-case-smoke/` so
multiple platform mocks can coexist on the same Vercel deployment. Real
Salesforce serves these at `/services/data/v63.0/...` on the org's
my-domain host (`<my-domain>.my.salesforce.com`); when you point the
Elementum `api_task` at this mock, use the full
`/demos/salesforce-case-smoke/api` prefix and the rest of the path lines
up byte-for-byte with what real Salesforce expects.

---

## SE talking points (30-second walkthrough)

1. **Open the Cases list** — `/demos/salesforce-case-smoke`. Show the
   Lightning Service Console chrome (purple app header, app launcher,
   nav tabs with `Cases` selected). Run through the list-view dropdown,
   point out that the 6 seeds cover every Status (New / Working /
   Escalated / Closed) and every Priority + Origin combination.

2. **Drill into a Case** — click any row. Lands on the Lightning Record
   Page at `/lightning/r/Case/<Id>/view` with the standard Highlights
   panel + Details/Related/Activity/Chatter tab strip + 2-column 70/30
   body layout. This is the same URL Elementum will emit in chat replies
   via `_mockViewUrl`.

3. **Fire the Elementum automation** that posts a new Case via the
   sObject REST endpoint. Note the OAuth-then-write pattern — Elementum
   handles token minting natively in the api_task config (see below).

4. **Click the `_mockViewUrl`** from the chat reply — lands at
   `/lightning/r/Case/<NewId>/view` showing the freshly-created Case.
   Refresh the list view — the new row is at the top.

5. Narrate: "The Elementum API task is configured exactly as if it were
   hitting a real Salesforce org — same `/services/data/v63.0/sobjects/Case`
   path, same `attributes.{type, url}` block on every record, same JSON
   array error envelope, same OAuth token minting roundtrip. When you
   repoint at production Salesforce, the only thing that changes is the
   `instance_url` you point the api_task at and the OAuth credentials."

---

## API contract

### OAuth token roundtrip — required before every API call

Salesforce APIs reject any request without a valid `Authorization:
Bearer <access_token>`. The flow is two requests:

```
POST /services/oauth2/token
     Content-Type: application/x-www-form-urlencoded
     grant_type=client_credentials
     &client_id=<consumer_key>
     &client_secret=<consumer_secret>
   → 200 OK
     { access_token, instance_url, ... }

POST /services/data/v63.0/sobjects/Case
     Authorization: Bearer <access_token>
     Content-Type: application/json
     <body>
   → 201 Created
```

The mock honors the token leg (returns a fake-but-realistic session id)
and accepts any bearer (or none) on subsequent API calls. Real
Salesforce strictly validates the bearer; the mock is lenient so demo
prep doesn't fail when an SE forgets to copy a secret. Documented in
PLATFORMS/salesforce.md § AUTH.

### POST `.../services/oauth2/token`

Mint an access token. Mirrors
[Salesforce's OAuth 2.0 token endpoint](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_endpoints.htm).

**Request body — form-encoded (canonical)**
```
grant_type=client_credentials&client_id=<consumer_key>&client_secret=<consumer_secret>
```

**Request body — JSON (also accepted)**
```json
{
  "grant_type": "client_credentials",
  "client_id": "<consumer_key>",
  "client_secret": "<consumer_secret>"
}
```

Accepted `grant_type` values: `client_credentials`,
`urn:ietf:params:oauth:grant-type:jwt-bearer`, `password`,
`refresh_token`, `authorization_code`. The smoke does not validate the
credentials themselves — any value in `client_id`, `client_secret`,
`assertion`, etc. is accepted.

**Response (200 OK)**
```json
{
  "access_token": "00D5g00000ABCDE!ARQAQHmL7Mockaccesstokenforsalesforcecasesmoke.dEMOTOKEN1234567890",
  "instance_url": "https://elementum-translator.vercel.app",
  "id": "https://elementum-translator.vercel.app/id/00D5g00000ABCDEAAU/0055g00000QAPI001AAJ",
  "token_type": "Bearer",
  "issued_at": "1745798400000",
  "signature": "mock_signature_for_demo_purposes_only_aGVsbG8=",
  "scope": "api refresh_token",
  "expires_in": 7200
}
```

**Error envelope (400 Bad Request)** — OAuth 2.0 spec format, NOT the
sObject array envelope. This is the only endpoint in the surface where
errors look like this:
```json
{
  "error": "unsupported_grant_type",
  "error_description": "grant_type 'magic_beans' is not supported."
}
```

### POST `.../sobjects/Case`

Create a Case. Mirrors
[Salesforce's sObject REST create](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/dome_sobject_create.htm).

**Request body — full Salesforce shape (PascalCase, real)**
```json
{
  "Subject": "Cannot reset password",
  "Description": "User reports the password reset link 404s.",
  "Status": "New",
  "Priority": "High",
  "Origin": "Web",
  "Reason": "Performance",
  "AccountId": "0015g00000Acme0AAH",
  "ContactId": "0035g00000Acme0AAH",
  "ContactEmail": "user@acme.com"
}
```

**Request body — friendly camelCase (also accepted)**
```json
{
  "subject": "Cannot reset password",
  "description": "User reports the password reset link 404s.",
  "priority": "High",
  "origin": "Web",
  "contactEmail": "user@acme.com"
}
```

The camelCase form is for SE convenience when writing api_task config
by hand. The PascalCase form is what real Salesforce integrations send.

**Field rules**
- `Subject` / `subject` — **required**, free-form. The only truly-required
  field on a real Salesforce Case.
- `Description` / `description` — optional, defaults to empty string.
- `Status` / `status` — one of `New`, `Working`, `Escalated`, `Closed`.
  Defaults to `New`. Restricted picklist on real Salesforce; mock matches.
- `Priority` / `priority` — one of `Low`, `Medium`, `High`. Defaults to
  `Medium`. Restricted picklist on real Salesforce; mock matches.
- `Origin` / `origin` — one of `Phone`, `Email`, `Web`, `Chat`. Defaults
  to `Web`. Restricted picklist on real Salesforce; mock matches.
- `Reason` / `reason` — one of `Installation`, `Equipment Complexity`,
  `Performance`, `Breakdown`, `Equipment Design`, `Feedback`, `Other`.
  Optional. Restricted picklist on real Salesforce; mock matches.
- `AccountId` / `accountId` — optional 18-char Account Id.
- `ContactId` / `contactId` — optional 18-char Contact Id.
- `ContactEmail` / `contactEmail` — optional, free-form email.
- `OwnerId` / `ownerId` — optional 18-char User or Group Id. Defaults to
  a stable "API User" (`0055g00000QAPI001AAJ`) so every Case is well-formed.
- `Authorization` header is accepted but not validated. (Real Salesforce
  requires `Bearer <access_token>`.)

**Response (201 Created)** — minimal Salesforce sObject create envelope
plus two non-standard fields for demo convenience:
```json
{
  "id": "5005g00000K9aP7AAJ",
  "success": true,
  "errors": [],
  "_mockViewUrl": "https://elementum-translator.vercel.app/demos/salesforce-case-smoke/lightning/r/Case/5005g00000K9aP7AAJ/view",
  "record": {
    "attributes": {
      "type": "Case",
      "url": "/services/data/v63.0/sobjects/Case/5005g00000K9aP7AAJ"
    },
    "Id": "5005g00000K9aP7AAJ",
    "CaseNumber": "00001046",
    "Subject": "Cannot reset password",
    "Description": "User reports the password reset link 404s.",
    "Status": "New",
    "Priority": "High",
    "Origin": "Web",
    "Reason": "Performance",
    "AccountId": "0015g00000Acme0AAH",
    "ContactId": "0035g00000Acme0AAH",
    "OwnerId": "0055g00000QAPI001AAJ",
    "IsClosed": false,
    "CreatedDate": "2026-04-22T09:45:30.000+0000",
    "LastModifiedDate": "2026-04-22T09:45:30.000+0000",
    "SystemModstamp": "2026-04-22T09:45:30.000+0000",
    "_mockViewUrl": "https://elementum-translator.vercel.app/demos/salesforce-case-smoke/lightning/r/Case/5005g00000K9aP7AAJ/view"
  }
}
```

`Location` header on the 201 also points at the new entity URI
(`/services/data/v63.0/sobjects/Case/<Id>`), per Salesforce convention.

- **`id` / `success` / `errors`** is the standard Salesforce shape. Real
  integrations pull `id` and follow up with a GET if they want the
  persisted fields.
- **`_mockViewUrl`** is **non-standard, demo-only**. Real Salesforce
  never returns it. It's the share-link URL that opens the Lightning
  Record Page so Elementum automations can template a clickable link
  into chat replies. When you repoint the automation at a real org,
  build the URL out-of-band as `${instance_url}/lightning/r/Case/${id}/view`.
- **`record`** is **non-standard, demo-only**. Real Salesforce returns
  only `id/success/errors` on 201; integrations follow up with a GET if
  they want the full persisted record. We extend the body so `api_task`
  can chat-reply with deep-link + persisted fields without a follow-up
  GET. When you repoint, do the explicit GET like real Salesforce
  expects — same `record` shape under `attributes`.

### Error envelope

Matches Salesforce's real REST error shape (PLATFORMS/salesforce.md §
API SURFACE > Error envelope) — always a JSON array, even when there's
only one error:
```json
[
  {
    "message": "Required fields are missing: [Subject]",
    "errorCode": "REQUIRED_FIELD_MISSING",
    "fields": ["Subject"]
  }
]
```

Common `errorCode` values surfaced by this mock: `REQUIRED_FIELD_MISSING`
(missing required field on POST), `INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST`
(picklist value not in the standard set), `JSON_PARSER_ERROR` (malformed
body), `NOT_FOUND` (Id doesn't resolve), `MALFORMED_QUERY` / `INVALID_TYPE`
(SOQL parse / object-not-supported), `METHOD_NOT_ALLOWED` (POST on a
record-id path).

Common HTTP status codes: `200`, `201`, `400` (validation / malformed),
`404` (Id not found), `405` (POST on the wrong path).

Note: the OAuth token endpoint uses the **OAuth 2.0 spec error envelope**
(`{error, error_description}`) instead — that's the only place in the
Salesforce API surface where errors look different.

### GET `.../sobjects/Case/{Id}`

Returns the full sObject record envelope (with `attributes.{type, url}`,
all standard fields, ISO 8601 dates with `+0000` UTC offset, and the
demo-only `_mockViewUrl`). 404 with the array error envelope if not
found. Accepts both 15-char and 18-char Ids — Salesforce normalizes Id
comparisons; the mock matches that behavior.

### GET `.../sobjects/Case`

Returns object-level basic info: `objectDescribe` (with key prefix `500`,
sObject metadata) and `recentItems` (the 3 most recently created Cases
in store order). Real Salesforce uses the current user's view history;
the mock proxies with newest-first which is good enough for "did the
create work?" smoke checks.

### GET `.../query/?q={SOQL}` and POST `.../query`

SOQL query endpoint. URL-encoded `q` parameter for GET, JSON body
`{"q": "..."}` for POST (real Salesforce accepts POST for queries that
exceed the URL length limit).

Supported SOQL grammar:
- `SELECT <fields> FROM Case`
- Optional `WHERE <field> = '<value>'` — equality only
- Optional `LIMIT <n>`
- Tolerant of `+`-encoded spaces (the canonical URL form)
- Case-insensitive on keywords

```json
{
  "totalSize": 6,
  "done": true,
  "records": [ /* same shape as GET /sobjects/Case/{Id} */ ]
}
```

`done: true` with no `nextRecordsUrl` (no pagination — the smoke never
has more than a few dozen records).

What's **NOT** handled (and falls through to the unfiltered list, or
returns 400 with `MALFORMED_QUERY`):
- AND/OR composition, IN(...), LIKE, NOT
- Nested SELECT (parent-child relationship traversal)
- ORDER BY, GROUP BY, OFFSET
- Aggregate functions (COUNT, SUM, AVG)
- Date literals (TODAY, LAST_N_DAYS:7, THIS_MONTH)

For the SE demo, equality filters cover the common polling pattern
("give me all Cases where Status = 'New'"). Anything more exotic is
documented honestly so SEs don't get surprised mid-demo.

---

## Status / Priority / Origin / Reason values

These are the standard Salesforce Case picklists. The mock validates
against exactly these sets and returns
`INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST` for anything else, mirroring
real Salesforce's strict picklist behavior.

| Field | Allowed values |
|---|---|
| `Status` | `New`, `Working`, `Escalated`, `Closed` |
| `Priority` | `Low`, `Medium`, `High` |
| `Origin` | `Phone`, `Email`, `Web`, `Chat` |
| `Reason` | `Installation`, `Equipment Complexity`, `Performance`, `Breakdown`, `Equipment Design`, `Feedback`, `Other` |

If the prospect asks about their custom picklist values, be upfront:
real orgs customize these heavily. The mock uses the out-of-the-box set
— for the production integration we'd configure Elementum to read the
customer's actual picklist from the Case object metadata.

---

## Elementum API task config

Drop this into your Elementum HCL. Base URL is the Vercel deployment;
the OAuth + REST paths pick up from there.

```hcl
# Step 1: mint an access token. Real Salesforce requires this before
# every API call (or every TOKEN_TTL seconds — the mock + real both
# return expires_in=7200).
resource "elementum_api_task" "salesforce_token" {
  parent = elementum_automation.case_intake.refs["triggered"]
  name   = "Mint Salesforce access token"

  method = "POST"
  url    = "https://elementum-translator.vercel.app/demos/salesforce-case-smoke/api/services/oauth2/token"

  headers = {
    "Content-Type" = "application/x-www-form-urlencoded"
  }

  # Real values would come from secrets manager. The mock accepts anything.
  body = "grant_type=client_credentials&client_id=demo&client_secret=demo"

  response_fields = {
    "Access Token"  = "$.access_token"
    "Instance URL"  = "$.instance_url"
  }
}

# Step 2: POST the new Case with the token in the Authorization header.
resource "elementum_api_task" "create_case" {
  parent = elementum_api_task.salesforce_token
  name   = "Create Salesforce Case"

  method = "POST"
  url    = "${elementum_api_task.salesforce_token.refs["Instance URL"]}/demos/salesforce-case-smoke/api/services/data/v63.0/sobjects/Case"

  headers = {
    "Authorization" = "Bearer ${elementum_api_task.salesforce_token.refs["Access Token"]}"
    "Content-Type"  = "application/json"
  }

  body = jsonencode({
    Subject      = elementum_automation.case_intake.refs["Title"]
    Description  = elementum_automation.case_intake.refs["Description"]
    Status       = "New"
    Priority     = elementum_automation.case_intake.refs["Priority"]
    Origin       = "Web"
    ContactEmail = elementum_automation.case_intake.refs["Reporter Email"]
  })

  # Extract fields from the Salesforce 201 response into refs for later
  # tasks. The standard envelope has `id` at the top level; the
  # demo-only extension surfaces `_mockViewUrl` and the full `record`.
  response_fields = {
    "Case Id"     = "$.id"
    "Case Number" = "$.record.CaseNumber"
    "Browse URL"  = "$._mockViewUrl"   # demo-only; build from Instance URL + Id for prod
  }
}

resource "elementum_message_task" "notify_support" {
  parent  = elementum_api_task.create_case
  name    = "Notify support"
  channel = "slack"
  to      = "#support-cases"
  body    = <<-EOT
    New Case filed:
    ${elementum_api_task.create_case.refs["Case Number"]} — ${elementum_automation.case_intake.refs["Title"]}
    ${elementum_api_task.create_case.refs["Browse URL"]}
  EOT
}
```

Field-name conventions: Elementum fields are Title Case with spaces
(`"Case Id"`, `"Browse URL"`, `"Access Token"`) — snake_case and
camelCase get rejected.

For the SOQL polling pattern (e.g. "every 15 minutes, find all
Status = 'New' Cases and triage"):

```hcl
resource "elementum_api_task" "poll_new_cases" {
  parent = elementum_api_task.salesforce_token
  name   = "Find new Cases via SOQL"

  method = "GET"
  url    = "${elementum_api_task.salesforce_token.refs["Instance URL"]}/demos/salesforce-case-smoke/api/services/data/v63.0/query"

  query_params = {
    q = "SELECT Id, CaseNumber, Subject, Status, Priority FROM Case WHERE Status = 'New' LIMIT 50"
  }

  headers = {
    "Authorization" = "Bearer ${elementum_api_task.salesforce_token.refs["Access Token"]}"
  }

  response_fields = {
    "Total Found" = "$.totalSize"
    "Records"     = "$.records"
  }
}
```

---

## What's fake vs. what's real

| Element | Real Salesforce? | Mock behavior |
|---|---|---|
| URL path `/services/data/v63.0/sobjects/Case/...` | ✅ real | matches byte-for-byte (under the `/demos/salesforce-case-smoke/api` prefix) |
| URL path `/services/oauth2/token` | ✅ real | matches byte-for-byte |
| URL path `/lightning/r/Case/<Id>/view` | ✅ real | matches (under the demo prefix) |
| `attributes.{type, url}` block on every record | ✅ real | matches |
| 18-char case-safe Id with `500` key prefix | ✅ real | mock generates 18-char Ids; **the 3-char checksum is invented** ("AAJ" hardcoded) |
| 15-char Id accepted on retrieve | ✅ real | matches (mock normalizes) |
| 8-digit auto-numbered `CaseNumber` | ✅ real | matches |
| ISO 8601 dates with `+0000` UTC offset (no colon) | ✅ real | matches |
| Restricted picklists on Status / Priority / Origin / Reason | ✅ real | matches the OOB picklist set; **does not honor org-customized values** |
| 201 Created envelope `{id, success, errors}` | ✅ real | matches |
| `Location` header on 201 | ✅ real | matches |
| OAuth `{access_token, instance_url, id, token_type, ...}` envelope | ✅ real | matches |
| OAuth grant types: client_credentials, jwt-bearer, password, refresh, code | ✅ real | all 5 accepted; **none of the credentials are validated** |
| OAuth `{error, error_description}` error envelope | ✅ real | matches (only on /oauth2/token) |
| sObject `[{message, errorCode, fields}]` error envelope | ✅ real | matches |
| `_mockViewUrl` top-level field on 201 + retrieve | ❌ **demo only** | swap for `${instance_url}/lightning/r/Case/${id}/view` in prod |
| `record` top-level field on 201 | ❌ **demo only** | real Salesforce returns only `{id, success, errors}` — do an explicit GET in prod |
| SOQL query envelope `{totalSize, done, records}` | ✅ real | matches |
| SOQL `done: false` + `nextRecordsUrl` (pagination) | ✅ real | **not implemented** — the smoke fits in one page |
| SOQL `SELECT...FROM Case WHERE x='y' LIMIT n` | ✅ real | matches |
| SOQL AND/OR/IN/LIKE/NOT/ORDER BY/GROUP BY/aggregates/date literals | ✅ real | **not implemented** — equality only |
| SOQL parent-child traversal (`SELECT Account.Name FROM Case`) | ✅ real | **not implemented** |
| Authorization (Bearer access_token) | ✅ real | **mock accepts anything** (demo shortcut) |
| Field-level security / sharing rules | ✅ real | **not enforced** — every Case visible |
| Validation rules + Apex triggers on insert | ✅ real | **not run** — only required-field + picklist validation |
| Process Builder / Flow on Case insert | ✅ real | **not run** |
| Composite API (`/composite/tree/`, `/composite/batch/`) | ✅ real | **not implemented** |
| PATCH (update) and DELETE on /sobjects/Case/{Id} | ✅ real | **not implemented** — POST + GET only |
| Custom fields (`<api>__c`) | ✅ real | not modeled — only standard fields |
| Data persistence | ✅ real (durable, multi-org isolated) | **Vercel KV (durable) when env vars set, globalThis (warm-only) otherwise** |

If the prospect asks a question that would require any of the "❌"
rows or "not implemented" rows to be real, be upfront: "This is
demo-mode — in the production integration we'd configure [thing]."
Don't paper over it.

---

## Vercel KV setup (one-time)

This mock needs **Vercel KV** (Upstash Redis under the hood) to persist
state across cold starts and across serverless function instances.
Without KV the mock still runs — it falls back to a per-function-instance
in-memory store — but Cases created via `POST` won't reliably show up
on the list view because Vercel routes the POST and the list-view
render to different function instances with separate memory.

One-time setup in the Vercel dashboard:

1. Go to https://vercel.com/dashboard → open the
   `elementum-translator` project.
2. Click the **Storage** tab.
3. Click **Create Database** → pick **KV** (or **Upstash for Redis** if
   the "KV" branding is gone — same thing).
4. Name it `elementum-translator-store` (any name works). **If the JSM,
   Jira-Software, SAP, or Amazon mock already provisioned one, skip this**
   — all mocks share the same KV instance and use distinct key prefixes
   (`jsm-queue-smoke:requests:v1`, `jira-software-smoke:issues:v1`,
   `sap-me5a-smoke:prs:v1`, `amazon-punchout-smoke:carts:v1`,
   `salesforce-case-smoke:cases:v1`) so they don't collide.
5. After it's created, click **Connect Project** and select
   `elementum-translator`. Link it to all three environments (Production,
   Preview, Development).
6. Vercel auto-injects `KV_REST_API_URL` / `KV_REST_API_TOKEN` (and
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) into every build.
7. Redeploy if Vercel didn't auto-redeploy on the connect step.

Verify it worked:
```bash
# Mint a token
TOKEN=$(curl -sS -X POST \
  "https://elementum-translator.vercel.app/demos/salesforce-case-smoke/api/services/oauth2/token" \
  -d "grant_type=client_credentials&client_id=demo&client_secret=demo" \
  | jq -r .access_token)

# List existing cases
curl -sS "https://elementum-translator.vercel.app/demos/salesforce-case-smoke/api/services/data/v63.0/query?q=SELECT+Id,CaseNumber,Subject+FROM+Case" \
  -H "Authorization: Bearer $TOKEN" | jq '.totalSize'

# Create one
curl -sS -X POST \
  "https://elementum-translator.vercel.app/demos/salesforce-case-smoke/api/services/data/v63.0/sobjects/Case" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"Subject":"KV smoke test","Priority":"High"}' | jq '{id, success}'

# Verify it persisted (should be one higher)
curl -sS "https://elementum-translator.vercel.app/demos/salesforce-case-smoke/api/services/data/v63.0/query?q=SELECT+Id+FROM+Case" \
  -H "Authorization: Bearer $TOKEN" | jq '.totalSize'
```

Then open `/demos/salesforce-case-smoke/lightning/r/Case/<NewId>/view` and
it'll render with the data you posted.

Local dev without KV: just run `npm run dev` — the store falls back to
`globalThis`. POSTs persist within the same running dev server but reset
between restarts. Good enough for local iteration.

---

## Caveats

- **Cold starts still hit KV.** The store survives cold starts (that's
  the whole point), but the first KV read on a newly-minted function
  instance adds ~50ms of latency. Negligible for demos.
- **Field names are Title Case with spaces** in Elementum. Not snake_case,
  not camelCase. `"Case Id"` yes, `"caseId"` no, `"case_id"` no. The
  Salesforce wire fields are PascalCase (`Subject`, `CaseNumber`,
  `OwnerId`) — that's Salesforce's convention, not Elementum's; only
  the Elementum-side ref names are Title Case.
- **OAuth roundtrip is two requests.** Even though the mock doesn't
  validate the bearer, the Elementum automation should still mint a
  token — that way the integration works against a real Salesforce org
  unchanged.
- **Always `await` the POST** inside the automation before firing the
  next task. The other write-API patterns spell this out for the same
  reason.
- **Store resets are manual.** Seeds re-seed only when the KV key is
  empty. If you want a fresh demo, call `resetStore()` (from
  `_lib/store.ts`) or delete the `salesforce-case-smoke:cases:v1` key
  from the Upstash console.
- **No PATCH or DELETE.** Real Salesforce supports `PATCH /sobjects/Case/{Id}`
  for updates and `DELETE /sobjects/Case/{Id}` for deletes; the mock
  returns 405 on those. If a prospect specifically asks about update
  flows, mirror it back: "Yes, real Salesforce supports it — we didn't
  build it into the mock because the demo focuses on Case intake. The
  Elementum API task supports PATCH against a real org with the same
  body shape."
- **Case Ids increment globally.** POSTing to the mock mints
  `5005g00000K9aP7AAJ`, `5005g00000K9aP8AAJ`, etc. There's no
  per-org-range allocation like real Salesforce's platform-wide pool,
  and the 3-char case-safe checksum is hardcoded "AAJ" rather than
  derived from the case pattern of the 15-char prefix. Visually
  consistent with seeds; not algorithmically real.
- **Restricted picklist values are the OOB set only.** Real orgs
  customize Status / Priority / Origin / Reason heavily. The mock
  uses the out-of-the-box values; if the prospect asks about their
  custom values, narrate the customization without pretending the mock
  enforces them.
- **OAuth credentials are not validated.** Any `client_id` /
  `client_secret` / `assertion` combination mints a token. Real
  Salesforce strictly validates. Demo shortcut only.
- **`_mockViewUrl` and `record` on the 201 are non-standard.** Real
  Salesforce returns only `{id, success, errors}`. Documented in the
  envelope table above — swap for an explicit GET in production.
