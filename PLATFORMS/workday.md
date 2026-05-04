# Workday

Workday is a cloud-based platform sold as a unified suite for Human Capital Management (HCM), Financial Management, Spend Management (Procurement + Expenses), Talent + Recruiting, Adaptive Planning (FP&A), and Learning. A single Workday tenant is the system of record across all of these — workers, positions, GL, suppliers, candidates, requisitions, pay, benefits, time tracking, and absence management all live in the same data graph. For SE demos, the most universally-understood entry points are HCM (worker directory, time-off requests, expenses) and procurement (purchase requisitions). The PTO/time-off scenario is the cleanest because every Workday customer uses it and the data model is small.

A real Workday deployment is reached at a tenant-and-pod-specific URL like `https://wd5-impl-services1.workday.com/ccx/<tenant>/...`, where `wd5-impl-services1` identifies the datacenter pod the tenant lives on and `<tenant>` is the customer-assigned tenant slug (e.g., `acme_dpt1`, `acme_pt1` for preview, `acme` for production). The newer "Workday API Gateway" REST surface is consolidated at `https://api.workday.com/...` and is the preferred integration path for new builds, though many established integrations still target the legacy `ccx/<tenant>/...` host pattern.

## CAPABILITIES

### Data model
- **Worker** is the core HCM entity. Every employee or contingent worker is a Worker. Identified by both an external `Employee_ID` (any format the customer chooses; commonly numeric or `EMP-12345`) and an internal Workday ID (WID, 32-char hex).
- **Position** describes the seat a worker fills. Workers can change positions (Job Change BPF), positions can be vacant.
- **Supervisory Organization** is the org-tree node. Each position rolls up to one supervisory org, which has a manager (another Worker).
- **Cost Center**, **Location**, **Company** (legal entity), **Job Profile**, **Compensation Plan** are first-class reference entities.
- **Custom Objects** extend the model — customers can add arbitrary fields to existing entities or define entirely new entity types. Custom-object names start with the tenant's prefix.
- Every entity has a 32-char hex WID. References between entities are stored as WIDs; the API typically also returns a "descriptor" (human-readable label) alongside.
- Unlike ServiceNow there is no inheritance — entities are flat and related via reference fields, not extension.

### UI surfaces
- **Home page** (the default landing surface). Tile/card grid of "worklets" (mini-applications: Time Off, Pay, Benefits, Expenses, etc.). What the user sees is governed by their security groups.
- **Inbox** — the universal action queue. Every business-process step that requires the user shows up here. This is the most-used surface in Workday day-to-day.
- **Search** — top-bar global search across workers, organizations, custom objects, and reports. Results are scoped by the user's security groups.
- **App Launcher** ("Apps") — left-rail or top-grid of all apps the user has access to.
- **Worker profile** — the canonical worker view: header with photo, position, manager, then tabs for Job, Compensation, Time Off, Pay, Personal, Career, Performance, Documents.
- **Worklet detail pages** — each worklet has a deeper-dive page (Time Off worklet → Time Off page with balance, request form, history).
- **Reports** — standard and custom reports rendered in the same grid component. Reports can be exported, scheduled, or delivered as Reports-as-a-Service (RaaS).

### Automation
- **Business Process Framework (BPF)** — the central automation primitive. Every transaction (Hire, Time Off Request, Expense Report, Pay Change, Job Change, Hire to Retire) is configured as a Business Process: a graph of Steps (Initiation, Approvals, Notifications, To-Dos, Sub-Processes, Integrations) with conditions, parallel branches, and security on each step.
- **Studio** — Workday's graphical integration builder. Studio integrations run inside the Workday tenant, can read/write any data the ISU (Integration System User) has access to, and are typically used for outbound transformations to/from third-party systems. Cannot be invoked from outside Workday — they are scheduled or triggered by BPF steps.
- **EIB (Enterprise Interface Builder)** — batch file-based integration. Inbound EIBs upload XML/CSV files and apply them to a target web service. Outbound EIBs run a report and ship the output via SFTP/email/REST. Has a "Launch" REST endpoint but the work itself is asynchronous.
- **Reports as a Service (RaaS)** — any custom report can be exposed as JSON/XML/CSV over a REST URL. The most common Workday "API" customers actually use because it's so easy to spin up.
- **Calculated Fields** — formula fields on entities. Re-evaluated on read, can reference related entities, support a domain-specific function library (e.g., `LOOKUP_VALUE_AS_TEXT`, `IF_EVALUATE`).
- **Conditions** within BPF steps — also calculated-field expressions.

### Integration
- **REST API (modern, "Workday API Gateway")** — `https://api.workday.com/...`. OAuth 2.0, JSON, scoped per-resource (absenceManagement, common, expenses, recruiting, procurement, etc.). Coverage growing every release but still incomplete vs. SOAP.
- **REST API (legacy, tenant-scoped)** — `https://<pod>/ccx/api/v<N>/<tenant>/...`. JSON, OAuth 2.0 or x509. Same shape as the gateway for overlapping resources; primary path before the gateway existed.
- **SOAP / Web Services API (WWS)** — XML over HTTPS, tenant-scoped at `https://<pod>/ccx/service/<tenant>/<service-name>/v<N>`. Comprehensive — covers everything the platform can do. The fallback for anything not yet in REST.
- **Studio** — internal-only.
- **EIB** — file-based, async.
- **RaaS** — JSON/XML over a per-report URL with basic-auth or x509.
- **Outbound integrations** triggered by BPF steps — POST to a customer-specified endpoint at any business-process step.
- **Webhooks** — Workday does NOT have a generic webhook product. Outbound REST calls are configured per-BPF-step, not as a generic subscription.

### Auth modes the platform accepts
- **OAuth 2.0 (REST)** — the standard for modern integrations. Refresh-token grant is the dominant flow. `client_id` + `client_secret` registered as an "API Client for Integrations" in the tenant's setup. Tenant admin issues an initial refresh token; integrations exchange it for short-lived access tokens.
- **Basic Auth (SOAP, RaaS)** — username `<isu_username>@<tenant>` + password. Still extremely common for SOAP because OAuth for SOAP is awkward.
- **x509 client certificate** — for both REST and SOAP, in regulated environments.
- **JWT bearer (REST)** — supported but rare.
- **SAML SSO** — user-facing only, not for server-to-server.

### Admin
- **Security groups** govern everything. Workers are assigned to security groups; security groups grant access to "domains" (collections of permissions on entities) at one of: View, Modify, Get, Put, Cancel.
- **Business Process Security Policies** govern who can initiate, approve, and view each BP.
- **Tenants** — production, sandbox, preview, implementation. Customers typically have at least 2 (prod + sandbox); larger ones have a 4-pack. Sandbox is refreshed from prod on a Workday-controlled schedule.
- **Object Transporter** moves configuration changes between tenants. Not all object types are transportable — manual config still common.

## API SURFACE

Two REST surfaces coexist. New builds should target the API Gateway; legacy integrations still hit the tenant-scoped path.

### API Gateway (recommended)
Base URL: `https://api.workday.com`

Format: JSON. `Content-Type: application/json`, `Accept: application/json`.
Auth: `Authorization: Bearer <access_token>`.

Resources are versioned independently. The shape is `https://api.workday.com/<resource>/v<N>/<path>`. For example:
```
GET    https://api.workday.com/common/v1/workers
GET    https://api.workday.com/common/v1/workers/{ID}
GET    https://api.workday.com/absenceManagement/v1/workers/{ID}/absenceRequests
POST   https://api.workday.com/absenceManagement/v1/workers/{ID}/absenceRequests
GET    https://api.workday.com/absenceManagement/v1/workers/{ID}/timeOffBalances
GET    https://api.workday.com/expenses/v1/workers/{ID}/expenseReports
POST   https://api.workday.com/expenses/v1/workers/{ID}/expenseReports
GET    https://api.workday.com/procurement/v1/purchaseRequisitions
POST   https://api.workday.com/procurement/v1/purchaseRequisitions
GET    https://api.workday.com/recruiting/v1/jobPostings
```

The `{ID}` in worker-scoped paths is the worker's WID (32-char hex), not the external Employee_ID.

### Tenant-scoped REST (legacy)
Base URL: `https://<pod>/ccx/api/v<N>/<tenant>`. The pod prefix (`wd5-impl-services1`, `wd102`, `wd2-services1`, etc.) varies per tenant — Workday tenants are pinned to a datacenter pod and the URL must reflect it.

Same JSON / OAuth shape as the gateway. Same path suffixes after the tenant segment.

### Common query params
- `limit` — page size (default 100, max 100 on most endpoints).
- `offset` — zero-indexed offset into the result set.
- `Accept-Language` — locale (e.g., `en-US`, `de-DE`). Affects display labels in the response.
- Many resources support resource-specific filter params (e.g., `effective`, `from`, `to` on absence; `period` on expenses).

### Response envelope
Most list endpoints return:
```json
{
  "data": [ /* objects */ ],
  "total": 42
}
```
Single-resource GETs return the object directly.

### Authentication on requests
- **OAuth 2.0 Bearer**: `Authorization: Bearer <access_token>`. Token endpoint is tenant-scoped: `POST https://<pod>/ccx/oauth2/<tenant>/token` with `grant_type=refresh_token&refresh_token=...&client_id=...&client_secret=...`. Returns `access_token` (typically 1-hour TTL).
- **Basic Auth (SOAP / RaaS only)**: `Authorization: Basic <base64(<isu_user>@<tenant>:<password>)>`. Note the `@<tenant>` suffix — without it, the request fails.

### SOAP / WWS API (mention only — REST should be preferred)
Tenant-scoped at `https://<pod>/ccx/service/<tenant>/<service>/v<N>`. Service names map to functional areas: `Human_Resources`, `Staffing`, `Compensation`, `Payroll`, `Recruiting`, `Resource_Management`, `Financial_Management`, `Time_Tracking`, `Absence_Management`. Each service exposes dozens of operations (`Get_Workers`, `Hire_Employee`, `Submit_Time_Off`, etc.). Operations take and return XML. Use REST when the equivalent endpoint exists; SOAP only when it doesn't.

### Rate limits
Workday does not publish a hard public rate limit number. Soft limits exist (concurrent-call ceilings per tenant, per ISU); customers hitting them get HTTP 429 with a Retry-After header. Reasonable defaults for mock pacing: 25 req/sec sustained, burst to 50.

## VISUAL IDENTITY

Brand colors:
- **Workday orange**: `#F38B00` (the wordmark "Workday." sets a hard orange against light backgrounds).
- **Header navy**: `#1E2A3A` (top bar background — dark slate-blue, not pure black).
- **Surface white**: `#FFFFFF` for cards, `#F4F5F7` for the page background.
- **Divider gray**: `#E5E7EB`.
- **Text primary**: `#1E2A3A`.
- **Text secondary**: `#5A6675`.
- **Action blue**: `#0875E1` for clickable links / button accents (Workday uses orange and blue; orange is brand, blue is action).

Typography:
- Primary UI font: **Inter** (Google Fonts) is a defensible public-CDN match; Workday's actual product UI uses a proprietary "Worksans/Workday Sans" family, but Inter passes the glance test at 13–16px.
- Body text: 14px.
- Card/worklet titles: 15px semibold.
- Table cells: 13px.
- Section headers: 18px semibold.

Icon set:
- Workday uses an internal icon library (line-style, 2px stroke). For mocks, `lucide-react` is close enough.

Layout primitives:
- **Top bar**: 56px tall, navy background, white text, orange accent on the wordmark.
- **Search bar**: centered in the top bar, ~480px wide.
- **Content area**: 24px page padding, max-width ~1200px on home/list pages, full-bleed in worker profile.
- **Worklet card grid**: 4 columns at desktop width, 16px gap, ~180px square cards.
- **Inbox panel** (when shown): right-side rail, 320px wide.

## UI PATTERNS

### Home page (worklets)
Grid of clickable square tiles ("worklets"), each branded with an icon and a count. Common worklets: Time Off, Pay, Benefits, Expenses, Personal Information, Career, Inbox, Notifications. Clicking a worklet opens its dedicated worklet page. This is the iconic "looks like Workday" surface — a mock without a worklet grid does not read as Workday.

### Worklet detail page (e.g., Time Off)
Per-worklet page. For Time Off: a balance summary at the top (one card per absence type — Vacation Hours, Sick Hours, Personal Hours), a primary action button ("Request Absence" or "Request Time Off"), and a history list below showing recent absence requests with status badges. Selecting a request opens the absence request detail view.

### Worker profile
Header band: photo (circular avatar, 80px), name + position title, manager link, "Actions" button (drop-down of related BP starts: Job Change, Comp Change, Terminate, etc.). Tab strip below: Job · Compensation · Time Off · Pay · Personal · Career · Performance · Documents. Active tab indicated by an orange underline.

### Inbox
Right-rail or full-page view. Each row is a BP step awaiting the user (e.g., "Approve Time Off: Marcus Chen — 2 days"). Clicking a row opens the action surface (approve/deny form).

### Search
Top-bar input. As the user types, a dropdown shows categorized results (Workers, Reports, Tasks, Custom Objects). Selecting a result navigates to the canonical page for that entity.

### Absence Request form (the PTO submission UX)
Modal or inline form. Fields: Absence Type (dropdown), From date, To date, Hours per day (defaults to 8), Comment. Submit triggers the BP, which lands the request in the manager's Inbox for approval. The submitter sees a confirmation toast and the new entry appears at the top of their Time Off history.

## AUTH

Authentication modes a real Workday tenant accepts:

1. **OAuth 2.0 — Refresh Token grant (REST, primary)**:
   - `POST https://<pod>/ccx/oauth2/<tenant>/token`
   - Body: `grant_type=refresh_token&refresh_token=<rt>&client_id=<cid>&client_secret=<cs>`
   - Response: `{ "access_token": "...", "expires_in": 3600, "token_type": "Bearer" }`
   - The refresh token is long-lived (issued at API-Client setup) and reused. Only the access token rotates.
   - Pass the access token as `Authorization: Bearer <token>`.

2. **OAuth 2.0 — Authorization Code grant (REST, when a user must be in the loop)**:
   - User redirect through `https://<pod>/ccx/oauth2/<tenant>/authorize?response_type=code&client_id=...&redirect_uri=...`
   - Exchange the code at the same `/token` endpoint with `grant_type=authorization_code`.
   - Less common server-to-server.

3. **Basic Auth (SOAP, RaaS)**:
   - `Authorization: Basic <base64(<user>@<tenant>:<password>)>`
   - The `@<tenant>` suffix is required on the username; omitting it is a frequent integration bug.

4. **x509 client certificate**:
   - Mutual TLS. Less common; used in regulated environments.

5. **SAML SSO** — user-facing login only. Not for integrations.

**Default for mocks**: OAuth 2.0 refresh-token flow. If the demo hinges on the auth dance, mock the `/oauth2/<tenant>/token` endpoint to return a fake access token; otherwise skip auth on the mock entirely (matching every other platform mock in this repo).

## KNOWN-IMPOSSIBLE

These are the things Workday cannot do that SEs and customers most often assume it can. If a mock is built to demo one of these, the customer will find out the truth during implementation.

### No streaming / websocket / SSE API
Workday has no `wss://...` or Server-Sent-Events stream of record changes. There is no subscription primitive on REST. Customers wanting "near-real-time" notifications do one of:
- Configure an outbound REST step on the relevant Business Process (this fires per-transaction, not as a general subscription).
- Schedule an outbound EIB to ship deltas on a cron.
- Poll the relevant REST collection (typical interval: 5–15 minutes; aggressive integrations go to 1 minute and risk rate limits).

### REST coverage is incomplete — many domains are still SOAP-only
This is the single biggest "wait, Workday can't do that?" surprise. The REST API covers Common, Absence, Expenses, Recruiting, parts of Procurement, parts of Talent — but NOT Hire, Termination, Job Change, Compensation Change, Pay Run, Benefits Enrollment, Performance Review submission, Position Management, or Org Hierarchy maintenance. Those domains are SOAP-only today. If a demo needs to write to them, plan for SOAP. ([Workday API release notes — REST coverage matrix updates each release.](https://community.workday.com))

### No webhook subscription API
Workday has no generic "POST your URL when X changes" webhook surface. Outbound REST is configured per-BPF-step at design time, not subscribed to at runtime. A new event type means a config change inside the tenant.

### Studio integrations are not externally callable
Studio integrations live inside the tenant. They run on a schedule or are triggered by BPF steps. There is no `POST /studio/integrations/{id}/run` from outside the tenant. (EIBs DO have a Launch endpoint, but EIBs are batch.)

### No raw SQL / no native cross-tenant queries
Workday does not expose its underlying database. All access is via REST/SOAP/RaaS. Cross-tenant federated queries do not exist — a multi-tenant customer that wants joined data across tenants does it via custom EIB chains.

### No idempotency keys on create endpoints
REST POSTs are not idempotent by default. Retrying a failed POST can create a duplicate. The standard mitigation is to query for the just-created record by a natural key (Worker + Date Range for an absence request, for example) before retrying. Some SOAP operations have a `Force` flag with similar semantics, but no `Idempotency-Key` header on REST.

### No upsert by external ID on REST
Same shape as the ServiceNow gap: REST POSTs always create, PUTs require the WID. There is no upsert-by-external-key. EIBs can upsert; REST cannot.

### Reports-as-a-Service (RaaS) cannot write
RaaS is read-only by design — it exposes a custom report's output. To write back, an integration has to call REST/SOAP separately.

## COMMON SE SCENARIOS

### `[REAL]` PTO / Time-Off request via Absence Management REST
SE wants to show: an employee asks the agent for time off, the agent calls `POST /absenceManagement/v1/workers/{ID}/absenceRequests`, the request appears in the worker's Time Off history and in the manager's Inbox for approval.
- Mock surfaces: home worklet grid, Time Off worklet page (balance + history), absence request detail page, plus the REST endpoint above and `GET /timeOffBalances`.
- This is the anchor mock for this platform in this repo (`workday-pto-smoke`).

### `[REAL]` Worker directory lookup
SE wants to show: an external integration queries Workday for a worker's email, manager, position, or cost center.
- Mock surfaces: `GET /common/v1/workers` with a filter, `GET /common/v1/workers/{ID}`. Seed with 5–10 realistic workers.

### `[REAL]` Expense report submission
SE wants to show: an employee dictates expenses, the agent creates an expense report.
- Mock surfaces: `POST /expenses/v1/workers/{ID}/expenseReports`, plus an Expenses worklet page. Larger scope than PTO — multiple line items, currency handling, receipt placeholders.

### `[REAL]` Purchase requisition (Workday Procurement)
SE wants to show: an agent creates a purchase requisition in Workday rather than SAP.
- Mock surfaces: `POST /procurement/v1/purchaseRequisitions`. Visually similar to the SAP ME5A mock; differentiator is the Workday chrome.

### `[REAL-WITH-CAVEAT]` New-hire onboarding (Hire BP)
SE wants to show: HR submits a new hire, downstream provisioning fires (Okta, email, Slack, Salesforce).
- Caveat: Hire is SOAP-only. The Workday side of the demo requires building a SOAP envelope (`Staffing.Hire_Employee`) — not REST. Elementum's `api_task` can be coerced to send XML, but response parsing is awkward. If the demo can be re-framed around an existing-worker change (e.g., `Maintain_Contact_Information`) it's lighter weight; for a true new-hire flow, plan for the SOAP build.

### `[REAL-WITH-CAVEAT]` Custom Studio-integration replacement
SE wants to show: replacing a brittle Studio integration that pulls a Workday RaaS report and pushes it elsewhere.
- Caveat: This is the most strategic demo for the Translator project, but it's case-by-case. Studio integrations don't have a uniform shape — they're customer-built. The demo has to be tied to a specific customer's specific integration. Plan to read the customer's RaaS URL, understand the report columns, and rebuild the downstream side in Elementum.

### `[NOT-SUPPORTED]` Real-time worker change subscription
See KNOWN-IMPOSSIBLE. Refuse and propose either an outbound BPF step (push) or a polling integration (pull).

### `[NOT-SUPPORTED]` Hire/Terminate via REST
See KNOWN-IMPOSSIBLE. Either use SOAP or scope the demo to a domain that IS in REST.

### `[NOT-SUPPORTED]` Generic webhook subscription
See KNOWN-IMPOSSIBLE. Outbound REST steps on BPs are the closest equivalent; they require tenant config per event.

## HYGIENE

Naming conventions to make mock data look right:

- **WID** (Workday ID): 32-char lowercase hex, no dashes. Same shape as a ServiceNow `sys_id`. Use `crypto.randomBytes(16).toString("hex")` to generate.
- **Employee_ID**: external ID; pattern is customer-defined. For mocks, use `EMP-` prefix + 5 zero-padded digits (`EMP-00012`). Realistic alternative: bare 6-digit (`100412`).
- **Absence Request ID**: `ABS-` + 4-digit year + `-` + 6-digit sequence (`ABS-2026-001234`). The year segment makes them sortable and visually obvious as time-off records.
- **Expense Report ID**: `EXP-2026-001234`.
- **Purchase Requisition (Workday)**: `PR-2026-001234` — distinguish from SAP's `0010001234` 10-digit pattern.
- **Position ID**: `P-` + 6 digits.
- **Tenant slug**: 4–12 chars, lowercase, alphanumeric or underscore. Never use a real customer name. Examples: `acme_dpt1`, `globex`, `initech_pt1`.
- **Pod prefix** (in URLs): `wd5-impl-services1` is a common-looking choice for sandbox; `wd2-services1` for prod. Don't use a customer's actual pod.
- **Email**: `<firstname>.<lastname>@<tenant>.example`. Never real customer domains.

Dates:
- REST API uses ISO 8601 with timezone offset (`2026-04-23T13:32:11+00:00`).
- The Workday UI typically displays dates as `MM/DD/YYYY` in en-US locale, `DD/MM/YYYY` in en-GB, `DD.MM.YYYY` in de-DE.
- For absence requests, the `from` and `to` are date-only (`YYYY-MM-DD`), no time.

Fake companies / people for seed data:
- Use the same demo personas as the other mocks (Acme, Globex, Initech, Wayne Enterprises, Umbrella).
- Worker names: pick obviously fictional first/last pairs (Alice Example, Marcus Chen, Patricia Nguyen, Henry Schultz). Reusing names that appear in the Salesforce/Jira mocks is fine — it's the same fictional universe.
- Photos: don't seed real photos. Either use SVG placeholder avatars with initials or a stable demo-only placeholder URL.

Compliance red flags to never put in seed data, even as jokes:
- Real SSNs, tax IDs, or anything that looks like a national ID.
- Real bank routing/account numbers.
- Real birth dates of real people (Workday seeds birth date as part of HCM; mock birth dates only).
- Healthcare or benefits identifiers (member IDs, group numbers).
- Any actual customer name from Workday's published customer logo wall.

Security-group / domain notes (for mocks that claim to enforce them):
- Real Workday returns HTTP 403 with a body like `{"error": "...", "message": "Worker is not authorized..."}` when a domain rule denies. Mocks enforcing security should mimic the 403 body shape.
- A worker editing their own data uses the "Self-Service" group — distinct from a manager editing a report. The default mock should assume Self-Service unless the demo explicitly flips to manager.

## SOURCES

- [Workday REST API documentation (community login required)](https://community.workday.com/api)
- [Workday API Gateway overview](https://community.workday.com/articles/962174) — community article on the modern REST surface
- [Absence Management REST API reference](https://community.workday.com/api/absence-management) — the resource targeted by the PTO mock
- [Workday OAuth 2.0 documentation](https://doc.workday.com/admin-guide/en-us/system-monitoring/security/oauth.html)
- [Workday Web Services (SOAP) reference](https://community.workday.com/sites/default/files/file-hosting/productionapi/index.html) — public-mirror entry into the SOAP catalog
- [Workday Brand site](https://www.workday.com/en-us/about-workday/brand.html) — brand color and logo verification
- [Workday Community — Studio integration patterns](https://community.workday.com)

Last verified: 2026-05-01. If any API shapes above look wrong against a current tenant, update this file before updating any mock.
