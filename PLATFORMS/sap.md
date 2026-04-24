# SAP (ERP Central Component / S/4HANA)

SAP is the dominant enterprise ERP suite. For SE demos the two deployment shapes that matter are **SAP ECC** (the legacy on-prem system still running at most large enterprises, driven through the SAP GUI / SAPGUI for Windows client) and **SAP S/4HANA** (the modern successor, available on-prem and as S/4HANA Cloud). Both share the transaction-code + ABAP + BAPI heritage; S/4HANA additionally exposes OData v2/v4 services and Fiori apps. The procurement scenarios customers most often want demoed (Purchase Requisitions, Purchase Orders, Goods Receipts, Invoice Verification, Vendor Master) live in modules MM (Materials Management) and FI (Financial Accounting). This file is tuned for those first.

A "real" SAP deployment is reached through either the SAP GUI thick client talking to an application server over DIAG / RFC, or through HTTPS on the Internet Communication Framework (ICF) at `https://<host>:<port>/sap/...`. S/4HANA Cloud tenants are reached at `https://my<tenant>.s4hana.cloud.sap/sap/opu/odata/...`.

## CAPABILITIES

### Data model
- **Tables** are the primary entity at the database layer (e.g., `EBAN` for Purchase Requisition items, `EKKO`/`EKPO` for Purchase Order header/items, `LFA1` for vendor master, `MARA` for material master). Real customers and ABAP developers often think in table names — an SE asking about "EBAN" means purchase requisition items.
- **Business Objects** sit above tables — `BUS2105` = Purchase Requisition, `BUS2012` = Purchase Order, `BUS1001` = Material, `LFA1`/`KRED` = Vendor. BAPIs and many APIs are addressed by Business Object.
- **Organizational structures** control every record: Company Code (4 chars, e.g., `1000`), Plant (4 chars), Purchasing Organization (`EKORG`), Purchasing Group (`EKGRP`), Cost Center, G/L Account, Business Area, Profit Center. Every procurement doc carries these.
- **Document numbers** — Purchase Requisitions use 10-digit numeric IDs by default (`0010001234`); Purchase Orders the same; many customers configure alpha prefixes via number ranges (e.g., `PR-1096`, `PRCRQ-70`).
- **Item-level** data is always a separate table from header data: a PR header is one row in `EBAN_H` equivalents, each line item a row in `EBAN`. Same for POs (`EKKO` header, `EKPO` items).
- **Account assignment** is a separate sub-structure on each item (`EBKN` for PRs): a single PR item can split cost across multiple cost centers / G/L accounts / WBS elements / internal orders.

### UI surfaces
- **SAP GUI** (Windows thick client, also SAP GUI for Java). The "green screen" interface most procurement users still work in daily. Transaction codes (4–5 char mnemonics like `ME51N`, `ME5A`, `ME21N`, `MIRO`) are the primary navigation — users type them into the command field in the top-left. This is what `sap-procurement.html` mimics.
- **SAP Fiori** (modern web UI). A library of task-focused apps served from the Fiori Launchpad; the replacement UX for most SAP GUI transactions. Apps have human-language names like "Manage Purchase Requisitions" and run against the same OData services as custom integrations. Visually: white + SAP blue, cards and responsive layouts, Fundamental Styles / Horizon theme.
- **SAP GUI for HTML** (ITS / WebGUI) — browser-rendered SAP GUI served over HTTP. Looks identical to the thick client but over HTTP(S). Useful for mock deployments because no client install is required, and customers frequently demo their SAP via this.
- **SAP Business Client (NWBC)** — a shell that combines classic GUI + Web Dynpro / Fiori apps. Increasingly rare.

### Automation
- **ABAP** — the in-server procedural + OO language customers use for every bit of custom logic. Reports (`SE38`), Function Modules (`SE37`), Classes (`SE24`), User Exits / BAdIs / Enhancement Spots. Not accessible remotely; customers edit in SAP GUI's ABAP Workbench.
- **SAP Workflow** (classic — transaction `SWDD`, `SWEHR`). Visual workflow editor for approval chains (PR release strategies, PO approvals, invoice approvals). Workflows are triggered by business events published by the system (`BO.CHANGED`, `BO.CREATED`) or explicitly from ABAP.
- **Release Strategies** (MM) — configurable approval chains for Purchase Requisitions and Purchase Orders. Defined in `OMGSCK` / `OMGS` transactions. Every release strategy is a set of release codes assigned to approver roles, with a release sequence.
- **Output Determination** — message/output configuration for POs (e.g., auto-send to vendor by EDI, print, email). Defined under `NACE`.
- **Scheduled Jobs** — `SM36` / `SM37`. ABAP reports run on background schedules.
- **SAP Process Integration / PI/PO / CPI** — separate middleware for message-based integration. Often between SAP and non-SAP systems.

### Integration
- **BAPIs** — Business Application Programming Interfaces. Callable over RFC (Remote Function Call) from external systems via the SAP JCo library, or from ABAP. Examples: `BAPI_REQUISITION_CREATE`, `BAPI_PO_CREATE1`, `BAPI_VENDOR_CREATE`.
- **IDoc** — Intermediate Document. Asynchronous message format for EDI-style integration. IDoc types: `PREQCR` (purchase requisition), `ORDERS05` (purchase order outbound), `INVOIC02` (invoice inbound).
- **OData services (S/4HANA and later ECC with Gateway)** — RESTful JSON/XML services at `/sap/opu/odata/sap/<service_name>`. Modern integration surface. Examples: `/sap/opu/odata/sap/API_PURCHASEREQ_PROCESS_SRV/PurchaseRequisition`.
- **SOAP services** — SAP-published web services, addressable at `/sap/bc/srt/rfc/sap/...` or `/sap/bc/srt/scs/sap/...`. Older pattern, still in use at many customers.
- **SAP Ariba / Fieldglass / Concur / SuccessFactors** — separate SaaS products in the SAP portfolio. Integrated via APIs but NOT part of "core SAP"; a customer's ECC and their Ariba tenant are separate systems. Customers often conflate them — confirm which system holds the data before mocking.
- **Punchout (cXML / OCI)** — SAP supports supplier punchout directly via the **OCI (Open Catalog Interface)** protocol; customers on SAP Ariba use **cXML** (different protocol, same concept). OCI posts form-encoded parameters back to SAP; cXML posts a `PunchOutOrderMessage` XML document. **Do not conflate the two.**

### Auth modes the platform accepts
- **SAP logon** — SID + client (3-digit mandant, e.g., `100`) + user + password (DIAG / SAP GUI).
- **Basic Auth** on HTTP services — `Authorization: Basic <base64(user:pass)>`. Common on ICF services.
- **OAuth 2.0** — S/4HANA Cloud and newer on-prem installs. Both SAML Bearer and Client Credentials grant types supported via the OAuth 2.0 server configured under `SOAUTH2` (on-prem) or the Communication Arrangements UI (Cloud).
- **Certificate (X.509)** — mTLS for high-trust integrations.
- **SAML SSO** — user-facing for Fiori Launchpad, not for server-to-server.
- **SAP Logon Ticket / Assertion Ticket** — SAP's proprietary SSO cookie, used between SAP systems.

### Admin
- **Authorization objects** and **roles** (`PFCG`) — per-transaction, per-field, per-organizational-unit authorizations. Extremely granular.
- **Clients** (mandanten) — logical tenants within a single SAP system. Dev / QA / Prod are usually separate systems AND separate clients (`100`, `200`, `300`).
- **Transport Management System (TMS)** — the way changes (ABAP, config, custom tables) are moved between systems. Transports are numbered (`DEVK900123`).

## API SURFACE

Base URL patterns:
- **On-prem ECC / S/4HANA ICF**: `https://<host>:<port>` (commonly `:8443` or `:50000`-range for HTTPS). Services at `/sap/opu/odata/...`, `/sap/bc/srt/...`, `/sap/bc/...`.
- **S/4HANA Cloud**: `https://my<tenant>.s4hana.cloud.sap`. Same path prefixes.
- **Cloud test/sandbox**: `https://my<tenant>.s4hana.ondemand.com`.

All modern HTTP-based APIs for SE demos are **OData v2 or v4 over HTTPS**, JSON or XML payloads. Default content type is `application/json` when the client asks for it via `Accept: application/json`; the platform will happily serve XML too.

### Authentication on requests
- **Basic Auth**: `Authorization: Basic <base64(user:pass)>` — user must exist in the addressed client.
- **OAuth 2.0 Bearer**: `Authorization: Bearer <access_token>` — supported on S/4HANA Cloud and OAuth-configured on-prem.
- **CSRF token protection** on write operations:
  1. Client sends `GET` with header `X-CSRF-Token: Fetch`.
  2. Server responds with header `X-CSRF-Token: <token>` and sets a session cookie.
  3. Subsequent `POST` / `PUT` / `PATCH` / `DELETE` must include the same `X-CSRF-Token` header and cookie. **This is mandatory; without it, writes return `403 Forbidden` with `CSRF token validation failed`.**
  4. Mocks MUST implement the fetch-then-write pattern or they will not match the real integration flow.

### Purchase Requisition OData service

One of the most common services for procurement demos. Service root:
```
/sap/opu/odata/sap/API_PURCHASEREQ_PROCESS_SRV
```

Entity sets:
- `/PurchaseRequisitionHeader` — header
- `/PurchaseRequisitionItem` — line items, navigable from header via `to_PurchaseReqnItem`
- `/PurchaseReqnAcctAssignment` — account assignment
- `/PurchaseReqnItemText` — item texts

Paths:
```
GET    /PurchaseRequisitionHeader                             # list
GET    /PurchaseRequisitionHeader('<PR number>')              # single (key is 10-digit ID)
GET    /PurchaseRequisitionHeader('<PR number>')/to_PurchaseReqnItem   # items
POST   /PurchaseRequisitionHeader                             # create (CSRF required)
PATCH  /PurchaseRequisitionHeader('<PR number>')              # update (CSRF required)
DELETE /PurchaseRequisitionHeader('<PR number>')              # delete (CSRF required)
```

Common query params (OData v2 conventions):
- `$filter` — OData filter expression, e.g., `$filter=PurReqnReleaseStatus eq '02'`
- `$top` / `$skip` — pagination
- `$select` — field projection (comma-separated)
- `$expand` — eager-load navigation (e.g., `$expand=to_PurchaseReqnItem`)
- `$inlinecount=allpages` — include total count in response
- `$format=json` — force JSON over XML content negotiation

Response envelope for a list (OData v2 JSON):
```json
{
  "d": {
    "results": [
      { "...": "..." },
      { "...": "..." }
    ],
    "__count": "47"
  }
}
```

Response for a single entity:
```json
{
  "d": {
    "__metadata": {
      "id": "https://.../PurchaseRequisitionHeader('0010001234')",
      "uri": "https://.../PurchaseRequisitionHeader('0010001234')",
      "type": "API_PURCHASEREQ_PROCESS_SRV.PurchaseRequisitionHeaderType"
    },
    "PurchaseRequisition": "0010001234",
    "PurReqnDescription": "Office Supplies Q4",
    "CreatedByUser": "JDAVIS",
    "CreationDate": "/Date(1727740800000)/",
    "PurReqnReleaseStatus": "02",
    "PurchasingGroup": "001",
    "CompanyCode": "1000",
    "to_PurchaseReqnItem": {
      "__deferred": {
        "uri": "https://.../PurchaseRequisitionHeader('0010001234')/to_PurchaseReqnItem"
      }
    }
  }
}
```

Key shape rules:
1. **Envelope is `{ "d": { ... } }`**, not `{ "result": ... }`. Lists are under `d.results`; singletons directly under `d`. OData v4 drops the `d` wrapper and uses `value` for lists — versioning matters.
2. **Dates are wrapped in `/Date(<ms>)/`** in OData v2 JSON (epoch milliseconds as a string inside a token). OData v4 uses ISO 8601. Do not use ISO strings in v2 mocks — integrations will break.
3. **Navigation properties** are `__deferred` by default unless `$expand` asks for inline. Serialize them as `{ "__deferred": { "uri": "..." } }`.
4. **`__metadata` block** on every entity (id, uri, type) — integrations validate this.
5. **Keys in URLs are quoted** — `PurchaseRequisitionHeader('0010001234')`, not `PurchaseRequisitionHeader(0010001234)`. PR numbers are strings even though they look numeric.
6. Empty optional fields are the empty string, not `null`, per SAP convention.

Pagination:
- OData v2: `$top` + `$skip` only. `$inlinecount=allpages` adds `d.__count`. No Link headers.
- OData v4: `@odata.nextLink` in the response body when more pages exist.

Error envelope (OData v2):
```json
{
  "error": {
    "code": "SY/530",
    "message": {
      "lang": "en",
      "value": "Purchase requisition 0010001234 does not exist"
    },
    "innererror": {
      "application": { "component_id": "MM-PUR", "service_namespace": "/SAP/", "service_id": "API_PURCHASEREQ_PROCESS_SRV" },
      "transactionid": "A1B2C3D4E5F6"
    }
  }
}
```
Common status codes: `200 OK`, `201 Created`, `204 No Content`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden` (usually an authorization object denial or CSRF failure), `404 Not Found`, `409 Conflict` (concurrency / ETag mismatch on update).

### Other relevant procurement OData services

- **Purchase Orders**: `/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV` (entity sets: `A_PurchaseOrder`, `A_PurchaseOrderItem`).
- **Material Master**: `/sap/opu/odata/sap/API_PRODUCT_SRV` (entity: `A_Product`).
- **Business Partner / Vendor**: `/sap/opu/odata/sap/API_BUSINESS_PARTNER` (entity: `A_BusinessPartner`, role `FLVN01` for vendors).
- **Goods Movement**: `/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV`.

### ME5A (List Display of Purchase Requisitions) — the demo-stable target

Transaction `ME5A` is SAP GUI's classic report for listing purchase requisitions with a selection screen, toolbar actions (Execute, Print, Display, Change, Create, Export, Layout), and an ALV Grid showing results. This is what `sap-procurement.html` mimics in the prior procurement repo. It is not itself an API — it's a UI transaction — but it is what users and customers think of when they say "the PR list in SAP." Any SAP procurement mock should show ME5A's selection screen + ALV grid as its landing view. Selection fields (these are the real ones):
- `EKGRP` — Purchasing Group (range)
- `ERNAM` — Requisitioner (range)
- `MATKL` — Material Group (range)
- `BANFN` — PR Number (range)
- Processing status checkboxes: Open / Closed / Released

### Rate limits

On-prem ECC and S/4HANA have no vendor-published rate limits; customers size their application servers. S/4HANA Cloud enforces tenant-level rate limits (defaults around **10,000 calls per user per hour** on OData services, higher on bulk endpoints — confirm per-tenant). The platform returns `429 Too Many Requests` with header `Retry-After: <seconds>` when tripped. ([SAP S/4HANA Cloud — API limits](https://help.sap.com/docs/SAP_S4HANA_CLOUD))

## VISUAL IDENTITY

Two distinct visual languages coexist and every demo has to pick one up front.

### SAP GUI (classic green-screen)

The iconic "SAP looks like SAP" UI. This is what customers running ECC see daily.

Primary palette:
- SAP Blue `#1A3A5C` — header bar
- SAP Blue Dark `#0F2942` — toolbar accents
- SAP Orange / Gold `#F0AB00` — SAP brand highlight, status row
- Gray `#D4D4D4` — content panel backgrounds
- Light Gray `#F4F4F4` — selection screen background
- White `#FFFFFF` — table cells (alternating with light gray for zebra striping)

Functional grays:
- `#E6E6E6` — divider
- `#606060` — secondary text
- `#0F0F0F` — primary text

Status colors (ALV Grid status dots):
- Green `#4CAF50` — Released / Approved
- Yellow `#FFC107` — Pending / Awaiting
- Blue `#2196F3` — In process / Active
- Gray `#9E9E9E` — Closed / Cancelled
- Red `#F44336` — Blocked / Error

Typography:
- Primary UI font: **Arial**, 12px. This is the actual SAP GUI default on Windows. Fallback: `"Segoe UI", sans-serif`.
- Table body: **Courier New** / monospace, 12px. ALV Grid cells are monospace by convention.
- Labels: 11px bold.
- Transaction code bar text: 11px monospace.

Icon set:
- Real SAP GUI uses internal icons (roughly 200 of them, names like `ICON_EXECUTE_OBJECT`). For mocks, `lucide-react` is a pragmatic fallback — the visual weight is wrong but recognizable at a distance.

Layout primitives (SAP GUI):
- Top header strip: 28px, `#1A3A5C` background, white text. Shows `SAP` wordmark or client's procurement wordmark on the left; user/client/language/system-time strip on the right.
- Menu bar: 24px, light gray. Menus: Menu / Edit / Goto / System / Help, plus context menus.
- Standard toolbar: 28px, icon-only buttons for Save / Back / Exit / Cancel / Print / Find / First page / Last page / etc.
- Transaction code input: left side, 12 chars wide, fixed-width font, with an Execute (checkmark) button.
- Selection screen: collapsible, white-on-light-gray panel with label-input pairs. Range inputs are two boxes side-by-side separated by a "to" label.
- ALV Grid: zebra-striped rows (white / #FAFAFA), 1px divider, ~22px row height, selectable rows highlight blue.
- Status bar at the bottom: 20px, message area with icon for info/warning/error.

### SAP Fiori

The modern web UX. Used for Manage Purchase Requisitions, Create PR, My Inbox, and anything built post-2015. Distinctly whiter, cleaner, card-based.

Primary palette:
- Fiori Blue `#0070F2` — primary accent, links
- Fiori Dark Blue `#0854A0` — headers, active states
- White `#FFFFFF` — page background
- Fiori Background `#F5F6F7` — surface tint
- Divider `#E5E5E5`

Typography:
- Primary font: **72** (SAP's shipped typeface) or **Arial** as a public-CDN fallback.
- Body: 14px.
- Section headers: 18px semibold.

Iconography: **SAP Icons** (icon font at `sap.m.Icon`), or `@ui5/icons` npm package. `lucide-react` is an acceptable mock fallback.

Layout primitives:
- Shell bar: 56px, white, with a logo left, search center, user avatar right.
- Work list: 16px gutter, card-based or table-based.
- Object pages: header + facets + sections.

### Which to pick for a given mock

- Customer runs ECC and does procurement in SAP GUI daily → use the GUI chrome.
- Customer runs S/4HANA and has moved procurement users to Fiori → use Fiori chrome.
- If unclear, ask. Most procurement customers in 2026 still run SAP GUI for PR/PO because ME5A, ME51N, ME21N transactions pre-date Fiori and muscle memory is sticky. Default to SAP GUI unless the SE says otherwise.

## UI PATTERNS

### SAP GUI — transaction shell

Every GUI screen has the same top-to-bottom structure:
1. **Header strip** — SAP wordmark, user, client number (e.g., `100`), language code (`EN`), system time, system ID (`PRD`).
2. **Menu bar** — Menu / Edit / Goto / System / Help with transaction-specific menus inserted between.
3. **Standard toolbar** — 12–20 icon-only buttons, hover for tooltips. Back / Exit / Cancel are the three on the far left (`F3`, `Shift+F3`, `F12`).
4. **Transaction code input + Execute** — top-left. Typing a code and pressing Enter jumps to that transaction.
5. **Content area** — the transaction-specific screen (selection screen, ALV grid, form, tree).
6. **Status bar** — bottom strip, shows informational / warning / error messages with an icon.

### ME5A / ME51N / ME21N report pattern

Procurement transactions share a two-pane flow:

**Selection screen** (ME5A-style):
- Collapsible panel with label / input pairs in a two-column grid.
- Each input is either a single value, a range (two boxes + `to` label), or a multi-value button.
- At the bottom: Execute (`F8`), Get Variant, Save as Variant, Reset.
- Status checkboxes for processing filters (Open, Closed, Released).

**ALV Grid result pane**:
- Toolbar above grid: Find, Print, Display, Change, Create, Export (CSV / XLSX), Layout change, Sum / Subtotal, Filter, Sort.
- Column headers are bold, uppercase, left-aligned.
- Rows are zebra-striped; selected rows highlight blue.
- Status column uses a colored dot + text label.
- Right-click on any row: Display, Change, Copy, Print, Export.
- Double-click on a row: opens the detail transaction (ME53N for PR display, ME21N for PO).

### Detail view (ME53N display / ME52N change)

A tabbed editor over a single PR or PO:
- **Header tab** — PR number, Purchasing Group, Purchasing Organization, Company Code, Business Area, Status.
- **Item Overview tab** — tabular list of PR items (line number, material, quantity, unit, delivery date, plant, storage location, net price, currency).
- **Account Assignment tab** — per-item cost center / G/L account / WBS split.
- **Texts tab** — free-form item and header texts.
- **Approval tab** (if release strategy active) — who approved, when, pending approvers.

### Fiori — Manage Purchase Requisitions

A modern Fiori app with equivalent capability:
- Search bar at top + filter panel.
- List-object-page pattern: table of PRs → click one → object page with facet sections for header, items, approval.
- Create button in the top-right opens a guided flow.

## AUTH

Authentication modes a real SAP instance accepts:

1. **SAP GUI logon** — SID + client + username + password + optional language. Not applicable for server-to-server; this is the user front door.

2. **Basic Auth on HTTP services** — `Authorization: Basic <base64(user:pass)>`. Enabled by default on ICF services. The SAP user must have the authorization objects required for the service. Still the most common integration pattern at ECC customers.

3. **OAuth 2.0** (S/4HANA Cloud, newer on-prem with OAuth 2.0 server configured):
   - **Client Credentials grant** — `grant_type=client_credentials` with `client_id` and `client_secret` to the tenant's token endpoint (typically `https://<tenant>.authentication.<region>.hana.ondemand.com/oauth/token` for SCP-provisioned services, or `https://<host>/sap/bc/sec/oauth2/token` for on-prem). Returns a bearer token.
   - **SAML Bearer grant** — `grant_type=urn:ietf:params:oauth:grant-type:saml2-bearer` for user-impersonating integrations.
   - **Authorization Code grant** — user-facing OAuth with browser redirect. Rarer for server-to-server.

4. **X.509 client certificates (mTLS)** — configured on the ICF service; the client presents a cert and the system maps it to a user.

5. **SAP Logon Ticket / SAP Assertion Ticket** — SAP's cookie-based SSO. Used between SAP systems in a landscape, not for external integration.

6. **SAML SSO** — user-facing Fiori Launchpad login, not for APIs directly.

**Default for mocks**: Basic Auth for ECC demos (most realistic), Client Credentials OAuth for S/4HANA Cloud demos. **Always implement the CSRF fetch-then-write pattern** regardless of auth mode — it's not optional on the real platform.

## KNOWN-IMPOSSIBLE

Things SAP cannot do that SEs and customers routinely assume it can. Demoing these will blow up during implementation.

### No real-time subscription API for data changes
SAP has no WebSocket / SSE / Change Data Capture REST API for "notify me when a PR is created." Customers implement change notifications one of three ways:
- Publish a business event via `BAPI_EVENT_CREATE` from an ABAP user exit, and have IDoc / RFC / outbound message consumers listen.
- Configure Output Determination (`NACE`) with a medium of "External Send" to POST to an external URL on document save. This is POST-only, no subscription protocol.
- Poll the OData service on a timer (`$filter=CreationDate gt datetime'...'`).

If an SE asks for "live updates from SAP," push back to polling or outbound webhook-on-save. Do not mock a subscription endpoint.

### No GraphQL
SAP exposes OData v2 and v4. There is no native GraphQL endpoint. Customers building a GraphQL layer put a BFF (e.g., Apollo, Hasura with remote schema) in front of the OData services themselves — that's their infrastructure, not SAP's.

### No bulk / batch create endpoint outside `$batch`
OData supports `$batch` (multipart request bundling multiple operations). There is no "POST an array of 1000 PRs" endpoint on the PR service. `$batch` is the correct pattern; it is heavy and the limit per batch is typically 100 operations. For bulk loads, customers use IDoc inbound processing or Import. Don't mock a fictitious bulk REST endpoint.

### No server-side JavaScript in ABAP
Customers cannot drop in a `.js` file and have SAP execute it. Custom logic is ABAP. This becomes relevant when SEs want to demo "inject custom logic in the middle of a process" — the answer in SAP is "write an ABAP BAdI implementation," which is not a demo-able 10-minute task. Scope the demo to configuration or BAPI-level customization instead.

### No arbitrary SQL over OData
OData `$filter` does not accept free-form SQL. `JOIN`s across tables that OData doesn't expose as navigation are not possible via the API. Complex reporting happens in ABAP CDS views or SAP Analytics Cloud.

### No native upsert
`POST` always creates (fails on key collision with `409`). `PUT` / `PATCH` require knowing the key. No upsert-by-natural-key. Customers emulate via retrieve-then-update ABAP or IDoc.

### No cross-client queries
A single OData call cannot span multiple clients (`100` + `200`). Clients are isolated. Cross-system landscape queries require SAP Landscape Transformation / SLT or middleware.

### No ad-hoc custom fields via API
Custom fields on standard entities must be declared in ABAP via Append Structure, then exposed through Custom Fields & Logic (S/4HANA Cloud) or ABAP extensibility (on-prem). Customers cannot just "add a field to Purchase Requisition" from the OData service. Demoing "flexible schema" mis-sells.

### No native cXML — only OCI (out of the box)
SAP ECC's native punchout is **OCI**, not cXML. Customers doing cXML punchout (common with Ariba-integrated suppliers like Amazon Business) are using **SAP Ariba**, which is a separate product. If the demo is "SAP punches out to Amazon Business using cXML," the integration is actually going through Ariba Buying, not ECC directly. Get this right — otherwise the demo reflects an architecture that doesn't exist at ECC-only customers.

## COMMON SE SCENARIOS

### `[REAL]` Purchase Requisition list + detail via ME5A
SE wants to show: user enters ME5A, sets selection criteria, executes, sees the ALV grid of PRs, drills into one, sees items and account assignment.
- Mock surfaces: SAP GUI chrome (header / toolbar / transaction bar / status bar), selection screen, ALV grid, detail tabs.
- API layer: `GET /sap/opu/odata/sap/API_PURCHASEREQ_PROCESS_SRV/PurchaseRequisitionHeader` with `$filter` and `$expand=to_PurchaseReqnItem`.
- This is the procurement-SAP exemplar.

### `[REAL]` Create Purchase Requisition via ME51N
SE wants to show: user opens ME51N, fills the header + items, saves, SAP returns a new PR number.
- Mock surfaces: a create form in GUI chrome.
- API layer: `POST /sap/opu/odata/sap/API_PURCHASEREQ_PROCESS_SRV/PurchaseRequisitionHeader` with CSRF token fetched first. Response echoes the persisted entity with `PurchaseRequisition` populated.
- Realistic: release strategy would typically put the PR in "Not Released" status pending approval; mock should reflect this (status `02` Not Released, not `05` Released).

### `[REAL]` Release (approve) a Purchase Requisition
SE wants to show: an approver opens a PR, clicks Release, the status changes, the downstream PO can be created.
- Mock surfaces: detail view with a Release action button; a status dot that flips green.
- API layer: `PATCH` the `PurReqnReleaseStatus` field, or call a dedicated release function import. BAPIs also work — `BAPI_REQUISITION_RELEASE_GEN`.
- Caveat: real release strategies chain multiple approvers. Mock a single approver release; note that the real one is multi-step.

### `[REAL-WITH-CAVEAT]` PR → PO conversion
SE wants to show: an approved PR becomes a PO (ME21N with reference to PR).
- Caveat: This is a separate transaction invoking a different service (`API_PURCHASEORDER_PROCESS_SRV`). Mock both services or stage the demo as "same system, different transaction."

### `[REAL-WITH-CAVEAT]` OCI / cXML punchout from SAP to external supplier
SE wants to show: within a PR create flow, user clicks "Shop with Supplier X," gets redirected to the supplier, fills a cart, returns cart items as PR lines.
- OCI (ECC): SAP posts an HTML form with OCI parameters (`NEW_ITEM-DESCRIPTION[1]`, `NEW_ITEM-QUANTITY[1]`, `NEW_ITEM-UNITPRICE[1]`, etc.) to a URL the supplier serves. Supplier's cart-return submits a form back to the `HOOK_URL` SAP provided with the same `NEW_ITEM-*` field naming.
- cXML (Ariba): SAP Ariba sends a `PunchOutSetupRequest` XML; supplier responds with a `PunchOutSetupResponse` containing a `StartPage` URL; on cart return, supplier POSTs `PunchOutOrderMessage` XML to the `BrowserFormPost` URL.
- These are two different protocols — pick one per demo and say so. The mock in the prior procurement repo (`amazon-mock.html` + `/api/punchout/cart-return`) emulates a **simplified cXML-shaped** flow. Do not describe it as OCI to a customer running ECC.

### `[REAL]` Purchase Order list + detail
Same pattern as PR, different service. ME21N for create, ME22N for change, ME23N for display, ME2N / ME2L / ME2M for list reports.

### `[REAL]` Vendor master lookup
SE wants to show: integration looks up a vendor's address / bank / tax data before creating a PO.
- Mock surface: a vendor master detail page.
- API layer: `GET /sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner?$filter=BusinessPartnerRole eq 'FLVN01'`.

### `[NOT-SUPPORTED]` Real-time subscribe to PR creation
See KNOWN-IMPOSSIBLE. Refuse and propose polling or outbound message to a webhook.

### `[NOT-SUPPORTED]` "Ask SAP in natural language"
SAP has Joule (LLM assistant for S/4HANA Cloud) but it is not a general NL-query-over-SAP-data API. Do not mock an arbitrary NL→data endpoint.

### `[NOT-SUPPORTED]` Mix ECC and Ariba data in one API call
If the customer runs both, the integration pattern is two separate calls with a middleware layer joining — not a single unified endpoint. Mock accordingly.

## HYGIENE

Naming conventions for mock data:

- **Purchase Requisition number**: 10 digits with leading zeros, e.g., `0010001234`. If the SE's customer uses an alpha prefix number range (common), `PR-1096` or `PRCRQ-70` is realistic.
- **Purchase Order number**: same pattern, different range, commonly `45xxxxxxxx` for standard POs (10 digits).
- **Material number**: 18 chars, usually numeric or alphanumeric, e.g., `000000000000012345` or `MAT-00-0123`.
- **Vendor (Business Partner) number**: 10 digits, e.g., `0000100042`. Vendor role flag `FLVN01`.
- **Company Code**: 4 chars, commonly `1000`, `2000`, `US01`.
- **Plant**: 4 chars, commonly `1000`, `US10`.
- **Purchasing Group (EKGRP)**: 3 chars, commonly `001`, `100`, `IT1`.
- **Purchasing Org (EKORG)**: 4 chars, commonly `1000`.
- **Cost Center**: 10 chars, commonly `4000-1000`, `1000-CC-01`.
- **G/L Account**: 10 digits, commonly `0000400100` (Office Supplies), `0000410000` (Services), `0000415000` (Travel).
- **Business Area**: 4 chars, commonly `9900`, `US01`.
- **User ID (SAP Logon)**: 12-char max, uppercase, e.g., `JDAVIS`, `MCHEN`, `ARODRIGUE`. Not email-shaped.

Dates (OData v2):
- `/Date(<epoch_ms>)/` inside JSON. Example: `/Date(1727740800000)/` for `2024-10-01 UTC`.
- In SAP GUI screens, dates display as `DD.MM.YYYY` (European default; some customers switch to `MM/DD/YYYY`). Times are 24-hour `HH:MM:SS`.

Fake companies / vendors / people for seed data:
- Use "Acme Corp," "Globex Industrial," "Initech Solutions," "Wayne Enterprises."
- Vendor names: "Thermo Fisher Scientific," "Dell Technologies," "Staples Business," "Grainger," "Amazon Business," "Amazon Web Services" — these are real companies but are safe as vendor names because they are public B2B suppliers actually catalogued in most procurement systems. Still, do not fabricate invoices or prices that purport to be from them.
- User names (in all-caps, as SAP displays): `JDAVIS`, `MCHEN`, `TRODRIGUEZ`, `APATEL`, `KWILLIAMS`, `TKIM`.
- Emails follow customer format but for mocks use `@example.com`.

Compliance red flags to avoid in seed data:
- Real tax IDs / VAT numbers / EINs — if the demo involves a vendor master with a tax field, use obviously fake `XX-XXXXXXX` patterns.
- Bank account numbers / IBANs — never use a real one, not even a test one you found on a bank's docs.
- Real person salary data — SAP HCM / SuccessFactors demos with pay grades should use clearly fictional amounts.

Authorization / release-strategy notes:
- Real ME5A respects authorization object `M_BANF_EKG` (purchasing group) and `M_BANF_WRK` (plant). A user only sees PRs for purchasing groups and plants they are authorized for. Mocks that claim to enforce auth should reflect this.
- Real release strategies show release codes (e.g., `01`, `02`, `03`) corresponding to approver roles. Mock status flips should label them as release-code transitions, not generic "approved."

## SOURCES

- [SAP S/4HANA Cloud — API Business Hub: Purchase Requisition](https://api.sap.com/api/API_PURCHASEREQ_PROCESS_SRV/overview)
- [SAP S/4HANA Cloud — API Business Hub: Purchase Order](https://api.sap.com/api/API_PURCHASEORDER_PROCESS_SRV/overview)
- [SAP S/4HANA Cloud — API Business Hub: Business Partner](https://api.sap.com/api/API_BUSINESS_PARTNER/overview)
- [SAP Help Portal — Purchase Requisitions (ME5A, ME51N, ME53N)](https://help.sap.com/docs/SAP_ERP/53a6b4414fb1477b95da54d2176bdd9b)
- [SAP Help Portal — Release Strategy for Purchase Requisitions](https://help.sap.com/docs/SAP_ERP/53a6b4414fb1477b95da54d2176bdd9b)
- [SAP Help Portal — OData Protocol & CSRF Token Handling](https://help.sap.com/docs/SAP_NETWEAVER_AS_ABAP_752/68bf513362174d54b58cddec28794093/d12c86af7cd5437d9b2ea65c4e04e5cf.html)
- [SAP Help Portal — OCI (Open Catalog Interface) 5.0](https://help.sap.com/docs/SAP_SRM/2e800cd9a12f441f991c738d1a1ca969/4f0f4e6d82f75be5e10000000a445394.html)
- [SAP Ariba cXML Reference](https://www.cxml.org/)
- [SAP Fiori Design Guidelines — Horizon theme](https://experience.sap.com/fiori-design-web/)
- [SAP Brand Identity Guidelines](https://www.sap.com/about/trademark.html)

Last verified: 2026-04-23. If any OData response shapes above look wrong against a live S/4HANA tenant, update this file before updating any mock.
