# SAP ME5A smoke

Two-surface SAP procurement demo — the ME5A list at `/demos/sap-me5a-smoke`
and the canonical ME53N PR detail at `/demos/sap-me5a-smoke/me53n/{prNumber}`.
Both share a KV-backed store, so PRs created via the mock's OData API appear
on the ALV grid and at the share URL without a refresh round-trip.

This mirrors the JSM and Jira-Software smoke pattern: a primary work surface
(ME5A ALV grid) plus a canonical share-link page (ME53N PR detail), with one
durable store underneath. The `/me53n/<PR>` URL is what `_mockViewUrl` from
the create API points at — Slack-pasteable, browser-renderable, and survives
cold starts.

---

## Demo URLs

| Surface | URL |
|---|---|
| ME5A — list display | `/demos/sap-me5a-smoke` |
| ME53N — PR detail (canonical share link) | `/demos/sap-me5a-smoke/me53n/{prNumber}` |
| **API** — create PR | `POST /demos/sap-me5a-smoke/api/sap/opu/odata/sap/API_PURCHASEREQ_PROCESS_SRV/PurchaseRequisitionHeader` |
| **API** — list PRs | `GET  .../PurchaseRequisitionHeader` |
| **API** — get one PR (header) | `GET  .../PurchaseRequisitionHeader('{prNumber}')` |
| **API** — get items for one PR | `GET  .../PurchaseRequisitionHeader('{prNumber}')/to_PurchaseReqnItem` |
| **API** — fetch CSRF token | `GET  .../PurchaseRequisitionHeader` with header `x-csrf-token: fetch` |

API paths intentionally prefix with `/demos/sap-me5a-smoke/` so multiple
platform mocks can coexist on the same Vercel deployment. Real S/4HANA serves
these at `/sap/opu/odata/sap/API_PURCHASEREQ_PROCESS_SRV/...` on the tenant
host; when you point the Elementum `api_task` at this mock, use the full
`/demos/sap-me5a-smoke/api` prefix and the rest of the path lines up
byte-for-byte with what real SAP expects.

---

## SE talking points (30-second walkthrough)

1. **Open ME5A** — `/demos/sap-me5a-smoke`. Show the SAP GUI chrome (header
   strip, menu bar, transaction code input, status bar). Run the selection
   screen — the default filters hide CLOSED PRs. Hit Execute and the ALV
   grid lists the 6 seeds across the OPEN / IN_PROCESS / RELEASED / BLOCKED /
   CLOSED statuses.

2. **Drill into ME53N** — double-click any row. Lands on the read-only
   PR detail screen with the tabbed Header / Item Overview / Account
   Assignment layout. This is the same URL Elementum will emit in chat
   replies via `_mockViewUrl`.

3. **Fire the Elementum automation** that POSTs a new PR to the OData
   endpoint. Note the CSRF fetch-then-write pattern — Elementum handles
   that natively in the API task config (see below).

4. **Click the `_mockViewUrl`** from the chat reply — lands at
   `/me53n/0010001240` (or whatever PR number the mock minted) showing the
   freshly-created PR. Refresh ME5A — the new row is at the top of the
   ALV grid.

5. Narrate: "The Elementum API task is configured exactly as if it were
   hitting a real S/4HANA tenant — same OData path, same `{d: {...}}`
   envelope, same release-status code field, same CSRF roundtrip. When you
   repoint at production SAP, the only thing that changes is the base URL
   and the auth header."

---

## API contract

### CSRF roundtrip — required before every write

SAP rejects POST/PATCH/DELETE without a valid `x-csrf-token` header. The
flow is two requests:

```
GET  /PurchaseRequisitionHeader
     x-csrf-token: fetch
   → 200 OK
     x-csrf-token: <token>      (response header)

POST /PurchaseRequisitionHeader
     x-csrf-token: <token>      (request header, echoed back)
     Content-Type: application/json
     <body>
   → 201 Created
```

The mock honors the fetch leg (returns a stable token in the response
header) but does **not** validate the token on the POST. That keeps demo
prep simple and matches real SAP's behavior shape so SE-built integrations
that handle the roundtrip don't get surprised.

### POST `.../PurchaseRequisitionHeader`

Create a Purchase Requisition. Mirrors
[SAP's `API_PURCHASEREQ_PROCESS_SRV` Purchase Requisition create](https://api.sap.com/api/API_PURCHASEREQ_PROCESS_SRV/overview).

**Request body — full SAP shape (deep create with item)**
```json
{
  "PurReqnDescription": "Office Supplies — Q2",
  "CompanyCode": "1000",
  "to_PurchaseReqnItem": {
    "results": [
      {
        "Material": "TONER-HP-58A",
        "PurchaseRequisitionItemText": "HP 58A Black Toner Cartridge",
        "RequestedQuantity": "12.000",
        "BaseUnit": "EA",
        "Plant": "US01",
        "PurchasingGroup": "IT1",
        "DeliveryDate": "/Date(1746144000000)/",
        "NetPriceAmount": "89.99",
        "NetPriceCurrency": "USD"
      }
    ]
  },
  "CreatedByUser": "JDAVIS"
}
```

**Request body — flat shorthand (one item, top-level fields)**
```json
{
  "description": "Office Supplies — Q2",
  "material": "TONER-HP-58A",
  "quantity": 12,
  "unit": "EA",
  "plant": "US01",
  "purchasingGroup": "IT1",
  "requester": "JDAVIS",
  "deliveryDate": "02.05.2026",
  "netPrice": 89.99,
  "currency": "USD"
}
```

The shorthand form is for SE convenience when writing api_task config by
hand. The full deep-create form is what real SAP integrations send.

**Field rules**
- `PurReqnDescription` / `description` — **required**, free-form.
- `Material` / `material` — **required** on the item.
- `Plant` / `plant` — **required** on the item, 4-char.
- `PurchasingGroup` / `purchasingGroup` — **required**, 3-char.
- `RequestedQuantity` / `quantity` — **required**, must be > 0. Real SAP
  sends this as a stringified decimal (`"12.000"`); the mock accepts numbers
  too.
- `NetPriceAmount` / `netPrice` — **required**, ≥ 0.
- `NetPriceCurrency` / `currency` — one of `USD`, `EUR`, `GBP`. Defaults
  to `USD`.
- `DeliveryDate` / `deliveryDate` — accepts SAP's `/Date(<ms>)/` token,
  ISO 8601, or DD.MM.YYYY. Defaults to 14 days from today if omitted.
- `BaseUnit` / `unit` — defaults to `EA`.
- `CreatedByUser` / `requester` — ALL-CAPS SAP user id. Defaults to `JDAVIS`.
- `CompanyCode` / `companyCode` — 4-char. Defaults from a plant→company
  lookup table (US01/US02 → 1000).
- `status` (mock-only shorthand) — one of `OPEN`, `IN_PROCESS`, `RELEASED`,
  `BLOCKED`, `CLOSED`. Defaults to `OPEN` (Not Released, code `01`) to
  mirror real SAP's "create lands pending release strategy" behavior.
- Authorization header is accepted but not validated. (Real SAP requires
  Basic + CSRF, OAuth + CSRF, or mTLS.)

**Response (201 Created)** — full persisted entity in OData v2 envelope:
```json
{
  "d": {
    "__metadata": {
      "id": "https://elementum-translator.vercel.app/demos/sap-me5a-smoke/api/sap/opu/odata/sap/API_PURCHASEREQ_PROCESS_SRV/PurchaseRequisitionHeader('0010001240')",
      "uri": "https://.../PurchaseRequisitionHeader('0010001240')",
      "type": "API_PURCHASEREQ_PROCESS_SRV.PurchaseRequisitionHeaderType"
    },
    "PurchaseRequisition": "0010001240",
    "PurReqnDescription": "Office Supplies — Q2",
    "CreatedByUser": "JDAVIS",
    "CreationDate": "/Date(1745798400000)/",
    "PurReqnReleaseStatus": "01",
    "PurchasingGroup": "IT1",
    "CompanyCode": "1000",
    "to_PurchaseReqnItem": {
      "__deferred": {
        "uri": "https://.../PurchaseRequisitionHeader('0010001240')/to_PurchaseReqnItem"
      }
    },
    "_mockViewUrl": "https://elementum-translator.vercel.app/demos/sap-me5a-smoke/me53n/0010001240"
  }
}
```

`Location` header on the 201 also points at the new entity URI, per OData
v2 convention.

- **`_mockViewUrl`** is **non-standard, demo-only**. Real SAP never returns
  it. It's the share-link URL that opens the ME53N detail page so Elementum
  automations can template a clickable link into chat replies. When you
  repoint the automation at a real tenant, build the URL out-of-band from
  the customer's SAP GUI launchpad shortcut or a Fiori Manage PR link.

### Error envelope

Matches SAP's real OData v2 error shape (PLATFORMS/sap.md § Error envelope):
```json
{
  "error": {
    "code": "MEPO/052",
    "message": { "lang": "en", "value": "PR description (header text) is required." },
    "innererror": {
      "application": {
        "component_id": "MM-PUR",
        "service_namespace": "/SAP/",
        "service_id": "API_PURCHASEREQ_PROCESS_SRV"
      },
      "transactionid": "A1B2C3D4E5F6"
    }
  }
}
```

Common status codes: `200`, `201`, `400` (validation), `404` (PR not found
on a single-entity GET), `405` (POST on the wrong path).

### GET `.../PurchaseRequisitionHeader('{prNumber}')`

Returns the full OData v2 header entity envelope (with `__metadata`,
`PurchaseRequisition`, release-status code, deferred items navigation, and
the demo-only `_mockViewUrl`). 404 with the SAP error envelope if not found.

### GET `.../PurchaseRequisitionHeader('{prNumber}')/to_PurchaseReqnItem`

Returns the item-level fields for the PR (Material, RequestedQuantity, Plant,
NetPriceAmount, DeliveryDate, etc.) wrapped in `{d: {results: [...]}}`. The
smoke carries one item per PR.

### GET `.../PurchaseRequisitionHeader`

List PRs. Supported query params:

- `$top` — page size
- `$skip` — pagination offset
- `$inlinecount=allpages` — adds `d.__count` to the response body
- `$filter` — **simplified.** The smoke implements `eq` on top-level OData
  field names only (`PurReqnReleaseStatus eq '03'`, `CreatedByUser eq 'JDAVIS'`,
  `PurchasingGroup eq 'IT1'`, `CompanyCode eq '1000'`). Anything more
  complex falls through and the caller sees the unfiltered list.

```json
{
  "d": {
    "results": [ /* same shape as the GET single response */ ],
    "__count": "7"
  }
}
```

---

## Release-status code mapping

`PurReqnReleaseStatus` is a release-strategy code that varies per customer.
The mock's mapping (documented because the real codes are tenant-specific):

| Internal status | OData code | Meaning |
|---|---|---|
| `OPEN` | `01` | Not Released — fresh PR pending approval |
| `IN_PROCESS` | `02` | Partially Released — some approvers signed off |
| `RELEASED` | `03` | Fully Released — ready for PO conversion |
| `BLOCKED` | `04` | Blocked / Rejected |
| `CLOSED` | `05` | Closed — converted or canceled |

If the prospect asks "what about our release codes?", be upfront: real
release strategies vary per customer. The mock's mapping is illustrative,
not normative — for the production integration we'd configure Elementum to
read the customer's actual codes from `PurReqnReleaseStatus` and translate
to whatever business-friendly labels they use.

---

## Elementum API task config

Drop this into your Elementum HCL. Base URL is the Vercel deployment; the
OData path picks up from there.

```hcl
# Step 1: fetch a CSRF token. Real SAP requires this before any POST.
resource "elementum_api_task" "fetch_csrf" {
  parent = elementum_automation.pr_intake.refs["triggered"]
  name   = "Fetch SAP CSRF token"

  method = "GET"
  url    = "https://elementum-translator.vercel.app/demos/sap-me5a-smoke/api/sap/opu/odata/sap/API_PURCHASEREQ_PROCESS_SRV/PurchaseRequisitionHeader"

  headers = {
    "x-csrf-token" = "fetch"
    # Real SAP would also need: "Authorization" = "Basic ${base64(user:pass)}"
    # The mock accepts any Authorization (or none).
  }

  # Pull the token out of the response header for the next step.
  response_header_fields = {
    "CSRF Token" = "x-csrf-token"
  }
}

# Step 2: POST the new PR with the token in the request header.
resource "elementum_api_task" "create_pr" {
  parent = elementum_api_task.fetch_csrf
  name   = "Create Purchase Requisition"

  method = "POST"
  url    = "https://elementum-translator.vercel.app/demos/sap-me5a-smoke/api/sap/opu/odata/sap/API_PURCHASEREQ_PROCESS_SRV/PurchaseRequisitionHeader"

  headers = {
    "Content-Type" = "application/json"
    "x-csrf-token" = elementum_api_task.fetch_csrf.refs["CSRF Token"]
  }

  body = jsonencode({
    PurReqnDescription = elementum_automation.pr_intake.refs["Title"]
    CompanyCode        = "1000"
    CreatedByUser      = elementum_automation.pr_intake.refs["Requester ID"]
    to_PurchaseReqnItem = {
      results = [
        {
          Material                     = elementum_automation.pr_intake.refs["Material"]
          PurchaseRequisitionItemText  = elementum_automation.pr_intake.refs["Description"]
          RequestedQuantity            = elementum_automation.pr_intake.refs["Quantity"]
          BaseUnit                     = "EA"
          Plant                        = "US01"
          PurchasingGroup              = "IT1"
          NetPriceAmount               = elementum_automation.pr_intake.refs["Estimated Cost"]
          NetPriceCurrency             = "USD"
        }
      ]
    }
  })

  # Extract fields from the SAP 201 response into refs for later tasks.
  # The OData v2 envelope wraps everything in `d` — JSONPath starts there.
  response_fields = {
    "PR Number" = "$.d.PurchaseRequisition"
    "Status Code" = "$.d.PurReqnReleaseStatus"
    "Browse URL" = "$.d._mockViewUrl"   # demo-only; build from PR Number for prod
  }
}

resource "elementum_message_task" "notify_buyer" {
  parent  = elementum_api_task.create_pr
  name    = "Notify procurement"
  channel = "slack"
  to      = "#procurement-pr-intake"
  body    = <<-EOT
    New PR filed:
    ${elementum_api_task.create_pr.refs["PR Number"]} (rel. code ${elementum_api_task.create_pr.refs["Status Code"]}) —
    ${elementum_api_task.create_pr.refs["Browse URL"]}
  EOT
}
```

Field-name conventions: Elementum fields are Title Case with spaces
(`"PR Number"`, `"Browse URL"`, `"Status Code"`) — snake_case and camelCase
get rejected.

---

## What's fake vs. what's real

| Element | Real SAP? | Mock behavior |
|---|---|---|
| URL path `/sap/opu/odata/sap/API_PURCHASEREQ_PROCESS_SRV/...` | ✅ real | matches byte-for-byte (under the `/demos/sap-me5a-smoke/api` prefix) |
| OData v2 `{d: {...}}` envelope | ✅ real | matches byte-for-byte |
| `__metadata` block (id, uri, type) | ✅ real | matches |
| `__deferred` navigation properties | ✅ real | `to_PurchaseReqnItem` deferred URL works (no `$expand` support) |
| `/Date(<ms>)/` date format | ✅ real | matches |
| `PurReqnReleaseStatus` codes | ✅ real | **mapping is invented** — see release-status table above |
| 201 Created response (full entity) | ✅ real | matches |
| CSRF fetch-then-write roundtrip | ✅ real | mock honors the fetch leg; **does NOT validate** the token on POST (lenient demo shortcut) |
| `Location` header on 201 | ✅ real | matches |
| `_mockViewUrl` top-level field | ❌ **demo only** | swap for an SAP GUI / Fiori deep link in prod |
| OData `$top` / `$skip` / `$inlinecount` | ✅ real | matches |
| OData `$filter` | ✅ real | **simplified** — only `eq` on top-level fields |
| OData `$expand` | ✅ real | **not implemented** — clients fetch items via the deferred URL |
| OData `$orderby`, `$select` | ✅ real | **not implemented** — list returns newest-first by default |
| `$batch` (multi-op transactions) | ✅ real | **not implemented** |
| Error envelope `{error: {code, message, innererror}}` | ✅ real | matches |
| Authorization (Basic / OAuth / mTLS) | ✅ real | **mock accepts anything** (demo shortcut) |
| Authorization objects (`M_BANF_EKG`, `M_BANF_WRK`) | ✅ real | **not enforced** — every PR visible to every user |
| Data persistence | ✅ real (durable, multi-client isolated) | **Vercel KV (durable) when env vars set, globalThis (warm-only) otherwise** |
| Release strategy chained approvers | ✅ real | static — POST lands at `01` Not Released, no chained approval |
| Outbound NACE / IDoc on PR save | ✅ real | **not mocked** — Elementum can poll GET instead |
| PR → PO conversion (ME21N) | ✅ real | **not modeled** — separate transaction / service |
| Custom Z-fields | ✅ real (with extensibility) | not modeled — only standard fields |

If the prospect asks a question that would require any of the "❌" rows or
"simplified" rows to be real, be upfront: "This is demo-mode — in the
production integration we'd configure [thing]." Don't paper over it.

---

## Vercel KV setup (one-time)

This mock needs **Vercel KV** (Upstash Redis under the hood) to persist
state across cold starts and across serverless function instances. Without
KV the mock still runs — it falls back to a per-function-instance in-memory
store — but PRs created via `POST` won't reliably show up on the ALV grid
because Vercel routes the POST and the ME5A render to different function
instances with separate memory.

One-time setup in the Vercel dashboard:

1. Go to https://vercel.com/dashboard → open the `elementum-translator`
   project.
2. Click the **Storage** tab.
3. Click **Create Database** → pick **KV** (or **Upstash for Redis** if the
   "KV" branding is gone — same thing).
4. Name it `elementum-translator-store` (any name works). **If the JSM or
   Jira-Software mock already provisioned one, skip this** — all three
   mocks share the same KV instance and use distinct key prefixes
   (`jsm-queue-smoke:requests:v1`, `jira-software-smoke:issues:v1`,
   `sap-me5a-smoke:prs:v1`) so they don't collide.
5. After it's created, click **Connect Project** and select
   `elementum-translator`. Link it to all three environments (Production,
   Preview, Development).
6. Vercel auto-injects `KV_REST_API_URL` / `KV_REST_API_TOKEN` (and
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) into every build.
7. Redeploy if Vercel didn't auto-redeploy on the connect step.

Verify it worked:
```bash
curl -sS "https://elementum-translator.vercel.app/demos/sap-me5a-smoke/api/sap/opu/odata/sap/API_PURCHASEREQ_PROCESS_SRV/PurchaseRequisitionHeader?\$inlinecount=allpages" | jq '.d.__count'
```
Fire a `POST` (see API contract — remember the CSRF roundtrip), wait ~2
seconds, curl the same GET again — the count should go up by one. Then
open `/me53n/0010001240` (or whatever PR number got minted) and it'll
render with the data you posted.

Local dev without KV: just run `npm run dev` — the store falls back to
`globalThis`. POSTs persist within the same running dev server but reset
between restarts. Good enough for local iteration.

---

## Caveats

- **Cold starts still hit KV.** The store survives cold starts (that's the
  whole point), but the first KV read on a newly-minted function instance
  adds ~50ms of latency. Negligible for demos.
- **Field names are Title Case with spaces** in Elementum. Not snake_case,
  not camelCase. `"PR Number"` yes, `"prNumber"` no, `"pr_number"` no. The
  SAP wire fields are PascalCase (`PurchaseRequisition`, `PurReqnDescription`)
  — that's SAP's convention, not Elementum's; only the Elementum-side ref
  names are Title Case.
- **CSRF roundtrip is two requests.** Even though the mock doesn't validate
  the token, the Elementum automation should still do the fetch leg — it
  works against a real SAP tenant unchanged that way.
- **Always `await` the POST** inside the automation before firing the next
  task. The Jira and Amazon write-API patterns spell this out for the same
  reason.
- **Store resets are manual.** Seeds re-seed only when the KV key is empty.
  If you want a fresh demo, call `resetStore()` (from `_lib/store.ts`) or
  delete the `sap-me5a-smoke:prs:v1` key from the Upstash console.
- **No `$expand`.** Items are served via the deferred navigation URL
  instead. If a prospect asks specifically about `$expand`, point at the
  multi-step CSRF + create + items-fetch flow as evidence of fidelity, then
  redirect: "We didn't build `$expand` into the mock — in the production
  integration the Elementum API task uses a single `$expand=to_PurchaseReqnItem`
  call to inline items."
- **PR numbers increment globally.** POSTing to the mock mints
  `0010001240`, `0010001241`, etc. There's no per-customer-range allocation
  like real SAP's NRIV.
- **Single item per PR.** The smoke models one line item per PR (item
  `00010`). Real PRs can have many items; the API surface accepts a multi-
  item `to_PurchaseReqnItem.results` array on POST but only the first
  element is persisted.
