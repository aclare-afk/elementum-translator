# Salesforce

Salesforce is a multi-tenant SaaS CRM + application platform. It started as a pure sales CRM, but for most enterprise customers today it is a full system of record that hosts one or more of Sales Cloud (opportunities, accounts, pipeline), Service Cloud (cases, omnichannel, knowledge base), Marketing Cloud (a separate stack, different chrome — not covered here), Experience Cloud (external portals and communities), and a platform layer where admins and developers build custom objects, custom fields, page layouts, and automation to run their business. A "real" deployment is one tenant (an "org") at `https://<my-domain>.my.salesforce.com` (or a legacy `https://<instance>.salesforce.com`) running Lightning Experience — the post-2015 UI most customers are on now. Classic UI still exists and a small minority of orgs still default to it, but all new builds and all SE demos should assume Lightning.

For SE demos, the most common framings are: Sales Cloud (Account + Contact + Opportunity pipeline), Service Cloud (Case list views + Case record page + Queues + Omni-channel), and platform customizations (custom objects with `__c` suffixes, custom fields, Flow Builder automation). Those are the scenarios this file is tuned for first.

## CAPABILITIES

### Data model

- Standard objects ship out of the box and cannot be removed: `Account`, `Contact`, `Lead`, `Opportunity`, `Case`, `Task`, `Event`, `Campaign`, `User`, `Product2`, `PricebookEntry`, `Quote`, `Order`, `Asset`, `Contract`, `Knowledge__kav` (Knowledge), plus Service Cloud additions (`ServiceContract`, `WorkOrder`, `Entitlement`).
- Custom objects use the `__c` suffix on their API names (e.g., `Deal_Registration__c`). Developer-created fields on any object also use `__c` (e.g., `Industry_Vertical__c`).
- Fields are strongly typed: `Text`, `TextArea` (+ Rich Text, Long Text), `Number`, `Currency`, `Percent`, `Date`, `DateTime`, `Checkbox`, `Picklist` (single and multi-select), `Lookup` (1-to-many reference to another object), `MasterDetail` (parent-required reference with cascade delete), `Formula`, `RollupSummary`, `URL`, `Email`, `Phone`, `Geolocation`, `Address` (compound).
- Every record has a 15-character case-sensitive ID (`0015g00000ABCDE`) which maps to an 18-character case-safe ID by appending a 3-character checksum (`0015g00000ABCDEAA1`). APIs accept either; 18-char is the form you'll see returned everywhere.
- Relationships: Lookup (nullable, no cascade), Master-Detail (required, cascading), External Lookup (to external objects via Salesforce Connect), Many-to-many modeled via a junction object with two Master-Detail fields.
- Record Types: per-object subtypes that drive different page layouts + picklist value subsets. Admin-configured. Referenced on records via `RecordTypeId`.
- Validation Rules: declarative formula-based checks enforced at DML time.

### UI surfaces

- **Lightning Experience**: the primary UI since 2015. Shell is a top `One.app` bar (global header + global navigation) with app-specific tabs. Within an app, users navigate to **list views** (filtered tabular browsing), **record pages** (per-record detail), **Home**, **Reports**, **Dashboards**, **Tasks/Events**, and **Chatter**.
- **App Launcher**: the 9-dot grid in the top-left that lets users switch between apps (standard + managed packages + custom apps). Each app scopes the nav bar tabs shown.
- **Service Console** (Service Cloud) / **Sales Console** (Sales Cloud): workspace variant of Lightning Experience with subtab navigation — multiple records open as browser-like tabs with their own subtabs, utility bar at the bottom, optional CTI/Omni softphone.
- **Classic UI**: legacy pre-2015. Still accessible at `/apex/...` or when an admin disables Lightning for a profile. Do not build modern mocks in Classic chrome unless the customer explicitly runs Classic.
- **Setup**: the admin surface — a completely different layout at `/lightning/setup/Home/home`, left tree nav + search, used for object manager, Flow Builder, permission sets, etc.
- **Experience Cloud sites** (formerly Community Cloud): customer/partner-facing portals built on the same platform but with distinct branding and templates. Anatomy differs per template (Build Your Own LWR, Customer Service, Partner Central).

### Automation

- **Flow Builder**: the current declarative automation tool. Flow types include Record-Triggered (before-save / after-save), Scheduled, Autolaunched, Screen Flow (interactive wizard UI), and Platform Event-Triggered.
- **Apex Triggers**: procedural code in Apex (Salesforce's proprietary Java-like language) that runs on DML events. Used when Flow hits declarative limits or performance requires bulk-optimized transactions.
- **Apex Classes / Batch Apex / Queueable Apex / Future Methods**: server-side business logic and async processing.
- **Validation Rules**: record-save-time formula validation (see Data model above).
- **Workflow Rules / Process Builder**: legacy declarative automation. Salesforce announced retirement; new builds should use Flow.
- **Approval Processes**: declarative multi-step approval routing (submit-for-approval, approve, reject, reassign). Supports multiple steps with their own criteria — unlike Jira Service Management approvals, Salesforce approvals are genuinely multi-step.
- **Scheduled Apex / Scheduled Flow**: cron-like jobs.
- **Formulas**: read-only derived fields computed on-demand (not stored).

### Integration

- **REST API** (`/services/data/v63.0/...`) — generic sObject CRUD + SOQL query + SOSL search + composite + batch.
- **SOAP API** (`/services/Soap/u/63.0`) — enterprise + partner WSDLs. Still heavily used by older ETL tools.
- **Bulk API 2.0** (`/services/data/v63.0/jobs/ingest` and `/services/data/v63.0/jobs/query`) — async batch processing for large datasets.
- **Composite API** — multiple REST calls as a single round trip, optionally with inter-call references (`@{ref.Id}`).
- **Streaming API / Pub/Sub API** — real-time event delivery over CometD or gRPC. Subscribe to PushTopics, Generic Events, Platform Events, or Change Data Capture streams.
- **Platform Events** — custom event types published via API or declarative Flow; subscribers are external via CometD/gRPC or internal via Apex triggers/Flow.
- **Change Data Capture (CDC)** — one-way outbound change feed on selected objects (creates, updates, deletes, undeletes). Delivered via the same streaming infrastructure as Platform Events.
- **Outbound Messages** — Salesforce-initiated SOAP/XML posts with built-in retry, configured on a Workflow Rule. Legacy but durable.
- **Apex Callouts / Flow HTTP Callout** — inside-out HTTP calls to external systems from declarative Flow or Apex.
- **Connect REST API** (`/services/data/v63.0/connect/...`) — Chatter + Communities-focused.
- **Apex REST** — custom REST endpoints implemented in Apex (`@RestResource(urlMapping='/...')`).

### Admin

- **Profiles** and **Permission Sets** — object + field + system permissions. Modern best practice: minimal profiles + layered permission sets.
- **Roles / Role Hierarchy** — data sharing hierarchy (distinct from profile permissions). Drives "grant access using hierarchies."
- **Sharing Settings** — org-wide defaults (Private / Public Read Only / Public Read/Write) with sharing rules, manual sharing, criteria-based sharing.
- **Page Layouts** (per object, per Record Type) — classic layout assignment. In Lightning, the parallel concept is **Lightning Record Pages** assigned via Lightning App Builder.
- **Sandboxes**: Developer, Developer Pro, Partial Copy, Full — for dev/test isolation. Refresh cadence varies by edition.
- **Change Sets / Metadata API / DX packaging** — deployment between orgs.

## API SURFACE

Base URL: `https://<my-domain>.my.salesforce.com` (with a My Domain enabled; required on all new orgs). Legacy instance URLs like `https://na44.salesforce.com` still resolve but every org also has a `.my.salesforce.com` host.

After OAuth, the `instance_url` returned in the token response is the host to use for all subsequent API calls. Always honor it — do NOT hard-code the login hostname.

All REST calls are versioned by inclusion of the version in the path, e.g., `v63.0`. Current version as of Spring '26 is v66.0 (Salesforce ships three versions per year, Spring / Summer / Winter). Pinning to a stable version (v60.0 – v63.0) is common practice for integrations — always include an explicit version, never omit it.

### Authentication on requests

- **OAuth 2.0 Bearer**: `Authorization: Bearer <access_token>`
- **Session ID** (legacy): `Authorization: Bearer <session_id>` works interchangeably because Salesforce treats session IDs as bearer tokens on API calls.

### Login endpoint

- Production: `https://login.salesforce.com/services/oauth2/token`
- Sandbox: `https://test.salesforce.com/services/oauth2/token`

### sObject REST endpoints

`/services/data/v63.0/sobjects/` — root of the sObject REST API.

- `GET /sobjects/` — list all sObject types available in the org.
- `GET /sobjects/{sObjectName}/describe/` — full metadata (fields, types, picklist values, relationships, URLs) for one object. Source of truth for what fields exist in this org.
- `GET /sobjects/{sObjectName}/` — object-level basic info.
- `GET /sobjects/{sObjectName}/{id}` — retrieve one record. Query param `fields=<csv>` limits the response payload.
- `POST /sobjects/{sObjectName}/` — insert a record. Body is JSON with field API names as keys.
- `PATCH /sobjects/{sObjectName}/{id}` — update. 204 No Content on success.
- `DELETE /sobjects/{sObjectName}/{id}` — delete. 204 on success.
- `PATCH /sobjects/{sObjectName}/{externalIdFieldName}/{value}` — upsert by external ID.

Typical single-record response (GET on an Account):

```json
{
  "attributes": {
    "type": "Account",
    "url": "/services/data/v63.0/sobjects/Account/0015g00000ABCDEAA1"
  },
  "Id": "0015g00000ABCDEAA1",
  "Name": "Acme Corp",
  "Industry": "Technology",
  "AnnualRevenue": 15000000,
  "OwnerId": "0055g00000XYZAB",
  "CreatedDate": "2026-04-12T15:02:11.000+0000",
  "LastModifiedDate": "2026-04-22T09:45:30.000+0000"
}
```

### Composite sObject Collections

`POST /services/data/v63.0/composite/sobjects` — create up to 200 records of any type in one round trip.
`PATCH /services/data/v63.0/composite/sobjects` — update up to 200.
`DELETE /services/data/v63.0/composite/sobjects?ids=<csv>` — delete up to 200.
`GET /services/data/v63.0/composite/sobjects/{sObjectName}?ids=<csv>&fields=<csv>` — retrieve many by ID.

### SOQL query endpoint

`GET /services/data/v63.0/query/?q=<URL-encoded SOQL>`

Example:
```
GET /services/data/v63.0/query/?q=SELECT+Id,Name,Industry+FROM+Account+WHERE+AnnualRevenue+>+1000000+LIMIT+100
```

Response envelope:
```json
{
  "totalSize": 42,
  "done": true,
  "records": [
    {
      "attributes": { "type": "Account", "url": "/services/data/v63.0/sobjects/Account/0015g00000ABCDEAA1" },
      "Id": "0015g00000ABCDEAA1",
      "Name": "Acme Corp",
      "Industry": "Technology"
    }
  ]
}
```

When `done` is `false`, the response also includes `"nextRecordsUrl": "/services/data/v63.0/query/01g5g00000ZZZZZZ-2000"`. Fetch that URL to page. Batches are 2,000 records by default; tune via `Sforce-Query-Options: batchSize=NNN` header (max 2000).

`GET /services/data/v63.0/queryAll/?q=<...>` is the same endpoint for including soft-deleted + archived records.

### SOSL search endpoint

`GET /services/data/v63.0/search/?q=<URL-encoded SOSL>` — full-text search across multiple objects in one call. Returns a flat array with per-record `attributes.type`.

### Limits endpoint

`GET /services/data/v63.0/limits/` — returns current usage + allocations for Daily API Requests, Data Storage, Bulk API batches, Streaming events, etc. The easiest way to check what's left without caring about the docs.

### Pagination model

Offset-based is NOT the default; SOQL uses cursor-like `nextRecordsUrl`. For Bulk API 2.0, jobs return a `locator` string used to page. For REST sObject Describe listings, responses are capped and require listing by name.

### Error envelope

```json
[
  {
    "message": "The required field is missing: Name",
    "errorCode": "REQUIRED_FIELD_MISSING",
    "fields": ["Name"]
  }
]
```

Common HTTP status codes:
- `200 OK` — success with body
- `201 Created` — POST success
- `204 No Content` — PATCH/DELETE success
- `400 Bad Request` — malformed request, MALFORMED_QUERY on SOQL
- `401 Unauthorized` — token expired or invalid
- `403 Forbidden` — valid token, insufficient permissions (ACL/Profile/PermSet)
- `404 Not Found` — record doesn't exist or no access
- `409 Conflict` — concurrent modification
- `429 Too Many Requests` — rarely used; Salesforce typically returns `403` with `REQUEST_LIMIT_EXCEEDED` instead
- `500 Internal Server Error` — platform-side error

### Rate limits

- **Daily API Requests**: 100,000 per 24-hour rolling window for Enterprise Edition, plus 1,000 additional per user license. Professional / Essentials orgs are capped lower. The limit is **soft** — requests continue to process even after exceeding it, until a system protection kicks in, at which point all calls return `HTTP 403` with `REQUEST_LIMIT_EXCEEDED`.
- **Bulk API 2.0**: 15,000 batches per 24-hour period.
- **Concurrent long-running requests**: 25 concurrent > 20 seconds (5 on Developer Edition).
- **Per-request max duration**: 10 minutes.
- **Streaming API events**: standard-volume events stored 24 hours; Platform Events and Change Data Capture stored 72 hours.
- **Apex governor limits** (per-transaction, not org-daily): 100 SOQL queries, 150 DML statements, 100 callouts, 6 MB heap (synchronous), 12 MB (async), 10,000 DML rows, 50,000 query rows.

Check real-time consumption via `GET /services/data/v63.0/limits/`.

## VISUAL IDENTITY

Salesforce UIs use the **Salesforce Lightning Design System (SLDS)**. Two concurrent versions exist in-market: SLDS 1 (the long-running system; still powering the majority of production orgs) and SLDS 2 (introduced Spring '25, opt-in, based on CSS custom properties / styling hooks). Mocks should default to SLDS 1 chrome unless the customer is explicitly on SLDS 2 — the visual fingerprints customers recognize are SLDS 1.

### Colors (SLDS 1 "Stage" theme defaults)

**Brand**
- Brand primary blue: `#1B96FF` (SLDS 2 default). Classic SLDS 1 brand: `#0070D2` — most orgs' chrome uses this blue.
- Brand primary dark: `#014486`
- Brand primary hover: `#005FB2`

**Neutrals**
- Text default: `#181818` (headings), `#3E3E3C` (body)
- Text weak: `#706E6B`
- Border: `#DDDBDA` (default), `#C9C7C5` (emphasis)
- Page background: `#F3F3F3` (SLDS "Stage" page), `#FAFAF9` (card surface hover)
- Surface: `#FFFFFF` (card)

**Status**
- Success (green): `#2E844A` text / `#D4FAE4` bg
- Warning (amber): `#FE9339` text / `#FEF1EE` bg
- Error (red): `#EA001E` text / `#FEDED9` bg
- Info (blue): `#0176D3` text / `#D8EDFF` bg

**Record Type / Entity colors** (object entity icons render with object-specific color chips):
- Account `#7F8DE1` / Contact `#A094ED` / Lead `#F88962` / Opportunity `#FCB95B` / Case `#F2CF5B` / Task `#4BC076` / Event `#EB7092`

### Typography

- Font family: `"Salesforce Sans", Arial, sans-serif` (SLDS 1); SLDS 2 uses the same stack with a refreshed weight scale.
- Base size: 13px body, 14px "medium," 16px "large." Headings: 20/24/28.
- Weight: 400 body, 700 bold headings. Avoid 500/600 — the system doesn't ship those weights.

### Layout primitives

- Global header: **56px** tall, white background, bottom border `#DDDBDA`. Contains app launcher (9-dot grid), app name, search input (center), help/setup/avatar on the right.
- App nav bar: **40px** tall, white background, tabs underneath the global header.
- Utility bar (Console apps): **36px** tall, bottom-docked.
- Page padding: 16px / 24px grid.
- Record page: typical 3-column Lightning Record Page — left rail for details, center for tabs (Details / Related / Chatter), right rail for activity + related lists. On narrow viewports collapses to 2 or 1 column.
- Icons: **SLDS icon set** (Salesforce proprietary). Three families: Standard (colored, per-object entity chips), Utility (monochrome), Custom (colored, for custom objects). Icons are SVG sprites; the package is `@salesforce-ux/design-system` on npm.

Public reference: [Lightning Design System gallery](https://www.lightningdesignsystem.com) — every component and token is browsable.

## UI PATTERNS

### Global shell (Lightning Experience)

Every Lightning page sits inside the **One.app** shell:

1. **Global header** (56px) — app launcher (9-dot icon), current app name (with dropdown to switch apps), global search (center), "+" favorites, help (?), setup (gear), notifications (bell), user avatar. Always present.
2. **Navigation bar** (40px) — tabs scoped to the current app. E.g., Sales app shows Home / Opportunities / Leads / Accounts / Contacts / Campaigns / Dashboards / Reports. Tabs can be standard, custom, or external URL.
3. **Content area** — the current page (list view, record page, Home, etc.).

### Home page

First landing after login. Shows a dashboard-like grid: Quarterly Performance chart, Assistant (AI suggestions), Today's Events, Today's Tasks, Recent Records, News. Highly configurable per app + per role.

### List view

Tabular browsing of one object with a filter (the "list view"). Every object has system list views ("All Accounts", "My Accounts", "Recently Viewed") plus user/admin-created ones.

- Header: object entity icon + object plural name (e.g., "Accounts"), list view picker dropdown ("All Accounts ▾"), row count, filter icon.
- Action row: New / Import / Printable View / Change Owner / Mass actions, view switcher (table / Kanban / split).
- Table: resizable columns, sortable, inline-editable with pencil icon when the user has edit permission. Checkbox column for mass actions.
- Pagination: "1-50 of 247 ▼" at the bottom. Uses offset-style paging in the UI; the underlying API uses SOQL cursors.

### Record page (detail view)

The bulk of the UI. Three-zone layout (varies by Lightning Record Page assignment):

1. **Highlights panel** (top) — object icon + record name + compact layout fields (up to 7 key fields) + action buttons (Edit, Follow, Delete, Change Owner, custom quick actions). Compact layouts per-object + per-Record-Type control what appears here.
2. **Path component** (optional, for stage-driven objects like Opportunity and Lead) — a chevron-style progress bar showing stages. Clickable to advance. Often shows a "Key Fields" side drawer per stage.
3. **Tabs row** — Details / Related / News / Activity / Chatter, etc. Tabs are configured in Lightning App Builder. On wide layouts, Related is a right-column list; on narrow layouts, a full tab.
4. **Details tab** — field sections (page layout). Fields are rendered read-only by default with a pencil to enable inline edit. Required fields marked with a red asterisk.
5. **Related lists** (right column or Related tab) — child records by relationship. Each shows ~3 preview rows with "View All" to drill in.
6. **Activity panel** (right column on console apps) — log a call, new task, new event, email, with attached history.

### Service Console anatomy

For Service Cloud, the Console app replaces single-record navigation with browser-like tabs:

- Utility bar (bottom, 36px) — Omni-Channel widget, Macros, Notes, Softphone (CTI).
- Primary tabs (each a record or list view).
- Subtabs under each primary tab (related records opened from the primary).
- Case Feed view: publisher at top (reply email / log call / internal note), then a vertically scrolling feed of interactions.
- Omni-Channel widget: Accept / Decline incoming work (cases, chats, calls) with presence state (Available / Busy / Offline).

### Setup (admin)

Different shell — **left tree nav + center content area**. Accessed via the gear icon in global header. Main sections: Home / Object Manager / Feature Settings / Platform Tools / Environments / Settings. This is where Flows, custom objects, permission sets, profiles, Flow Builder, Apex classes, and deployment tools live.

### App Launcher modal

9-dot icon opens a modal with a grid of app icons + search. Used for switching between Sales, Service, marketing, custom apps, installed managed packages.

## AUTH

### Login hosts

- Production org: `https://login.salesforce.com`
- Sandbox org: `https://test.salesforce.com`
- My Domain login: `https://<my-domain>.my.salesforce.com`

All OAuth flows require a **Connected App** (or External Client App in newer orgs) registered in the target org. The Connected App defines the OAuth client_id ("Consumer Key"), client_secret ("Consumer Secret"), permitted OAuth scopes, and (for JWT / Client Credentials flows) the associated certificate / designated user.

### OAuth 2.0 flows supported

- **Web Server Flow** (authorization code grant) — user-interactive. Browser redirects through `/services/oauth2/authorize` → callback with `code` → POST to `/services/oauth2/token` with `code` + `client_id` + `client_secret` → returns `access_token` + `refresh_token` + `instance_url` + `id`. **The most common flow for end-user integrations.**
- **User-Agent Flow** (implicit grant) — SPA-style, returns the access token directly in the URL fragment. Discouraged; use Authorization Code with PKCE instead.
- **JWT Bearer Flow** — server-to-server, no user interaction. Client signs a JWT assertion with a private key (X.509 cert uploaded to the Connected App). POSTs to `/services/oauth2/token` with `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` + the JWT as `assertion`. Returns `access_token` + `instance_url`. **No refresh token returned** — just request a new access token when it expires. **Ideal for ETL / middleware integrations.**
- **Client Credentials Flow** (v57.0+) — server-to-server with a designated user on the Connected App. POSTs to `/services/oauth2/token` with `grant_type=client_credentials` + `client_id` + `client_secret`. Returns `access_token`. Simpler than JWT, no cert required.
- **Device Flow** — for input-constrained devices (CLI tools, set-top boxes).
- **SAML Bearer Assertion Flow** — exchange a SAML assertion for an access token.
- **Username-Password Flow** — `grant_type=password` with actual username/password. **Deprecated**; disabled by default on new orgs.

### Access tokens

- Returned from `/services/oauth2/token` as `access_token`.
- Pass on API calls as `Authorization: Bearer <access_token>`.
- Default session lifetime is 2 hours, configurable per Connected App (from 15 min to 24 hours) or per session settings.
- Refresh via `grant_type=refresh_token` + `refresh_token` + `client_id` + `client_secret` (web server flow only; JWT flow has no refresh token).

### Most common mode for integration work

**JWT Bearer Flow**. It's the de-facto standard for server-to-server integrations because it doesn't involve a browser, has no refresh-token state to manage, and scales cleanly per environment. Default mocks to this unless the SE specifies otherwise.

## KNOWN-IMPOSSIBLE

### 1. "Arbitrary many-to-many fields natively"

**Assumption**: "Just add a multi-select relationship between Account and Product."
**Reality**: Salesforce has no native many-to-many field. You model M2M via a **junction object**: a custom object with two Master-Detail fields, one to each parent. Every customer who builds M2M in Salesforce lives with a junction object.
**Alternative**: Model the junction object explicitly. If the mock needs M2M, the mock must include the junction object.
**Source**: [Salesforce Object Relationships Overview](https://help.salesforce.com/s/articleView?id=sf.overview_of_custom_object_relationships.htm&type=5).

### 2. "Real-time change events with guaranteed delivery over a standard webhook"

**Assumption**: "Salesforce will POST to our webhook the instant a record changes."
**Reality**: Salesforce has three change-notification mechanisms — Change Data Capture, Platform Events, Outbound Messages — and none of them are plain POST webhooks with strong delivery SLAs:
- CDC + Platform Events deliver over **CometD** or **Pub/Sub API (gRPC)**, not arbitrary HTTPS POSTs. External consumers must subscribe.
- Outbound Messages **do** send HTTPS (SOAP/XML) with built-in retry, but are configured per-Workflow Rule (legacy) and send SOAP bodies, not JSON.
- Event retention is **72 hours** for high-volume events (CDC, Platform Events) and 24 hours for standard. If your consumer is down longer than that, events are gone.
**Alternative**: Build a small adapter service that subscribes via Pub/Sub API and republishes as JSON webhooks, OR use Outbound Messages for small/simple cases, OR use Flow's "HTTP Callout" action for custom event-driven POSTs from specific automations.
**Source**: [Pub/Sub API overview](https://developer.salesforce.com/docs/platform/pub-sub-api/overview), [Streaming API message durability](https://developer.salesforce.com/docs/atlas.en-us.api_streaming.meta/api_streaming/using_streaming_api_durability.htm).

### 3. "Governor-limit-free Apex"

**Assumption**: "We can do as much work as we want in an Apex trigger / Flow."
**Reality**: Every transaction is bounded by governor limits — 100 SOQL queries, 150 DML statements, 100 callouts, 6 MB heap, 10,000 DML rows, and more. Hitting any limit throws an uncatchable `System.LimitException`. Large data operations must use Batch Apex, Queueable Apex, or Bulk API.
**Alternative**: Design the mock to acknowledge batching. Do not promise "update all 50k accounts synchronously on a button click."
**Source**: [Apex Governor Limits](https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_gov_limits.htm).

### 4. "Free-form schema changes without deployment"

**Assumption**: "Admin can add a field and the integration picks it up automatically."
**Reality**: UI-level admins absolutely can add fields on the fly — but those fields are NOT visible to external integrations until the client describes the sObject (`/sobjects/{name}/describe/`) or the client knows to request them by API name. Many ETL tools cache describes for performance and require a refresh. Also, any hard-coded `SELECT Id, Name, ...` in an integration will not pull new fields automatically.
**Alternative**: Document an "integration describes fresh on startup" pattern, or require an integration-reload step when admins add fields.
**Source**: [sObject Describe](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_describe.htm).

### 5. "Single-tenant data isolation"

**Assumption**: "Our Salesforce data lives on a dedicated machine / we can guarantee physical isolation."
**Reality**: Salesforce is fundamentally multi-tenant. Orgs are isolated **logically** (at the query layer) but share the same physical infrastructure. Customers who need true isolation deploy to Salesforce's Government Cloud (Plus / Premium) or Hyperforce in a customer-preferred region — still multi-tenant, just with regional guarantees.
**Alternative**: Show Hyperforce region selection in the mock if the customer cares about data residency.
**Source**: [Salesforce Hyperforce overview](https://help.salesforce.com/s/articleView?id=sf.hyperforce_overview.htm).

### 6. "Bulk API replaces REST for everything"

**Assumption**: "Just use Bulk API and you'll bypass the Daily API Request limit."
**Reality**: Bulk API 2.0 jobs each count toward the Daily API Request allocation (though more efficiently than one-at-a-time REST). Bulk API also has its own 15,000 batches/24h limit. Large-volume integrations still need careful rate-limit accounting.
**Source**: [API Request Limits and Allocations](https://developer.salesforce.com/docs/atlas.en-us.salesforce_app_limits_cheatsheet.meta/salesforce_app_limits_cheatsheet/salesforce_app_limits_platform_api.htm).

## COMMON SE SCENARIOS

### [REAL] Sales pipeline — Account + Contact + Opportunity view

**What the SE wants to show**: A Sales Cloud user lands on the Accounts list view, opens an Account record, sees related Contacts + Opportunities, and drills into an Opportunity with its stage Path component.
**Feasibility**: Fully real. Standard Lightning chrome. Three-column record page with Highlights panel, Path (Opportunity only), Details tab + Related tab.
**Notes**: Use realistic standard objects; don't invent custom fields unless the scenario needs them. Opportunity stages should match real default stages (Prospecting / Qualification / Needs Analysis / Value Proposition / Id. Decision Makers / Perception Analysis / Proposal/Price Quote / Negotiation/Review / Closed Won / Closed Lost).

### [REAL] Service Console — Case list + Case record page + Omni-channel

**What the SE wants to show**: Service agent opens the Service Console, accepts an incoming case via Omni-Channel, works the case in a tabbed workspace with Case Feed + Related Lists + Utility Bar.
**Feasibility**: Fully real. Use the Console app chrome (subtabs, utility bar, Omni widget).
**Notes**: Omni-Channel presence states (Available / Busy / Offline) and work acceptance must be present to feel Service-Cloud-accurate. Case statuses are customer-configurable but the defaults are New / Working / Escalated / Closed.

### [REAL-WITH-CAVEAT] Custom object with __c fields on a record page

**What the SE wants to show**: A customer's custom `Deal_Registration__c` object with `Partner_Tier__c` picklist, `Approved_By__c` Lookup to User, custom Related List on Account.
**Feasibility**: Real, but the chrome MUST reflect:
- `__c` suffix visible on hover / API Name.
- Custom-object tab icon is the **Custom** SLDS icon family (colored square with a symbol), not a Standard entity icon.
- Custom Related Lists appear under Related tab on the parent Account page, with the object's plural label.

### [REAL-WITH-CAVEAT] Flow-driven multi-step approval

**What the SE wants to show**: Submit a record for approval → email notification → approver clicks Approve → record progresses.
**Feasibility**: Real; built on Approval Processes (classic) or Flow + Approval Actions. Multi-step is genuine in Salesforce (unlike JSM).
**Caveat**: Approval Processes have their own UI — the record shows a highlighted "Submit for Approval" button, and an "Approval History" related list tracks each step. Mock should include the Approval History related list to be honest.

### [REAL-WITH-CAVEAT] JWT Bearer integration for a headless read/write

**What the SE wants to show**: External system reads Opportunities / writes Cases via REST API, authenticated with JWT Bearer.
**Feasibility**: Real. Standard pattern.
**Caveat**: Connected App setup is admin-required; show a Setup screenshot of the Connected App with OAuth scopes + certificate upload if the demo discusses auth.

### [NOT-SUPPORTED] "Real-time Slack-style message webhook the instant a Case changes"

See KNOWN-IMPOSSIBLE #2. Rephrase as a Pub/Sub API subscriber + adapter, or as an Outbound Message with SOAP/XML.

### [NOT-SUPPORTED] "Build a custom field type"

Salesforce does not let third parties ship new field **types** (the way Jira managed apps can via Forge). You can build custom components that render existing field types differently, or custom metadata that feels like a new type — but the underlying DB field is always one of the shipped types (Text, Number, Lookup, etc.). If the SE asks for a "geospatial polygon" or a "tag-soup" field type — no.

## HYGIENE

### Identifiers

- **Record IDs**: 15-char case-sensitive (`0015g00000ABCDE`) or 18-char case-safe (`0015g00000ABCDEAA1`, last 3 chars are the checksum). All API responses return 18-char. Mocks should use 18-char for realism.
- **Key prefixes** (first 3 chars of every record ID, per-object):
  - Account = `001`
  - Contact = `003`
  - Lead = `00Q`
  - Opportunity = `006`
  - Case = `500`
  - User = `005`
  - Task = `00T`
  - Event = `00U`
  - Campaign = `701`
  - Custom objects are assigned a key prefix on creation (commonly starts with `a`).
- **Organization ID**: 18-char, always starts with `00D` (`00D5g0000001ABC`). One per org.
- **Case-safe ID checksum**: the 3-char suffix isn't random — it's derived from the case pattern of the 15-char ID. Don't invent it in mocks; if you only need the 15-char, use 15-char.

### API names

- Standard object: `Account`, `Contact`, `Lead`, `Opportunity`, `Case`, `Task`, `Event`, `User`, etc. (PascalCase, no suffix)
- Custom object: `Deal_Registration__c` (underscores for spaces, always `__c` suffix)
- Standard field: `Name`, `Industry`, `AnnualRevenue`, `OwnerId`, `CreatedDate`, `LastModifiedDate`
- Custom field: `Industry_Vertical__c`, `Approved_By__c` (same rules, `__c` suffix)
- Namespaced managed package field: `<namespace>__<fieldname>__c` (double-underscores separate namespace and field)

### Names + display labels

- Use conventional business names: Acme Corp, Umbrella Inc, Globex. Do not use real Fortune 500 names.
- Users in demo orgs typically have email patterns like `firstname.lastname@<demo-org>.com`.
- Phone numbers in US format `(415) 555-0123` — use 555 exchange for obvious fakes.

### Compliance red flags

- **Do not seed PHI, PII, or PCI** even in mocks: no real SSNs, no real DOBs, no credit card numbers (even test card numbers from Stripe/Braintree docs), no patient names paired with conditions.
- **HIPAA-adjacent**: Salesforce Health Cloud is a thing; if demoing Health Cloud, use obviously fake patient names + DOBs in an "Acme Health Research" framing.
- **Financial Services Cloud**: similar — use obviously fake account numbers + client names.

### Dates + numbers

- DateTime in API responses is always ISO 8601 UTC with ms + offset: `2026-04-22T09:45:30.000+0000`. Mocks should emit the same format.
- Currency is a number + a separate `CurrencyIsoCode` field (when multi-currency is enabled). Dollar amounts are typically rendered in list views as `$1,500,000.00`.

## SOURCES

- [Salesforce REST API Developer Guide — Reference](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_list.htm)
- [sObject Basic Information](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_basic_info.htm)
- [sObject Describe](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_describe.htm)
- [sObject Rows](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_sobject_retrieve.htm)
- [Composite sObject Collections](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_composite_sobjects_collections.htm)
- [Execute a SOQL Query](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/dome_query.htm)
- [Limits REST Resource](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_limits.htm)
- [API Request Limits and Allocations](https://developer.salesforce.com/docs/atlas.en-us.salesforce_app_limits_cheatsheet.meta/salesforce_app_limits_cheatsheet/salesforce_app_limits_platform_api.htm)
- [Apex Governor Limits](https://developer.salesforce.com/docs/atlas.en-us.apexref.meta/apexref/apex_gov_limits.htm)
- [OAuth 2.0 JWT Bearer Flow](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_jwt_flow.htm&type=5)
- [OAuth 2.0 Web Server Flow](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm&type=5)
- [OAuth 2.0 Client Credentials Flow](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_client_credentials_flow.htm&type=5)
- [Pub/Sub API Overview](https://developer.salesforce.com/docs/platform/pub-sub-api/overview)
- [Streaming API Message Durability](https://developer.salesforce.com/docs/atlas.en-us.api_streaming.meta/api_streaming/using_streaming_api_durability.htm)
- [Change Data Capture Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.change_data_capture.meta/change_data_capture/cdc_intro.htm)
- [Lightning Design System (SLDS)](https://www.lightningdesignsystem.com)
- [SLDS Design Tokens](https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-design-tokens.html)
- [SLDS Styling Hooks](https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-custom-properties.html)
- [Object Relationships Overview](https://help.salesforce.com/s/articleView?id=sf.overview_of_custom_object_relationships.htm&type=5)
- [Hyperforce Overview](https://help.salesforce.com/s/articleView?id=sf.hyperforce_overview.htm)
- [Record-Triggered Automation Decision Guide](https://architect.salesforce.com/docs/architect/decision-guides/guide/record-triggered)
- [Salesforce Developer Limits and Allocations (PDF)](https://resources.docs.salesforce.com/latest/latest/en-us/sfdc/pdf/salesforce_app_limits_cheatsheet.pdf)
