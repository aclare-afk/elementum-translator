# ServiceNow

ServiceNow is a cloud-based workflow platform built on top of a configurable relational data layer called the Now Platform. Customers use it as a system of record and engagement for IT Service Management (ITSM), IT Operations Management (ITOM), HR Service Delivery, Customer Service Management (CSM), Security Operations (SecOps), and GRC. For SE demos, the most common framing is ITSM incidents, service requests, change management, and CMDB — those are the scenarios this file is tuned for first.

A "real" ServiceNow deployment lives at `https://<instance>.service-now.com`, where `<instance>` is a customer-assigned subdomain (e.g., `acme.service-now.com`, `dev123456.service-now.com` for developer orgs). Everything — UI, REST APIs, admin, scripts — is served from that one host.

## CAPABILITIES

### Data model
- Tables are the primary entity. Every record is a row in a table. Tables inherit from other tables (e.g., `incident` extends `task`, which extends nothing). Inheritance is single-parent.
- Fields are columns on a table. Typed: `string`, `integer`, `boolean`, `reference` (to another table), `choice` (single-select picklist), `glide_date_time`, `journal` (append-only log), `display_value` vs underlying value distinction.
- Every record has a 32-char hex `sys_id` as primary key, and human-friendly `number` fields per-table (e.g., `INC0010001`, `CHG0030002`).
- Relationships: one-to-many via `reference` fields, many-to-many via dedicated join tables. There is no native many-to-many field type.

### UI surfaces
- Classic UI (the "platform UI," framed navigator with left nav + content frame). Still the default for admins.
- Service Operations Workspace / Agent Workspace (modern tabbed UI; a single React app launched via `/now/nav/ui/classic/params/target/...` or direct workspace URLs like `/now/sow/`).
- Service Portal (customer/employee self-service portal at `/sp` or custom portal slug). Widget-based; widgets are server+client script pairs.
- Next Experience UI (unified shell rolling out across modules; still coexists with the classic frame for many forms).

### Automation
- Business Rules: server-side scripts that run on insert/update/delete/query of a table. Can run before, after, async, or on display. Scripted in server-side JavaScript (the "Rhino-flavored" flavor through Utah; V8/Helsinki+).
- Client Scripts: run in the form page. `onLoad`, `onChange`, `onSubmit`, `onCellEdit`.
- Flow Designer: visual, no-code workflow builder. Triggers (record created/updated, scheduled, inbound email, REST), Actions, Subflows. Intended replacement for Workflow Editor.
- Workflow Editor: legacy graphical workflow (still widely used for approval chains).
- Scheduled Jobs: cron-like.
- Notifications: email and push, triggered on events or record changes.
- Script Includes: reusable server-side functions.

### Integration
- REST Table API (generic CRUD per table).
- REST Aggregate API (GROUP BY / COUNT / AVG over tables).
- REST Import Set API (stage rows into a staging table, transform maps move them into target tables).
- Scripted REST APIs: custom endpoints under `/api/<namespace>/<api_name>/<resource>`.
- IntegrationHub / Spokes: packaged outbound actions to common SaaS.
- MID Server: on-prem agent for reaching private networks.
- Inbound email actions.

### Auth modes the platform accepts
- Basic Auth (username + password, still common in dev orgs).
- OAuth 2.0 — Password grant, Authorization Code grant, JWT bearer flow, and Client Credentials flow.
- Mutual TLS.
- SAML SSO (user-facing, not for server-to-server).

### Admin
- ACLs are row- and column-level rules per table, scripted.
- Scope ("application scope") separates custom apps' tables/scripts from each other.
- Update Sets (classic) or Application Repository (scoped apps) for moving changes between instances.

## API SURFACE

Base URL: `https://<instance>.service-now.com`

All modern REST APIs are served under `/api/now/...`. Default response format is JSON (`Content-Type: application/json`, `Accept: application/json`).

### Authentication on requests
- **Basic Auth**: `Authorization: Basic <base64(user:pass)>`
- **OAuth 2.0 Bearer**: `Authorization: Bearer <access_token>`
- Session cookies are set automatically when authenticated through the UI; the classic UI and portal use these. REST clients should use Basic or OAuth.

### Table API

The workhorse. Generic CRUD over any table the authenticated user has read/write ACLs on.

Paths:
```
GET    /api/now/table/{table_name}
GET    /api/now/table/{table_name}/{sys_id}
POST   /api/now/table/{table_name}
PUT    /api/now/table/{table_name}/{sys_id}
PATCH  /api/now/table/{table_name}/{sys_id}
DELETE /api/now/table/{table_name}/{sys_id}
```

Common query params on GET collection:
- `sysparm_query` — encoded query string (e.g., `active=true^priority=1`)
- `sysparm_limit` — page size (default 10000 in some instances, commonly set lower)
- `sysparm_offset` — zero-indexed offset
- `sysparm_fields` — comma-separated field list to return
- `sysparm_display_value` — `true` / `false` / `all`. When `all`, each field is `{ "value": "...", "display_value": "..." }`
- `sysparm_exclude_reference_link` — if `true`, reference fields return the sys_id as a plain string instead of `{link, value}`

Response envelope for list:
```json
{
  "result": [
    { "...": "..." },
    { "...": "..." }
  ]
}
```

Response envelope for single record (GET by sys_id, POST, PUT, PATCH):
```json
{
  "result": { "...": "..." }
}
```

A typical `incident` record returned by `GET /api/now/table/incident/<sys_id>`:
```json
{
  "result": {
    "sys_id": "46b66a40a9fe1981013806a3bd9d1a0e",
    "number": "INC0010001",
    "short_description": "Email server down",
    "description": "Users reporting inability to send or receive email since 08:00 UTC.",
    "priority": "1",
    "urgency": "1",
    "impact": "1",
    "state": "2",
    "assignment_group": { "link": "https://<instance>.service-now.com/api/now/table/sys_user_group/0a52d3dcd7011200f2d224837e610302", "value": "0a52d3dcd7011200f2d224837e610302" },
    "assigned_to":     { "link": "https://<instance>.service-now.com/api/now/table/sys_user/6816f79cc0a8016401c5a33be04be441",      "value": "6816f79cc0a8016401c5a33be04be441" },
    "caller_id":       { "link": "https://<instance>.service-now.com/api/now/table/sys_user/681b365ec0a80164000fb0b05854a0cd",      "value": "681b365ec0a80164000fb0b05854a0cd" },
    "opened_at": "2024-03-15 08:12:47",
    "sys_updated_on": "2024-03-15 09:04:12",
    "sys_created_on": "2024-03-15 08:12:47",
    "sys_created_by": "admin",
    "active": "true",
    "category": "inquiry",
    "subcategory": ""
  }
}
```

Key shape rules (these are the ones mocks get wrong most often):
1. **All field values are strings in JSON.** Booleans are `"true"` / `"false"`. Integers are `"1"`, `"2"`. This is not a typo — ServiceNow serializes everything as strings by default. If `sysparm_display_value=all` is used, each field becomes an object, but the inner `value` is still a string.
2. **Reference fields are objects** with `link` (absolute URL back into the Table API) and `value` (the sys_id of the referenced record). The `link` URL must be a valid Table API path for the referenced table.
3. **Dates are `YYYY-MM-DD HH:mm:ss`** in UTC, no timezone offset in the string, no `T` separator, no milliseconds.
4. **Empty strings, not nulls**, are the default for unset optional fields in most APIs. Arrays never contain `null`.
5. **`sys_id` values are 32-char lowercase hex**, no dashes. Each mock generates them inline (e.g. `genSysId()` in the ServiceNow exemplar's `_lib/db.ts`); copy that pattern when standing up a new ServiceNow-shaped mock.

Pagination:
- Response body does not contain total or next links; pagination is surfaced via response headers:
  - `X-Total-Count: <n>` (total matching records; only set when `sysparm_no_count=false`, default)
  - `Link: <url>; rel="next", <url>; rel="prev", <url>; rel="first", <url>; rel="last"`

Error envelope:
```json
{
  "error": {
    "message": "No Record found",
    "detail": "Record doesn't exist or ACL restricts the record retrieval"
  },
  "status": "failure"
}
```
Common status codes: `200 OK` (GET/PUT/PATCH success), `201 Created` (POST success), `204 No Content` (DELETE success), `400 Bad Request`, `401 Unauthorized`, `403 Forbidden` (usually an ACL denial), `404 Not Found`.

### Aggregate API

```
GET /api/now/stats/{table_name}?sysparm_count=true&sysparm_group_by=priority
```
Returns aggregate rows. Used for dashboards.

### Import Set API

```
POST /api/now/import/{staging_table}
```
Rows POSTed here land in the named staging table; transform maps process them into target tables. Useful for bulk-load demos; overkill for most SE demos (mock the Table API instead).

### Scripted REST APIs (SRAs)

Custom, namespaced endpoints customers build themselves. Path shape:
```
/api/<namespace>/<api_name>/<resource_path>
```
Common namespace for a company's custom API is their instance short name (e.g., `acme`). SRAs can define arbitrary methods and payload shapes; they are NOT constrained to the Table API envelope. Mock these only when the SE has a specific scenario.

### Rate limits

Enforced per-instance via inbound REST rate limit rules. Typical defaults are on the order of thousands of requests per hour per user, per table, with warning and violation thresholds configurable per-rule. Exact numbers depend on the instance configuration; cite the customer's actual limits if known. ([ServiceNow docs — Rate limit rules](https://docs.servicenow.com/bundle/washingtondc-api-reference/page/administer/general/concept/inbound-rest-api-rate-limiting.html))

## VISUAL IDENTITY

ServiceNow's modern brand leans green + charcoal + white, with a slate/neutral palette for chrome.

Primary palette:
- Green `#62D84E` (brand primary — the "ServiceNow green" used on the logo and accents)
- Dark Green `#293E40` (deep brand backdrop, sometimes seen on nav strips)
- Charcoal `#161513` (near-black used for the classic nav strip and workspace rails)
- Polar `#FFFFFF` (page background)

Functional grays (approximate; match the current Next Experience / Polaris theme):
- `#F6F7F8` — page background
- `#EEEEF0` — card/surface
- `#DDE0E3` — 1px divider
- `#6B7280` — muted text
- `#161513` — primary text

Status colors (what appears on priority/state badges):
- Critical / P1: `#D63638`
- High / P2: `#F79009`
- Moderate / P3: `#EAB308`
- Low / P4: `#2E90FA`
- Planning / P5: `#98A2B3`

Typography:
- Primary UI font: **Lato** (Google Fonts), with a fallback to `system-ui, -apple-system, "Segoe UI", sans-serif`. ServiceNow shipped a custom typeface (`sn-font`) on Polaris but Lato is a defensible public-CDN choice for mocks.
- Table cells: 13px regular.
- Body text: 14px.
- Section headers: 18px semibold.
- Nav: 14px medium, uppercase for the top-level menu labels in classic UI.

Icon set:
- Real ServiceNow uses an internal icon library ("Now Icons" / Polaris icons). For mocks, use `lucide-react` (already in the project) — the stroke weight and geometry are close enough to pass a glance-test.

Layout primitives (classic UI):
- Left nav (Application Navigator): 240px wide, `#293E40` background, white text, collapsible.
- Top strip ("Connect" / user menu): 32px tall, charcoal.
- Form content area: 24px horizontal padding, 16px vertical gap between sections.
- List view rows: 36px tall, 1px bottom divider.

Layout primitives (workspace / Next Experience):
- Top bar: 48px, white background, thin border.
- Tab strip under top bar: 36px.
- Content: 16px gutter.

## UI PATTERNS

### Application Navigator (classic UI)
The left-hand filterable tree of applications and modules. Users type into the "Filter navigator" input at the top to jump to a module. Tree is grouped by Application (e.g., "Incident", "Change", "Problem"), with modules under each ("Create New", "Open", "All", "Overview"). This is the iconic "looks like ServiceNow" component — a mock without it does not read as ServiceNow.

### List view
A filterable, sortable data grid over a table. Columns are configurable per user. Key affordances:
- Breadcrumb filter row at the top showing the active query (e.g., `Active = true > Priority = 1 - Critical`), with each breadcrumb removable.
- Column headers with sort arrows; right-click header for personalize, group-by, bar-chart-by.
- Row checkbox column on the left, row-action chevron at the left-most edge.
- A gear icon at top-left for view personalization.
- Reference fields render as blue links that open the referenced record.
- Bottom of list shows the paginator: `« < 1 to 20 of 47 > »` format.

### Form view
The single-record editor. Structure:
- Record number badge at top (`INC0010001`), prominent.
- Action buttons across the top: Save, Submit, Resolve, Update, etc. Always right-aligned.
- Two-column field layout for most sections.
- "Related Lists" tabs below the main form: Tasks, Notes, Attachments, Approvals.
- Activity stream on the right side (journal entries + audit events), reverse-chronological.

### Service Portal
End-user facing self-service. Very different visual treatment — tiles and cards, often customer-branded, built from widgets. If mocking a portal, use a lighter chrome.

### Agent / Service Operations Workspace
A modern tabbed work surface for agents handling incidents. Left rail: pinned lists. Main: open record tabs. Right rail: contextual side pane (customer profile, related records). Built as a React app; distinct visual treatment from classic.

## AUTH

Authentication modes a real ServiceNow instance accepts:

1. **Basic Auth** — `Authorization: Basic <base64(user:pass)>`. Enabled by default on most instances; often disabled for prod integrations in favor of OAuth. Useful for quick dev scripts. The user account must have the `soap` role (for SOAP endpoints) or REST API access via ACLs.

2. **OAuth 2.0 (most common for integrations)**:
   - **Password grant**: `POST /oauth_token.do` with `grant_type=password&username=...&password=...&client_id=...&client_secret=...`. Returns access + refresh token.
   - **Authorization Code grant**: redirects user through `/oauth_auth.do?response_type=code&client_id=...&redirect_uri=...`. Exchange code at `/oauth_token.do` with `grant_type=authorization_code`.
   - **JWT Bearer grant**: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` with a signed JWT. For service-to-service without user.
   - **Client Credentials grant**: `grant_type=client_credentials`. Available since Rome release. Requires the OAuth Application Registry to be configured for this grant.

   All token endpoints live at `/oauth_token.do`. Tokens are bearer tokens; pass as `Authorization: Bearer <token>`.

3. **Mutual TLS** — less common; client cert in addition to OAuth.

4. **SAML SSO** — user-facing login; not for server-to-server integration. Not relevant for most integration mocks.

**Default for mocks**: OAuth 2.0 Password grant or Basic Auth. If the demo is about an integration pattern, the OAuth flow is worth showing — mock `/oauth_token.do` to return a fake bearer token.

## KNOWN-IMPOSSIBLE

These are the things ServiceNow cannot do that SEs and customers most often assume it can. If a mock is built to demo one of these, the customer will find out the truth during implementation.

### No websocket or SSE API for record changes
ServiceNow does not expose a websocket or Server-Sent Events endpoint for real-time record change streams. There is no `wss://<instance>.service-now.com/records/stream` or equivalent. Customers who want "live updates" do one of:
- Poll the Table API (often every 15–60 seconds).
- Configure a Business Rule to POST to an external webhook on insert/update (this is outbound, not a subscription the external system initiates).
- Use the MID Server for private-network polling.

If an SE asks for a websocket feed, push back and mock the polling pattern — that's what a real integration would do. Source: [ServiceNow Community — Real-time notification patterns](https://community.servicenow.com/community?id=community_question&sys_id=5c42cf8a1b8b0110f877a8dce54bcb40) (the official answer is "poll").

### No GraphQL (general-purpose)
ServiceNow does not expose a general-purpose GraphQL endpoint over all tables. A "GraphQL Schema" feature exists for building specific custom GraphQL APIs (one schema per Scripted GraphQL API record) but it is not a federated schema over every table. If the demo wants "query any table in GraphQL," that requires the customer to hand-author and maintain a GraphQL schema — mocking it as if it's just there would mislead. ([ServiceNow docs — GraphQL API](https://docs.servicenow.com/bundle/washingtondc-application-development/page/integrate/graphql/concept/scripted-graphql.html))

### No native cross-instance federated queries
A query cannot span two ServiceNow instances in one request. Cross-instance data flows happen via IntegrationHub, Flow Designer with REST actions, or Update Sets — all batched or action-driven, not federated.

### No native field-level change subscription
There is no API to subscribe to "notify me when field X on table Y changes." Customers implement this with Business Rules that POST outbound.

### No raw SQL access over REST
There is no `/api/now/sql` or equivalent. The underlying database is not exposed — all queries go through `sysparm_query` on the Table API or the Aggregate API. Complex JOINs across tables that the schema doesn't model as references aren't possible via REST.

### No single-call "do a flow"
Flow Designer flows can be triggered by REST, but the idiomatic pattern is: create a record in a trigger table → the flow fires on insert → the flow's outputs write back to another record. There is no single-call `POST /api/now/flow/run` that synchronously returns flow outputs the way Zapier's webhook-trigger-return pattern does. Async is the rule.

### No "upsert" on the Table API
`POST /api/now/table/{t}` always creates. `PATCH /api/now/table/{t}/{sys_id}` requires knowing the sys_id. There is no upsert-by-natural-key on the Table API. Customers emulate this with Import Sets + Transform Maps.

### No server-side JavaScript outside of the platform
Scripts run in ServiceNow's sandboxed JS engine (modern V8, older Rhino semantics in some contexts). You cannot `require` arbitrary npm packages or call Node.js APIs. Script Includes are the only reusable module pattern.

## COMMON SE SCENARIOS

### `[REAL]` ITSM Incident intake + assignment
SE wants to show: an incident gets created (via portal, REST, or email), ACL + assignment rules route it to a group, an agent picks it up, moves it through states (New → In Progress → On Hold → Resolved → Closed).
- Mock surfaces: classic UI list view of `incident`, form view, plus `POST /api/now/table/incident` and `PATCH /api/now/table/incident/{sys_id}`.
- This is the exemplar mock in this repo.

### `[REAL]` Service Catalog request fulfillment
SE wants to show: a user submits a catalog item from the Service Portal, a `sc_request` and `sc_req_item` are created, a Flow fulfills it.
- Mock surfaces: portal widget, `sc_request` list view, REST for the request table.
- Caveat: Service Portal chrome is a separate visual treatment; budget time for a portal-specific component set.

### `[REAL]` CMDB lookup for automation
SE wants to show: an external automation queries the CMDB for a CI, uses the response to make a decision.
- Mock surfaces: `GET /api/now/table/cmdb_ci_server` with query params, seed with a handful of realistic server records.

### `[REAL-WITH-CAVEAT]` Change approval workflow
SE wants to show: a change request kicks off an approval chain, approvers receive notifications, approve via a link, the change progresses.
- Caveat: Approval notifications in reality go out as email. For a demo, either mock the approval URL landing page, or frame the demo as "here's what the approver sees" and skip the email step. Do not mock sending real email.

### `[REAL-WITH-CAVEAT]` ITOM event → incident correlation
SE wants to show: monitoring tools POST events, Event Management correlates them, auto-creates an incident.
- Caveat: This is a separate licensed module (ITOM Event Management). Most ITSM-only sandboxes don't have the `em_event` table populated or the correlation engine active. If the customer isn't on ITOM, skip this scenario. If they are, mock the `em_event` POST endpoint and a created `incident` downstream, but flag it.

### `[NOT-SUPPORTED]` Websocket stream of incidents
See KNOWN-IMPOSSIBLE. Refuse and propose polling.

### `[NOT-SUPPORTED]` GraphQL "any table" query
See KNOWN-IMPOSSIBLE. Refuse or scope down to a specific Scripted GraphQL API (which the customer would own).

### `[NOT-SUPPORTED]` Upsert by natural key on Table API
See KNOWN-IMPOSSIBLE. Propose the create-then-search pattern, or Import Sets.

## HYGIENE

Naming conventions to make mock data look right:

- **`sys_id`**: 32-char lowercase hex, no dashes. Example: `46b66a40a9fe1981013806a3bd9d1a0e`. Generate inline per mock — see `genSysId()` in `app/demos/servicenow-itsm-exemplar/_lib/db.ts` for the canonical pattern (uses Node `crypto.randomBytes(16)`).
- **Incident numbers**: `INC` + 7 zero-padded digits. Example: `INC0010001`. Keep the prefix and width consistent with real ServiceNow.
- **Change numbers**: `CHG0030001`
- **Problem numbers**: `PRB0040001`
- **Request numbers**: `REQ0010001` (the request header); request items: `RITM0020001`
- **Task numbers** (generic): `TASK0050001`
- **User sys_ids** follow the same 32-char hex pattern; username fields look like `alice.smith` or `admin` (short, dot-separated).

Dates:
- Always UTC, format `YYYY-MM-DD HH:mm:ss`, no timezone suffix, no `T`.

Fake companies / people for seed data:
- Use "Acme Corp," "Initech," "Wayne Enterprises," "Globex," "Umbrella Corporation"
- User names: pick obviously fictional first/last pairs (Alice Example, Bob Sample, Chris Demo)
- Emails: `@example.com` or `@example.org` — never real domains, never real customer domains
- Phone numbers: `555-xxxx` pattern only

Compliance red flags to never put in seed data, even as jokes:
- Real SSNs or any string that looks like one (`XXX-XX-XXXX`)
- Real credit card numbers (even "test" ones from processors; use `4111 1111 1111 1111` only if you truly need a valid-Luhn demo card)
- Any actual customer name, even from public customer logos — if the customer is in ServiceNow's published logo wall, don't seed their name
- Healthcare identifiers (MRNs, patient IDs), even fake-looking ones, if the demo is not explicitly healthcare-scoped

ACL / scope notes (for mocks that claim to enforce them):
- Real ServiceNow returns `403` when an ACL denies a read; the body includes an `error.message` like `"ACL Exception Update Failed"` or `"No Record found"`. Mocks enforcing ACLs should mimic the 403 body shape, not 401.
- "Application scope" (e.g., `x_acme_app`) prefixes custom tables. If a demo involves a custom scoped app, the table name in URLs becomes `x_acme_app_widget`, not just `widget`.

## SOURCES

- [ServiceNow Table API reference](https://docs.servicenow.com/bundle/washingtondc-api-reference/page/integrate/inbound-rest/concept/c_TableAPI.html)
- [ServiceNow REST API — general concepts](https://docs.servicenow.com/bundle/washingtondc-api-reference/page/integrate/inbound-rest/concept/c_RESTAPI.html)
- [ServiceNow OAuth 2.0 server](https://docs.servicenow.com/bundle/washingtondc-platform-security/page/administer/security/concept/c_OAuthApplications.html)
- [ServiceNow Scripted REST APIs](https://docs.servicenow.com/bundle/washingtondc-application-development/page/integrate/custom-web-services/concept/c_CustomWebServices.html)
- [ServiceNow Aggregate API](https://docs.servicenow.com/bundle/washingtondc-api-reference/page/integrate/inbound-rest/concept/c_AggregateAPI.html)
- [ServiceNow rate limit rules](https://docs.servicenow.com/bundle/washingtondc-api-reference/page/administer/general/concept/inbound-rest-api-rate-limiting.html)
- [ServiceNow Scripted GraphQL](https://docs.servicenow.com/bundle/washingtondc-application-development/page/integrate/graphql/concept/scripted-graphql.html)
- [ServiceNow brand / Polaris design references](https://www.servicenow.com/brand.html) — public brand page for color/logo verification
- [Now Experience Design System](https://developer.servicenow.com/dev.do#!/reference/next-experience/washingtondc/now-experience-overview) — developer portal entry for design system (requires dev account)

Last verified: 2026-04-23. If any API shapes above look wrong in a current instance, update this file before updating any mock.
