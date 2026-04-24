# Jira (Jira Software + Jira Service Management)

Atlassian Jira is the dominant issue-tracker-plus-workflow platform used for software delivery and, via Jira Service Management (JSM), IT service management. For SE demos the two deployment shapes that matter are **Jira Software** (engineering and product teams — sprints, boards, backlogs, releases, issue views) and **Jira Service Management** (IT/HR/facilities service desks — customer request portals, agent queues, SLAs, approvals, asset CMDB). Both are products in the same **Jira Cloud** platform: they share the same tenant URL, REST API root, users, and permission model, and a single Jira site routinely hosts both. Jira Data Center and Jira Server (on-prem) are still common at large enterprises, but the API shape and UI chrome are close enough that one fidelity file covers both — call out DC/Server-specific divergences inline.

A "real" Jira Cloud tenant lives at `https://<your-domain>.atlassian.net/`. REST API roots: `/rest/api/3/` (Jira platform — issues, projects, users, workflows, JQL search) and `/rest/servicedeskapi/` (JSM-specific — service desks, queues, request types, requests, organizations, customers, SLAs). Data Center/Server tenants live at a customer-owned hostname with the same `/rest/api/` and `/rest/servicedeskapi/` prefixes.

## CAPABILITIES

### Data model (shared Jira platform)
- **Issue** is the universal record. Every Jira Software story / bug / epic / subtask AND every JSM customer request is an issue under the hood. Issues have a key (`PROJ-123`, case-sensitive uppercase project key + hyphen + integer), a numeric `id`, a project, an issue type, a status, a resolution, a reporter, an assignee, and fields.
- **Project** is the container. Has a unique key (2–10 chars, uppercase letters/digits, e.g., `SUP`, `INFRA`, `ITSM`), a project type (`software`, `service_desk`, `business`), and a project template. Projects own their issue types, workflows, and permission scheme.
- **Issue types** are per-project and drive which fields and screens apply. Jira Software default set: Epic, Story, Task, Bug, Subtask. JSM default set: Service Request, Incident, Problem, Change (IT project template); Submit a Request, Report an Incident, Request a Change (customer-facing request types wrap these). A single project can use custom issue types.
- **Fields**: system fields (Summary, Description, Assignee, Reporter, Priority, Labels, Components, Due Date, Environment) + custom fields (added per-instance, each with an ID like `customfield_10050`). Custom field types include Text, Paragraph, Number, Date, Date-Time, Checkboxes, Radio, Select (single/multi), User Picker, Group Picker, Cascading Select, Labels, URL, Version Picker.
- **Workflow**: a directed graph of statuses connected by transitions. Each transition has a name, optional conditions, validators, and post-functions. Workflows are assigned per issue type per project.
- **Status** and **Status Category**: statuses belong to one of three fixed categories — `new` (To Do), `indeterminate` (In Progress), `done` (Done). The category drives column color and reporting regardless of the status's actual name.
- **Comments** and **Worklogs** (time tracking) are child collections on issues, each with its own REST sub-resources. Comments support Atlassian Document Format (ADF) rich text including mentions and code blocks.
- **Attachments**: file uploads on issues, accessible via `/rest/api/3/attachment/`.
- **Links / Issue links**: typed directional relationships between issues (blocks/blocked by, relates, duplicates, clones). Not the same as subtasks.
- **Versions**: release marker per-project — `Fix Version/s` and `Affects Version/s` fields on issues point at these.
- **Components**: sub-areas of a project for categorization.
- **Users** (`Atlassian account`): every user has a `accountId` — an opaque stable UUID-like string, e.g., `5b10a2844c20165700ede21g`. GDPR-compliant APIs use `accountId` exclusively; username and email are no longer sent in response bodies by default. Users are Atlassian-wide, not per-Jira-site.
- **Groups**: named sets of users for permissions.

### Data model (JSM-specific, on top of the shared platform)
- **Service desk**: a JSM-typed project surfaced with queue and portal features. Has an ID (`/rest/servicedeskapi/servicedesk/<id>`) and a project key.
- **Request type**: the customer-facing "form" for a kind of request (e.g., "Get IT help," "Request access to a system," "Report a security incident"). Each request type is backed by an issue type + a field mapping + a workflow.
- **Queue**: an agent-facing filtered list of issues in a service desk. Admins define queues with JQL and a column set. Returned by the API as a `PagedDTOQueueDTO` with pages of queues and then each queue yields pages of issues. Only the columns the queue is configured to show are returned per issue.
- **Customer**: a person who files requests — can be an Atlassian account user OR an external email-only "portal-only customer" (JSM is one of the few Atlassian products that treats non-licensed external users as first-class customers).
- **Organization**: a grouping of customers (e.g., "Contoso Corp") used to scope visibility and SLAs.
- **SLA (Service Level Agreement)**: time goals (Time to First Response, Time to Resolution) evaluated against issue events. Each issue carries an SLA timer state: `remainingTime`, `elapsedTime`, `breached`, `paused`, `completed`.
- **Approval**: a first-class JSM construct — an issue can enter an approval state where named approvers must decide. Exposed at `/rest/servicedeskapi/request/<idOrKey>/approval`.
- **Knowledge base** integration with Confluence: JSM request types can surface KB articles in the portal and in the agent view. API at `/rest/servicedeskapi/knowledgebase/`.
- **Assets (formerly Insight)**: JSM's CMDB for tracking physical and logical assets (laptops, VMs, services). Assets has its own API at `/rest/servicedeskapi/assets/` and `/jsm/assets/workspace/<id>/v1/`. Assets objects have a typed schema (Object Types → Attributes), reference-able from issues via custom fields.

### UI surfaces
- **Jira Software**: Global top navigation + per-project left sidebar + content area. Key surfaces: Backlog, Board (kanban / scrum), Timeline (Gantt-style Advanced Roadmaps), Issue view (full page or side-panel), Reports, Releases, Code (integrated with GitHub/Bitbucket).
- **Jira Service Management (agent view)**: Same global nav + left sidebar with JSM-specific items — Queues, Requests, Customers, Knowledge base, Assets, Reports, SLAs, Channels (email, portal, chat, API). Agents work primarily in Queues.
- **JSM Customer Portal**: `https://<your-domain>.atlassian.net/servicedesk/customer/portals` — separate, minimal-chrome surface for end-user customers. Single header, centered content, brandable per service desk. Customers see only request types, their own requests, and KB articles.
- **Issue view anatomy** (same shape in Software and JSM): Breadcrumb + key, Summary (inline-editable), Status pill (click → transition dropdown), Priority, Assignee, three-column layout (Description + Activity / Child issues + Links / Details + Dates). JSM adds SLA timers and Approval panel.
- **Dashboards / Filters**: saved JQL-based queries and gadget compositions. Available in both products.

### Automation
- **Jira Automation (rule engine)**: Atlassian's built-in no-code automation. Triggers (issue created, updated, transitioned, commented; scheduled; manual; incoming webhook) → conditions → actions (edit issue, transition, comment, send email, web request, log action). Global rules, project rules, multi-project rules. Rules have execution limits per tier. Jira Automation replaces what used to be done with ScriptRunner or Adaptavist for most customers.
- **Workflow post-functions**: legacy per-transition hooks run server-side on transition. Limited to pre-built functions; custom post-functions require a Connect or Forge app.
- **Forge functions**: Atlassian's serverless app platform (Forge), running on AWS Lambda under the hood. Forge apps can add custom UI, webhooks, and triggers. Forge is the modern extensibility surface for Jira Cloud.
- **Connect apps**: older iframe-and-JWT extensibility model. Still supported; most paid apps in the Marketplace are Connect.
- **Webhooks**: per-issue-event outbound webhooks. Created via UI (Jira settings → System → Webhooks) or REST (`/rest/api/3/webhook`). Subscribe to events like `jira:issue_created`, `jira:issue_updated`, `comment_created`, `worklog_updated`. **Cloud webhooks created via API expire after 30 days** and must be refreshed.
- **Scheduled jobs**: Jira Automation supports scheduled rules with cron-like syntax (limits apply per tier).

### Integration
- **REST API v3**: the primary, modern integration surface. Covered in `## API SURFACE` below.
- **REST API v2**: still available and functionally near-identical to v3. The main differences are ADF (v3 uses Atlassian Document Format for rich text fields like Description and comment bodies; v2 uses wiki-markup strings). For greenfield integrations use v3.
- **JSM REST API** at `/rest/servicedeskapi/` — separate path root but shares auth, tenant URL, and conceptually wraps the Jira platform API with service-desk semantics.
- **JQL (Jira Query Language)**: the universal query language for issues. Same syntax in the UI search, in saved filters, in Automation conditions, and in the `/search/jql` endpoint body.
- **Atlassian Document Format (ADF)**: JSON document format for rich text in v3. Used in `description`, `comment.body`, `environment`, and any paragraph custom field.
- **Webhooks (outbound)**: HTTP POST to a registered URL on issue events. Payload is JSON with issue + changelog + user + timestamp.
- **Import/Export**: CSV import (manual, UI-driven), JSON backup/restore (full site), Project-level import from GitHub/Trello/Asana (one-time UI flow). No streaming CDC.
- **Jira DC / Server APIs**: base URL is the customer's hostname; paths are `/rest/api/2/` (DC/Server has always been v2) and `/rest/servicedeskapi/`. Auth differs (Personal Access Tokens on DC, not OAuth 3LO).

### Admin
- **Permission schemes**: per-project set of permission → principal mappings (Browse Projects, Create Issues, Edit Issues, Transition Issues, etc.). Principals are users, groups, project roles, or field references (Reporter, Assignee).
- **Notification schemes**: per-project set of event → recipient mappings.
- **Issue type schemes / Issue type screen schemes / Screen schemes / Field configuration schemes**: the "schemes-of-schemes" config layer that determines which fields appear on which screen for which issue type in which project. Customer admins spend a lot of time here.
- **Project roles**: named roles (Administrator, Developer, etc.) that projects populate with users/groups.
- **Global permissions**: site-wide (Administer Jira, Create Shared Objects, etc.).
- **Site admin (Atlassian Admin Hub)**: organization-level admin at `https://admin.atlassian.com` — managed domains, billing, product access, SAML/SSO, user provisioning (SCIM).

## API SURFACE

Base URL patterns:
- **Jira Cloud**: `https://<your-domain>.atlassian.net` — single tenant URL for all Jira + JSM + Confluence products on that site. (Source: [Atlassian Basic auth for REST APIs example](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/).)
- **Connect/Forge apps (OAuth 2.0)**: requests go through `https://api.atlassian.com/ex/jira/<cloudId>/rest/api/3/...`, where `cloudId` is a UUID obtained from the `/oauth/token/accessible-resources` endpoint after the 3LO flow. (Source: [Atlassian OAuth 2.0 3LO](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/).)
- **Jira Data Center / Server**: `https://<customer-host>` with `/rest/api/2/` and `/rest/servicedeskapi/`. No `api.atlassian.com` proxy.

API roots:
- `/rest/api/3/` — Jira platform (issues, projects, users, workflows, JQL search, permissions, screens, fields, webhooks, etc.) ([Jira Cloud platform REST API v3 intro](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/))
- `/rest/api/2/` — older version, still available, uses wiki markup instead of ADF
- `/rest/servicedeskapi/` — JSM-specific (service desks, queues, request types, requests, organizations, approvals, SLAs) ([JSM Cloud REST API intro](https://developer.atlassian.com/cloud/jira/service-desk/rest/intro/))
- `/rest/agile/1.0/` — Jira Software boards, sprints, backlogs (historically `/rest/greenhopper/` in DC)
- `/jsm/assets/workspace/<id>/v1/` — JSM Assets (CMDB) queries
- `/gateway/api/jsm/ops/` — JSM Ops (incident response) on Cloud

### Authentication on requests

All modes below land in an `Authorization` HTTP header. Default content type for write operations is `application/json` (`application/xml` accepted on a few legacy endpoints; stick with JSON).

- **Basic Auth with API token** — `Authorization: Basic <base64(email:api_token)>`. The user generates an API token at `https://id.atlassian.com/manage-profile/security/api-tokens`, then the client base64-encodes the literal string `email@example.com:<api_token>` (single colon separator; the token is treated as the password). This is the default for scripts and one-off integrations. (Source: [Basic auth for REST APIs](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/).) Example `curl`:
  ```
  curl -D- -u 'email@example.com:<api_token>' \
       -X GET -H "Content-Type: application/json" \
       https://your-domain.atlassian.net/rest/api/3/issue/PROJ-123
  ```
- **OAuth 2.0 (3LO) — authorization code grant** — the user-impersonating app flow. App redirects user to `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=<id>&scope=<scopes>&redirect_uri=<cb>&state=<nonce>&response_type=code&prompt=consent`. User consents on Atlassian, returns with `?code=...&state=...`. App POSTs to `https://auth.atlassian.com/oauth/token` with `grant_type=authorization_code`, `code`, `client_id`, `client_secret`, `redirect_uri` and receives `{ access_token, refresh_token, expires_in, scope }`. Access tokens are used as `Authorization: Bearer <access_token>` against `https://api.atlassian.com/ex/jira/<cloudId>/...`. Refresh tokens are **rotating** — every use returns a new refresh token; the old one is invalidated. (Source: [Atlassian OAuth 2.0 3LO apps](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/) and [Implementing OAuth 2.0 (3LO)](https://developer.atlassian.com/cloud/oauth/getting-started/implementing-oauth-3lo/).)
- **OAuth 2.0 (2LO) / client credentials** — supported only for **Connect app server-to-server impersonation** via `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer`, not a generic machine-to-machine grant. Customers looking for M2M typically use a service account + API token under Basic Auth, or a Forge-automation-trigger pattern.
- **Forge apps** use Atlassian-issued JWTs injected into the app runtime; app code calls `api.asApp()` or `api.asUser()` and the Forge SDK handles auth. App developers do not see the token themselves.
- **Connect apps** authenticate with a per-request HS256-signed JWT (`Authorization: JWT <token>`) where the claims include `iss` (app key), `qsh` (query string hash), `iat`, `exp`. Signed with the shared secret exchanged during installation.
- **Jira Data Center / Server**: supports Basic Auth with username + password, OAuth 1.0a (legacy), and **Personal Access Tokens** — `Authorization: Bearer <PAT>`. PATs are the DC equivalent of Cloud API tokens.

### Issue — the core endpoints

Create an issue:
```
POST /rest/api/3/issue
Content-Type: application/json
Authorization: Basic ...
```
Request body:
```json
{
  "fields": {
    "project":   { "key": "SUP" },
    "issuetype": { "name": "Service Request" },
    "summary":   "Laptop won't boot",
    "priority":  { "name": "Medium" },
    "reporter":  { "accountId": "5b10a2844c20165700ede21g" },
    "description": {
      "type": "doc",
      "version": 1,
      "content": [
        { "type": "paragraph", "content": [
          { "type": "text", "text": "Power LED blinks 3 times, no POST." }
        ]}
      ]
    },
    "labels": ["hardware", "urgent"],
    "customfield_10050": "ASSET-0042"
  }
}
```
Success response `201 Created`:
```json
{
  "id": "10042",
  "key": "SUP-42",
  "self": "https://your-domain.atlassian.net/rest/api/3/issue/10042"
}
```
Create is **minimal** — it does not echo the full issue. Clients that need the persisted shape must follow with `GET /rest/api/3/issue/<idOrKey>`.

Get an issue:
```
GET /rest/api/3/issue/{issueIdOrKey}
GET /rest/api/3/issue/{issueIdOrKey}?fields=summary,status,assignee&expand=changelog,renderedFields,names
```
Response (abbreviated):
```json
{
  "id": "10042",
  "key": "SUP-42",
  "self": "https://your-domain.atlassian.net/rest/api/3/issue/10042",
  "fields": {
    "summary": "Laptop won't boot",
    "issuetype": { "id": "10003", "name": "Service Request",
                   "iconUrl": "https://..." },
    "status":    { "id": "10001", "name": "To Do",
                   "statusCategory": { "key": "new", "name": "To Do",
                                       "colorName": "blue-gray" } },
    "priority":  { "id": "3", "name": "Medium", "iconUrl": "https://..." },
    "assignee":  { "accountId": "5b10a2844c20165700ede21g",
                   "displayName": "Jane Davis" },
    "reporter":  { "accountId": "5b10a2844c20165700ede21g",
                   "displayName": "Jane Davis" },
    "created":   "2026-04-23T14:25:13.000-0400",
    "updated":   "2026-04-23T14:25:13.000-0400",
    "labels":    ["hardware", "urgent"],
    "customfield_10050": "ASSET-0042"
  }
}
```

Update an issue (partial):
```
PUT /rest/api/3/issue/{issueIdOrKey}
{ "fields": { "priority": { "name": "High" } } }
```
`204 No Content` on success. `PUT` is **partial update semantics** — only the fields present in the body change. This is not strictly a PATCH because an empty `fields` object is illegal; callers must send at least one field.

Transition an issue (change status):
```
POST /rest/api/3/issue/{issueIdOrKey}/transitions
{ "transition": { "id": "21" }, "fields": { "resolution": { "name": "Done" } } }
```
`204 No Content` on success. Transition IDs come from `GET /rest/api/3/issue/{key}/transitions`. Transitions can have required fields (e.g., must set `resolution` on close) and validators.

Delete:
```
DELETE /rest/api/3/issue/{issueIdOrKey}?deleteSubtasks=true
```

### JQL search (the canonical list endpoint)

As of 2025 the legacy `/rest/api/3/search` endpoint was removed; use `/rest/api/3/search/jql`. Both `GET` and `POST` are supported; `POST` is preferred for long JQL strings.

```
POST /rest/api/3/search/jql
Content-Type: application/json
```
Request body:
```json
{
  "jql": "project = SUP AND status != Done ORDER BY created DESC",
  "maxResults": 50,
  "nextPageToken": null,
  "fields": ["summary", "status", "priority", "assignee"],
  "expand": "names"
}
```
Response:
```json
{
  "issues": [
    {
      "id": "10042", "key": "SUP-42",
      "fields": { "summary": "Laptop won't boot", "status": { "name": "To Do" }, ... }
    },
    { "id": "10043", "key": "SUP-43", "fields": { "..." : "..." } }
  ],
  "nextPageToken": "CAMQAA==",
  "isLast": false
}
```
Pagination is token-based: the client re-sends the request with `nextPageToken` set to the value returned. When `isLast: true`, there are no more pages. The old `startAt` / `total` fields from the deprecated endpoint are gone. (Source: [Jira Cloud REST API — Issue search](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/).)

### JSM — Request endpoints (customer-facing semantics)

Create a customer request (preferred over `POST /rest/api/3/issue` for JSM because this endpoint accepts a `requestTypeId` and does the field mapping):
```
POST /rest/servicedeskapi/request
```
Body:
```json
{
  "serviceDeskId": "10",
  "requestTypeId": "25",
  "requestFieldValues": {
    "summary": "Laptop won't boot",
    "description": "Power LED blinks 3 times, no POST."
  },
  "raiseOnBehalfOf": "customer@example.com"
}
```
Response (abbreviated):
```json
{
  "issueId": "10042",
  "issueKey": "SUP-42",
  "requestTypeId": "25",
  "serviceDeskId": "10",
  "reporter": { "accountId": "5b10a2844c20165700ede21g",
                "displayName": "Jane Davis",
                "emailAddress": "customer@example.com" },
  "currentStatus": { "status": "Waiting for support",
                     "statusCategory": "NEW",
                     "statusDate": { "iso8601": "2026-04-23T14:25:13.000-0400" } }
}
```

List queues in a service desk:
```
GET /rest/servicedeskapi/servicedesk/{serviceDeskId}/queue?includeCount=true
```
Response (paged DTO):
```json
{
  "_expands": [], "size": 3, "start": 0, "limit": 50, "isLastPage": true,
  "_links": { "self": "...", "context": "...", "base": "..." },
  "values": [
    { "id": "1", "name": "All open requests", "jql": "...",
      "fields": ["summary","reporter","priority","created"],
      "issueCount": 42 },
    { "id": "2", "name": "Waiting for support", "issueCount": 12 },
    { "id": "3", "name": "Waiting on customer", "issueCount": 7 }
  ]
}
```
Get issues in a queue:
```
GET /rest/servicedeskapi/servicedesk/{serviceDeskId}/queue/{queueId}/issue
```
**Only the fields the queue is configured to show** are returned per issue — not the full issue. To get full shape, fetch each issue individually from `/rest/api/3/issue/{key}`. (Source: [JSM Queue API](https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-servicedesk/).)

Approvals (JSM-specific):
```
GET /rest/servicedeskapi/request/{idOrKey}/approval
POST /rest/servicedeskapi/request/{idOrKey}/approval/{approvalId}  # approve/decline
{ "decision": "approve" }
```

SLA information on a request:
```
GET /rest/servicedeskapi/request/{idOrKey}/sla
```
Response shape includes `ongoingCycle` and `completedCycles` with breach timestamps, elapsed ms, remaining ms.

### User lookup

GDPR-compliant endpoints; always return `accountId`, never email by default.
```
GET /rest/api/3/user/search?query=jane@example.com
GET /rest/api/3/user?accountId=5b10a2844c20165700ede21g
```
The `query` parameter against `user/search` does a prefix match on `displayName` and `emailAddress`; note Atlassian restricts email visibility per the user's privacy settings.

### Pagination

Two distinct models in active use:
- **Token-based (`nextPageToken` / `isLast`)**: new JQL search endpoint `/rest/api/3/search/jql`, Assets queries.
- **Offset-based (`startAt` / `maxResults` / `total` or `isLastPage`)**: everything else — `/rest/api/3/user/search`, `/rest/servicedeskapi/servicedesk/{id}/queue`, webhook lists, etc. Response includes `startAt`, `maxResults`, and either `total` or `isLastPage`.

Mocks of either pattern must match the one the real endpoint uses — do not mix.

### Error envelope

`application/json` response with this shape on 4xx/5xx:
```json
{
  "errorMessages": ["Issue does not exist or you do not have permission to see it."],
  "errors": {}
}
```
Field-level validation errors populate `errors` as a map keyed by field ID:
```json
{
  "errorMessages": [],
  "errors": {
    "summary": "Summary is required.",
    "duedate": "Date is invalid."
  }
}
```
Common status codes: `200 OK`, `201 Created`, `204 No Content`, `400 Bad Request` (validation), `401 Unauthorized` (no/invalid credential), `403 Forbidden` (permission denied — often looks like `404` to hide existence), `404 Not Found`, `409 Conflict` (concurrent edit — rare), `429 Too Many Requests`, `5xx`.

### Rate limits

Jira Cloud enforces a multi-layered rate limit model. (Source: [Jira Cloud rate limiting](https://developer.atlassian.com/cloud/jira/platform/rate-limiting/).)
- **Tier 1 — Global Pool**: 65,000 points per hour per cloud, shared across all tenants an app reaches. Each operation costs a point value published per endpoint.
- **Tier 2 — Per-Tenant Pool**: scales with the tenant's edition (Free / Standard / Premium / Enterprise) and licensed user count. Larger tenants get a bigger pool.
- **Per-endpoint burst**: default `GET` 100/s, `POST` 100/s, `PUT` 50/s, `DELETE` 50/s per tenant.
- **Per-issue write protection**: `20` write operations per `2` seconds AND `100` writes per `30` seconds on a single issue. This exists because customers' automation rules can otherwise hammer one ticket.

On a `429 Too Many Requests`, the response includes:
- `Retry-After: <seconds>` — standard HTTP; always honor.
- `X-RateLimit-Limit: <n>`, `X-RateLimit-Remaining: <n>`, `X-RateLimit-Reset: <unix ts>` — current bucket state.
- `RateLimit-Reason` — one of: `jira-quota-global-based`, `jira-quota-tenant-based`, `jira-burst-based`, `jira-per-issue-on-write`. This tells the client which limit they hit.

Mocks of Jira write endpoints should set `Retry-After` and `RateLimit-Reason` headers on any 429 response so that integrations' retry logic exercises correctly.

## VISUAL IDENTITY

Jira Cloud (and JSM agent view) share the **Atlassian Design System** — the token-based design language shipped as `@atlaskit/*` components and `@atlaskit/tokens`. Dark mode is a first-class theme; every color is a token that maps to two values. (Source: [Atlassian Design — Color](https://atlassian.design/foundations/color) and [Design tokens](https://atlassian.design/foundations/tokens/design-tokens).)

Primary brand palette (light theme hex values; tokens in parentheses):
- Jira Blue primary `#0052CC` (`color.icon.brand` / `color.link`) — the classic Jira accent, on primary buttons and active nav.
- Jira Blue bold `#0747A6` — hover / pressed.
- Atlassian Blue `#0065FF` — secondary accent.
- Nav top bar background `#FFFFFF` in the modern chrome (was navy `#0747A6` in legacy Jira Cloud; most tenants are on the modern white-topbar chrome as of 2024). Border under nav: `#DFE1E6`.
- Left sidebar background `#FAFBFC` with `#DFE1E6` divider.

Status category colors (these drive workflow columns and status pill backgrounds — tokens `color.background.accent.{color}.subtler` etc.):
- Blue-gray (To Do) — pill bg `#DFE1E6`, text `#42526E`.
- Blue (In Progress) — pill bg `#DEEBFF`, text `#0747A6`.
- Green (Done) — pill bg `#E3FCEF`, text `#006644`.
- Yellow (Warning / SLA at risk) — pill bg `#FFF0B3`, text `#974F0C`.
- Red (Breached / Error) — pill bg `#FFEBE6`, text `#BF2600`.
- Purple (optional — used for selective statuses) — pill bg `#EAE6FF`, text `#403294`.

Functional neutrals:
- Text primary `#172B4D`.
- Text secondary `#6B778C`.
- Divider `#DFE1E6`.
- Surface `#FFFFFF`.
- Surface raised `#FFFFFF` with shadow `0 1px 1px rgba(9,30,66,0.25), 0 0 1px 0 rgba(9,30,66,0.31)`.
- Background tint `#F4F5F7` — app background behind cards.

Priority icons (real Jira uses its own SVG set):
- Highest — up-double-arrow red `#CD1F1F`.
- High — up-arrow red `#E9503F`.
- Medium — right-arrow yellow `#E9A93F`.
- Low — down-arrow green `#57A55A`.
- Lowest — down-double-arrow green `#2E7033`.

Typography (source: [Atlassian Design — Typography](https://atlassian.design/foundations/typography/)):
- Primary UI font: **Atlassian Sans** (shipped by Atlassian as a web font). Fallback stack in mocks: `"Inter", "Helvetica Neue", Arial, sans-serif`. Marketing pages use **Charlie Sans**, but the in-product UI is Atlassian Sans.
- Monospace: **Atlassian Mono**. Fallback: `"SF Mono", "Menlo", "Consolas", monospace`.
- Body default: 14px / line-height 20px / weight 400.
- Heading large: 24px / semibold (700 on headings, 500 for section labels).
- Heading medium: 20px / semibold.
- Heading small: 16px / semibold.
- Small / secondary: 12px / weight 400.
- Issue key + code blocks: monospace 14px.

Iconography:
- Real Jira uses **@atlaskit/icon** + **@atlaskit/icon-object** (custom SVGs with defined sizes: 16, 24, 32, 40). For mocks, `lucide-react` is a pragmatic fallback at 16px for sidebar icons and 20px for toolbar icons.

Layout primitives:
- Top global nav bar: 56px, white background, 1px `#DFE1E6` border-bottom. Left side: Atlassian product switcher (9-dot) → product switcher → project switcher → "Recent" → "Starred" → "Your work" → "Filters" → "Dashboards" → "People". Right side: Create button (Jira blue) → search → notifications → help → app switcher → avatar.
- Per-project left sidebar: 240px expanded / 56px collapsed, `#FAFBFC` background. Contains project avatar + name + type badge at top, section headings + list of views (Backlog, Board, Timeline, Releases, Reports, Components, Issues) for Software; (Queues, Requests, Customers, Knowledge base, Reports, Channels, Assets) for JSM.
- Content area: 24px padding (page), 16px padding (cards).
- Issue view: full-page or slide-in right panel (~720px wide). Slide-in has become more common in the modern UI.

## UI PATTERNS

### Jira Software — Issue view

Full-page (`/browse/SUP-42`) or slide-over (opened by clicking a card from a board):

1. **Breadcrumb** — project icon + name → parent epic (if any) → issue type + key. `SUP-42` is a clickable copy-link.
2. **Summary** — large (24px semibold), inline-editable on click. Type-to-edit, Enter to save, Esc to cancel.
3. **Action row** — status pill (click → list of valid transitions with an optional comment-on-transition box), "Actions" menu (Delete / Export / Clone / Move), Watch, Vote, Share, Give feedback.
4. **Three-column body**:
   - **Left (main)**: Description (ADF rich-text editor, rendered markdown with slash-commands), Attachments, Child issues (if epic), Linked issues, Activity tabs (Comments / History / Work log), Comment composer pinned at bottom.
   - **Right (sidebar)**: Details block — Assignee (with user picker), Reporter, Priority (icon + dropdown), Labels (chip input), Development (GitHub/Bitbucket PR links), Sprint, Story points, Epic link, Parent.
   - **Bottom right**: Dates — Created, Updated. Configured status category and timestamp.

### Jira Software — Board (Kanban or Scrum)

- Horizontal swimlanes across the top of the content area, one column per status (mapped 1-to-many into columns via board configuration).
- Each card: issue type icon + key + summary + priority icon + assignee avatar + story points pill (if Scrum).
- Drag card between columns to transition the issue.
- Top controls: Sprint selector (Scrum), Search, Epic filter, Assignee filter, Label filter, "Only my issues" toggle, "Insights" panel toggle (right side slide-in with board metrics).
- Column headers show count and WIP limit if configured.

### Jira Software — Backlog

- Two collapsible sections: current Sprint(s) at top, Backlog at the bottom.
- Each issue is a row, not a card — more scannable.
- Drag between Sprint and Backlog sections. Right-click for bulk actions.
- Right sidebar: "Epics" panel (filter by epic) and "Versions" panel. Both collapsible.
- Top bar: search, Start sprint / Complete sprint button.

### JSM — Queue view (agent)

Landing view for JSM agents. (Source: [JSM Queue API](https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-servicedesk/).)

- Left sidebar lists named queues (admin-defined JQL + column set): "All open", "Incidents", "SLA at risk", "Waiting for approval", "My open requests."
- Selecting a queue loads a table of issues in the main pane. Columns are the ones the queue is configured to show — may be Summary, Priority, Reporter, Created, SLA: Time to First Response, SLA: Time to Resolution.
- SLA cells render a countdown chip: green (more than 20% remaining), yellow (1–20%), red (breached). Hover for exact timestamp.
- Row click opens the full issue view (same three-column layout as Jira Software, plus SLA panel and Approval panel on the right).

### JSM — Customer Portal

- Separate URL: `https://<tenant>.atlassian.net/servicedesk/customer/portal/<portalId>`.
- Minimal chrome — only a top header (service desk name + customer avatar + "Requests") and a centered content area.
- Landing page: catalog of request types grouped into categories ("Get IT help", "Access / authentication", "Report an incident"). Each request type is a tile with icon + name + short description.
- Clicking a request type opens its form — a simple label/input/textarea layout generated from the request type's field mapping. No workflow view, no internal field names.
- Submit lands on a confirmation page with the issue key (e.g., `SUP-42`) and a "Track this request" link.
- "Requests" top-right links to the customer's own requests list — only their own (or their organization's, if the portal is organization-scoped).

### JSM — Request detail (agent view)

Full Jira issue view plus JSM-specific panels:
- **SLA panel** (right sidebar, above Details): list of active and completed SLAs with countdown chips.
- **Approvals panel**: named approvers with Approve / Decline buttons, approval history.
- **Customer context card**: customer's organization, previous requests count, VIP badge if applicable.
- **Channel indicator**: small badge on the issue header showing how the request came in (Portal / Email / API / Chat / Widget).

### Comment composer (both products)

- ADF-backed rich text editor with slash commands (`/` opens a menu of insert options — mention, emoji, code, attachment, link, table).
- Visibility selector (agent-only vs. shared with customer) — **JSM-specific**; regular Jira has only a single visibility level per project permission.
- `@mention` populates with users from the project; adds them as watchers.

## AUTH

Authentication modes a real Jira Cloud instance accepts:

1. **Basic Auth with API token** — `Authorization: Basic <base64(email:api_token)>`. User generates a token at `https://id.atlassian.com/manage-profile/security/api-tokens`. Default for scripts and one-off integrations. Works against `https://<your-domain>.atlassian.net/` directly. (Source: [Basic auth for REST APIs](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/).)

2. **OAuth 2.0 (3LO) — authorization code grant**. User-consent-required integrations. Apps register in the developer console, users authorize via `https://auth.atlassian.com/authorize?...`, app exchanges code for access token + rotating refresh token at `https://auth.atlassian.com/oauth/token`. Access tokens are bearer: `Authorization: Bearer <access_token>`. Requests go through `https://api.atlassian.com/ex/jira/<cloudId>/...`. Scopes are fine-grained (`read:jira-work`, `write:jira-work`, `manage:jira-project`, `read:servicedesk.request`, etc.). (Source: [OAuth 2.0 3LO apps](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/).)

3. **Forge** (Atlassian's serverless app platform). Apps run on AWS Lambda; Atlassian injects JWTs; app code uses `api.asApp()` / `api.asUser()`. No token handling by the app author.

4. **Connect** (legacy app framework). Apps run as hosted iframes; HS256-signed JWTs on every request (`Authorization: JWT <token>`). Install-time shared secret.

5. **Jira Data Center / Server**:
   - **Basic Auth** with username + password (disabled on most Cloud tenants as of 2019+, still common on DC).
   - **Personal Access Tokens** — `Authorization: Bearer <PAT>`. DC equivalent of Cloud API tokens.
   - **OAuth 1.0a** — legacy 3LO for DC. Rare in new integrations.

**Default for mocks**: Basic Auth with API token for single-tenant SE demos (most realistic, matches what customers paste into a "test my integration" form). OAuth 2.0 3LO only if the demo specifically involves the multi-tenant / published-app case. Always accept both `/rest/api/3/` and `/rest/api/2/` as aliases on mocks unless the feature requires ADF — v2 is still everywhere.

## KNOWN-IMPOSSIBLE

Things Jira cannot do that SEs and customers routinely assume it can. Demoing these will blow up during implementation.

### No server-side code running inside Jira Cloud
On Cloud, customers cannot write a Jira-hosted script that fires on an issue event. The options are:
- **Jira Automation rules** — no-code, runs server-side, but limited to pre-built actions.
- **Forge functions** — code runs on Atlassian-hosted Lambda, but the app must be installed from the Marketplace or privately via the developer console.
- **Connect apps** — code runs on the vendor's own hosting, invoked via webhook.

If an SE wants to demo "write a custom script that fires when an issue transitions," the truthful answer is Forge (which is a non-trivial app to set up) or an external webhook consumer. Do not mock a "custom JavaScript in Jira" editor — that UI does not exist on Cloud. (Jira DC still has ScriptRunner and Adaptavist's scripting, but it's separate-product and not part of Jira itself.)

### Custom field types are not user-extensible on Cloud
Customers can add custom fields of Jira's built-in types (Text, Number, Select, etc.) but cannot define a new field TYPE. New field types require a Connect or Forge app. Be careful demoing "a totally custom field with unique rendering" — the real path is Marketplace app territory.

### No arbitrary change-data-capture subscription
There is no "subscribe to everything that happens in Jira" API. The real surfaces are:
- Outbound webhooks (per-event, per-JQL-filter). Cloud REST-created webhooks **expire after 30 days**.
- Jira Automation → "Send web request" action.
- Forge event triggers.

Polling `/rest/api/3/search/jql` with `updated >= -5m` works but hammers the rate limit. Do not mock a WebSocket / SSE change feed — it does not exist.

### Webhook delivery is not guaranteed
Atlassian makes no delivery guarantees on webhooks. No retries, no at-least-once semantics. If a webhook receiver is down when the event fires, the event is lost. Customers handling high-trust workflows must implement reconciliation via polling on top. Mocks that imply "webhook is a reliable integration pattern" mis-sell.

### No native cross-site / cross-cloud queries
A JQL search hits one Jira site. Customers running multiple Atlassian sites (common for M&A or regional isolation) have no REST endpoint that searches across them. Cross-site reporting goes through Atlassian Analytics (separate product) or via a federation layer the customer builds.

### Email channel into JSM is not instantaneous and not rich
JSM's email-to-request gateway polls the configured mailbox on a schedule (default ~1 minute). Attachments are supported but there is a file size limit, and rich HTML in emails is downgraded aggressively. "The customer emails us and we see it within 5 seconds and with full original formatting" is not true. Adjust demo scripts accordingly.

### JSM approval is not a full workflow engine
JSM's Approval is a single step: one group of approvers, approve/decline, issue moves on. Multi-step conditional approvals ("requires manager AND director if amount > $5,000") require either:
- Jira Automation to branch into multiple approval issues.
- A Marketplace app (e.g., ProForma / Appfire).
- Externalization to an approval platform.

Do not mock "branching approval trees" as a JSM-native feature.

### SLA math is opinionated — you cannot override the calendar on-the-fly
SLAs respect per-service-desk calendars (business hours) and per-goal pause/resume conditions. They are re-evaluated on issue events. You cannot set an SLA remaining time directly via API — you can only trigger events that the SLA config responds to.

### Jira does not natively render Markdown (it renders ADF / wiki)
Many customers assume they can POST a Markdown string in the Description field. The v3 API requires ADF (structured JSON). The v2 API accepts wiki markup, which is close to Markdown but is not Markdown (e.g., bold is `*text*` not `**text**`). Mocks posting a bare Markdown string will look wrong.

### No bulk transition in one API call
`POST /rest/api/3/issue/{key}/transitions` is per-issue. There is no `POST /rest/api/3/issues/transitions` that accepts an array. Bulk operations go through the "Bulk change" UI (which is a sequence of REST calls under the covers) or Jira Automation's rule-over-filter pattern.

### No per-field history query
You can fetch an issue's full changelog (`?expand=changelog`) but there's no API that says "give me every change to the Priority field across all issues in project SUP." Reporting of this shape requires either Jira Automation + a log issue, or exporting to a warehouse.

## COMMON SE SCENARIOS

### `[REAL]` Incident sync from observability into JSM
SE wants to show: a monitoring alert fires, a JSM incident is created with the right fields, and an agent is notified.
- Mock surface: JSM agent view — "Incidents" queue + request detail with the SLA timer running and a link back to the source alert.
- API layer: `POST /rest/servicedeskapi/request` with `serviceDeskId` + `requestTypeId` for an Incident + `requestFieldValues` containing the alert payload mapped to custom fields.
- Honest caveat: JSM has a built-in Ops product (formerly Opsgenie). If the customer already has JSM Ops, route through that; otherwise, a JSM "Incident" request type is the correct shape.

### `[REAL]` Issue intake into Jira Software from an external portal
SE wants to show: users submit a bug report on a website, a Jira issue is created in the right project with the right issue type.
- Mock surface: external portal form → POST handler → Jira issue created.
- API layer: `POST /rest/api/3/issue` with `fields.project.key`, `fields.issuetype.name`, `fields.summary`, `fields.description` (ADF).
- Gotcha: the `reporter` field must be an existing Atlassian account. Anonymous-submit needs a service-account reporter pattern.

### `[REAL]` Status sync from Jira to Elementum (outbound webhook)
SE wants to show: when a Jira issue transitions, a downstream system picks up the new status.
- Mock surface: webhook registration UI + recent deliveries log.
- API layer: register with `POST /rest/api/3/webhook` (returns a webhook ID; **expires in 30 days** on Cloud — must be refreshed). Subscribed events: `jira:issue_updated` + JQL filter.
- Honest caveat: delivery is not guaranteed; customers should reconcile via polling.

### `[REAL-WITH-CAVEAT]` SLA breach alerting from JSM
SE wants to show: when an SLA is at risk or breached, a notification fires.
- API layer: JSM Automation rule with trigger "SLA at warning / breach" + action "Send web request." No direct SLA event in the core REST API.
- Caveat: "at warning" is driven by the per-SLA goal configuration (`remainingTime < threshold`). Mock should show the Automation rule builder, not imply a standalone SLA webhook surface.

### `[REAL]` Agent updates an issue from Elementum (status + comment)
SE wants to show: an Elementum agent triages a ticket, adds a comment, and transitions the issue.
- Mock surface: issue view with a new comment and the status pill flipped.
- API layer: `POST /rest/api/3/issue/{key}/comment` (body in ADF) + `POST /rest/api/3/issue/{key}/transitions` with the transition ID.
- Gotcha: comment visibility. For JSM, use `properties: [{ key: "sd.public.comment", value: { internal: true } }]` to mark an internal comment.

### `[REAL]` Bulk export for analytics / warehouse
SE wants to show: nightly dump of Jira issues to a warehouse.
- API layer: `POST /rest/api/3/search/jql` with a date-windowed JQL (`updated >= "-24h"`) + pagination via `nextPageToken`. Rate-limit-aware pagination — honor `Retry-After`.
- Caveat: not real-time; stateful reconciliation required since webhook is not guaranteed.

### `[REAL]` Ask an LLM agent to triage a Jira bug
SE wants to show: an LLM agent picks up a new `SUP` bug, summarizes it, classifies priority, assigns.
- Mock surface: issue view with a system comment ("AI triage result: priority High because ...") and field updates visible.
- API layer: webhook in → agent runs → `PUT /rest/api/3/issue/{key}` to set priority/assignee + `POST /rest/api/3/issue/{key}/comment` with the rationale.

### `[REAL-WITH-CAVEAT]` Two-way sync Jira ↔ Elementum
SE wants to show: updates in either system propagate.
- Honest caveat: two-way sync with Jira is a land mine at scale. You need idempotency keys, loop-prevention, field-owner tags, and conflict resolution. For demos, mock it; for production, scope down to one-way or a well-defined split-of-ownership per field.

### `[NOT-SUPPORTED]` Real-time subscribe to all changes in a project
See KNOWN-IMPOSSIBLE. Refuse and propose webhooks + polling reconcile.

### `[NOT-SUPPORTED]` Add a brand-new custom field TYPE from Elementum
See KNOWN-IMPOSSIBLE. Refuse or propose a Forge/Connect app path (not in scope for a 20-minute demo).

### `[NOT-SUPPORTED]` "Branching multi-step approval" natively in JSM
See KNOWN-IMPOSSIBLE. Propose Jira Automation + linked approval issues, or route to a purpose-built approval platform.

## HYGIENE

Naming conventions for mock data on Jira:

- **Issue key**: `<PROJECT_KEY>-<integer>`. Project key is 2–10 uppercase ASCII letters/digits (first char must be a letter). Common patterns:
  - `SUP-42`, `SUP-1024` — Support project.
  - `INFRA-7`, `INFRA-131` — Infrastructure.
  - `ITSM-501` — ITSM project (typical JSM).
  - `SEC-12` — Security.
  - `PROJ-1` — Generic dev project.
  - Avoid `TEST`, `DEMO`, `FAKE` — customers recognize those as non-serious and it reads as AI slop.
- **Issue ID** (numeric): 5-digit to 7-digit integer, typically 5 digits for a young instance (`10042`) and 6–7 digits on a busy customer (`1024503`). The integer is separate from the key sequence (internal IDs are monotonic across all projects, while per-project integers reset per project key).
- **accountId**: 24-char alphanumeric that LOOKS like `5b10a2844c20165700ede21g`. Real format is a Base32-ish hash; the safe mock shape is 24 hex-plus-g chars. Never use an email as an accountId.
- **cloudId**: UUID. Example `11223344-5566-7788-99aa-bbccddeeff00`. Only appears in the OAuth 2.0 URL path (`/ex/jira/<cloudId>/`), not in response bodies.
- **Tenant subdomain**: `<company>.atlassian.net`. For demos, use a neutral domain — `acme.atlassian.net`, `globex.atlassian.net`, `initech.atlassian.net`, `elementum-demo.atlassian.net`.
- **Service desk ID** (JSM): small integer, typically 1–50. Matches the project but is a separate ID.
- **Request type ID**: small integer, typically 10–200. Use 10, 25, 42, 100.
- **Custom field ID**: `customfield_1xxxx` where xxxx is a 4-digit integer starting at 10000 (the first 100 custom field IDs are reserved). Example: `customfield_10050` for "Asset Tag", `customfield_10080` for "Severity".
- **Username** (display name): use realistic firstname-lastname combos — "Jane Davis", "Marcus Chen", "Ayesha Patel", "Tom Rodriguez", "Kira Williams". Not "John Doe" or "User One."
- **Email (when shown)**: `<first>.<last>@example.com` or `<first>.<last>@<tenant>.com`. For JSM external customers, use `customer@example.com` or `<first>@<customer-domain>.com`.
- **Labels**: kebab-case, lowercase. Realistic values: `hardware`, `urgent`, `windows-10`, `vpn`, `password-reset`, `onboarding`, `backup`, `regression`, `sev-1`, `needs-triage`.
- **Priority names** (always these five, do not invent): `Highest`, `High`, `Medium`, `Low`, `Lowest`.
- **Status names** (common defaults; customers may rename):
  - Jira Software (Scrum): `To Do`, `In Progress`, `In Review`, `Done`.
  - Jira Software (Kanban): `Backlog`, `Selected for Development`, `In Progress`, `Done`.
  - JSM Service Request: `Open` → `In Progress` → `Waiting for customer` → `Waiting for support` → `Resolved` → `Closed`.
- **Dates**: ISO 8601 with timezone, e.g., `2026-04-23T14:25:13.000-0400`. In the UI Jira displays dates as relative ("2 hours ago"), absolute ("23/Apr/26 2:25 PM"), or in the user's locale.
- **SLA timer values**: display as `2h 15m remaining`, `-0h 34m` (breached, red), `4d 2h` for multi-day windows.

Compliance red flags to avoid in seed data:
- Real internal corporate email domains the customer actually uses — use `@example.com`.
- Real Atlassian accountIds from `https://jira.atlassian.com` public issues — construct obviously-fake ones with the right shape.
- Real customer names pulled from public ITSM blog case studies — generic company names only.
- Any seed issue that includes a real tracking number, CVE ID, or customer ticket ID from a public support site.
- Real SAML / SCIM provider response payloads with production user metadata. Use `example.com` SAML audiences.

Authorization / visibility notes to respect in mocks:
- Real Jira honors per-project Browse permission. A mock that claims to enforce auth should show "Issue does not exist or you do not have permission to see it" for a 403-disguised-as-404 case.
- JSM customer portals only show the customer's own requests (or their organization's, if organization-scoped). Mocks showing a customer other customers' tickets will read wrong.
- Comment visibility matters. A `sd.public.comment: internal = true` property marks an agent-only note; portal view must hide these.

## SOURCES

- [Jira Cloud platform REST API v3 intro](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/) — API group index, base URL, versioning
- [Basic auth for REST APIs](https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/) — API token generation, base64 encoding, header format, curl example
- [OAuth 2.0 (3LO) apps — Jira Cloud platform](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/) — authorization code grant, callback URL config, scopes
- [Implementing OAuth 2.0 (3LO)](https://developer.atlassian.com/cloud/oauth/getting-started/implementing-oauth-3lo/) — full 3LO flow with token exchange + rotating refresh tokens
- [Jira scopes for OAuth 2.0 (3LO) and Forge apps](https://developer.atlassian.com/cloud/jira/platform/scopes-for-oauth-2-3LO-and-forge-apps/) — scope reference
- [Jira Cloud REST API — Issue search (JQL)](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/) — `/rest/api/3/search/jql`, pagination with `nextPageToken`
- [Jira Cloud rate limiting](https://developer.atlassian.com/cloud/jira/platform/rate-limiting/) — points-based quotas, burst, per-issue writes, 429 response shape
- [JSM Cloud REST API intro](https://developer.atlassian.com/cloud/jira/service-desk/rest/intro/) — resource groups (Assets, Customer, Info, Knowledgebase, Organization, Request, Requesttype, Servicedesk)
- [JSM Cloud REST API — Servicedesk / Queue group](https://developer.atlassian.com/cloud/jira/service-desk/rest/api-group-servicedesk/) — queue endpoints, `PagedDTOQueueDTO`, per-queue column set
- [Exploring the JSM domain model via REST APIs](https://developer.atlassian.com/server/jira/platform/exploring-the-jira-service-desk-domain-model-via-the-rest-apis/) — conceptual overview of Service Desk / Queue / Request Type / Request
- [Atlassian Design System — Color](https://atlassian.design/foundations/color) — Jira color tokens, status category colors
- [Atlassian Design System — Design tokens](https://atlassian.design/foundations/tokens/design-tokens) — token naming conventions
- [Atlassian Design System — Typography](https://atlassian.design/foundations/typography/) — Atlassian Sans, Atlassian Mono, scale
- [Atlassian typography article — Work Life blog](https://www.atlassian.com/blog/design/implementing-typography-at-scale-the-journey-behind-the-screens) — history of Atlassian Sans / Charlie Sans
- [Atlassian Forge — Design tokens and theming](https://developer.atlassian.com/platform/forge/design-tokens-and-theming/) — using tokens in Forge apps
- [Customize your view of the board and backlog](https://support.atlassian.com/jira-software-cloud/docs/customize-your-view-of-the-board-and-backlog/) — Board / Backlog UI reference
- [Jira Cloud — Project sidebar](https://developer.atlassian.com/cloud/jira/platform/jira-project-sidebar/) — left-sidebar extension points and anatomy

Last verified: 2026-04-24. If any API response shapes above look wrong against a live Jira tenant, update this file before updating any mock.
