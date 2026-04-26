# Amazon Business punchout smoke

Two-surface punchout demo — the Amazon Business storefront at
`/demos/amazon-punchout-smoke` and the buyer-system "Procurement Portal" at
`/demos/amazon-punchout-smoke/buyer-system`. Both share a KV-backed store, so
requisitions returned via the cart-return POST appear in the portal without a
refresh round-trip.

This mirrors the JSM smoke pattern: external user-facing surface (Amazon
storefront / JSM customer portal) plus an internal-facing surface (Procurement
Portal / JSM agent queue), with one durable store underneath.

---

## Demo URLs

| Surface | URL |
|---|---|
| Amazon storefront | `/demos/amazon-punchout-smoke` |
| Procurement Portal — list | `/demos/amazon-punchout-smoke/buyer-system` |
| Procurement Portal — PR detail | `/demos/amazon-punchout-smoke/buyer-system/requisitions/{id}` |
| **API** — cart return (POST) | `POST /demos/amazon-punchout-smoke/api/punchout/cart-return` |
| **API** — list requisitions | `GET /demos/amazon-punchout-smoke/api/punchout/requisitions` |
| **API** — get one requisition | `GET /demos/amazon-punchout-smoke/api/punchout/requisitions/{id}` |

API paths intentionally prefix with `/demos/amazon-punchout-smoke/` so multiple
platform mocks can coexist on the same Vercel deployment. Real Amazon Business
cart-return lives at the buyer system's own BrowserFormPost URL on its tenant
root; when you point the Elementum `api_task` at this mock, use the full
`/demos/amazon-punchout-smoke/api` prefix.

---

## SE talking points (30-second walkthrough)

1. **Open the storefront** — `/demos/amazon-punchout-smoke`. Show the punchout
   banner ("Punchout from Elementum · Session ab-…"), the Business Choice
   chips on products, the Amazon chrome you can't tell apart from the real
   thing.

2. **Add a couple items** to the cart, click **Submit to Elementum**. Watch
   the success overlay show a real requisition id, then auto-redirect into
   the Procurement Portal's PR detail page.

3. **Land on the Procurement Portal** — generic dark-blue chrome (could be
   SAP, Coupa, Workday, Ariba — that's the point). Walk through the line
   items, status pill ("Pending Approval"), submitter block, history rail.

4. **Click "Requisitions" in the top nav** — the list view shows your
   freshly-returned PR alongside three seeded historical PRs (different
   submitters, departments, statuses). Demonstrates that the buyer system is
   the system of record for procurement.

5. **Show the API surface** — flip to a terminal:
   ```bash
   curl -sS https://elementum-translator.vercel.app/demos/amazon-punchout-smoke/api/punchout/requisitions | jq '.size'
   ```
   Then fire a POST to the cart-return endpoint with a synthetic cart, GET
   the same list again, watch `size` go up by one.

6. **Narrate**: "Elementum's API task can call this exactly as if it were
   hitting your real procurement system — same URL shape, same body, same
   response envelope. When you point this at production SAP or Coupa,
   nothing changes except the base URL and auth."

---

## API contract

### POST `/demos/amazon-punchout-smoke/api/punchout/cart-return`

Persist a returned cart and create a requisition.

> **Real cXML note**: Amazon Business actually serves a self-posting HTML form
> that POSTs `cxml-urlencoded` (a URL-encoded `PunchOutOrderMessage` XML
> document) to the buyer system's BrowserFormPost URL. The mock accepts JSON
> instead — same round-trip, simpler payload. Document this trade-off when
> the prospect asks about cXML fidelity. See `PLATFORMS/amazon-business.md` §
> API SURFACE > cXML PunchOutOrderMessage.

**Request body**
```json
{
  "sessionId": "ab-punchout-sess-7f3a2c1e9d4b5",
  "buyerSystem": "Elementum",
  "items": [
    {
      "asin": "B0FAKE0007",
      "title": "Logitech MX Master 3S Wireless Mouse, Graphite",
      "quantity": 4,
      "unitPrice": 89.99,
      "currency": "USD"
    }
  ],
  "submitter": {
    "name": "Priya Khanna",
    "email": "priya.khanna@acme.example",
    "department": "IT Operations"
  }
}
```

- `sessionId` — **required**. Real punchout sessions have a `BuyerCookie` on
  the PunchOutSetupRequest; use any string for the mock.
- `buyerSystem` — optional. Defaults to `"Elementum"`. Shows up on the PR
  detail page header and in the GET responses.
- `items` — **required**, non-empty. Each item needs `asin`, `title`,
  `quantity`, `unitPrice`, `currency`.
- `submitter` — optional. Defaults to a stable demo persona
  (`Sam Reeves / Procurement`). Use this when you want the automation to
  attribute the PR to the actual triggering user.

**Response (200 OK)**
```json
{
  "requisitionId": "0010743219",
  "total": 359.96,
  "currency": "USD",
  "itemCount": 4,
  "receivedAt": "2026-04-26T19:14:08.512Z",
  "redirectTo": "/demos/amazon-punchout-smoke?submitted=0010743219",
  "buyerSystemUrl": "/demos/amazon-punchout-smoke/buyer-system/requisitions/0010743219",
  "_mockViewUrl": "https://your-deployment.vercel.app/demos/amazon-punchout-smoke/buyer-system/requisitions/0010743219"
}
```

- **`requisitionId`** — 10-digit `0010xxxxxx`, mirroring SAP-style PR ids.
- **`buyerSystemUrl`** — relative URL into the procurement portal's PR detail.
  Use this in same-origin contexts.
- **`_mockViewUrl`** — **non-standard, demo-only**. Absolute URL for chat-
  replyable deep linking. Real Amazon never returns this; swap to the
  buyer-system URL pattern in prod.

### GET `/demos/amazon-punchout-smoke/api/punchout/requisitions`

Lists requisitions. Query params:
- `status` — filter by `Pending Approval` / `Approved` / `Ordered` / `Received` / `Draft`
- `submitter` — case-insensitive substring match on submitter email
- `start` / `limit` — offset pagination, defaults `0` / `50`

**Response envelope**
```json
{
  "size": 3, "start": 0, "limit": 50, "isLastPage": true,
  "values": [ /* StoredRequisition + _mockViewUrl */ ]
}
```

### GET `/demos/amazon-punchout-smoke/api/punchout/requisitions/{id}`

Returns a single requisition by 10-digit id. 404 with
`{ error: { code, message } }` if not found.

---

## Elementum API task config

```hcl
resource "elementum_api_task" "create_amazon_pr" {
  parent = elementum_automation.procurement_intake.refs["triggered"]
  name   = "Submit cart to Procurement Portal"

  method = "POST"
  url    = "https://elementum-translator.vercel.app/demos/amazon-punchout-smoke/api/punchout/cart-return"

  headers = {
    "Content-Type" = "application/json"
    # Real Amazon cXML cart-return doesn't auth at the cart-return URL — it's
    # the buyer system's own ingress point. Mock accepts any header.
  }

  body = jsonencode({
    sessionId   = elementum_automation.procurement_intake.refs["Session Id"]
    buyerSystem = "Elementum"
    items       = elementum_automation.procurement_intake.refs["Cart Items"]
    submitter = {
      name       = elementum_automation.procurement_intake.refs["Requester Name"]
      email      = elementum_automation.procurement_intake.refs["Requester Email"]
      department = elementum_automation.procurement_intake.refs["Department"]
    }
  })

  response_fields = {
    "Requisition Id" = "$.requisitionId"
    "PR Total"       = "$.total"
    "PR URL"         = "$._mockViewUrl"   # demo-only; swap to "$.buyerSystemUrl" for prod
    "Status URL"     = "$.buyerSystemUrl"
  }
}

resource "elementum_message_task" "notify_requester" {
  parent  = elementum_api_task.create_amazon_pr
  name    = "Notify requester"
  channel = "email"
  to      = elementum_automation.procurement_intake.refs["Requester Email"]
  subject = "Your purchase requisition is in: ${elementum_api_task.create_amazon_pr.refs["Requisition Id"]}"
  body    = <<-EOT
    Your cart was returned to the procurement portal and is pending approval:
    ${elementum_api_task.create_amazon_pr.refs["PR URL"]}
  EOT
}
```

Field-name conventions: Elementum fields are Title Case with spaces
(`"Requisition Id"`, `"PR URL"`) — snake_case and camelCase get rejected.

---

## What's fake vs. what's real

| Element | Real Amazon Business? | Mock behavior |
|---|---|---|
| Storefront chrome (header, search, product grid) | ✅ real | matches the public Amazon.com punchout view |
| Punchout session banner | ✅ real | matches real cXML session indicator |
| Cart-return POST body shape | ⚠️ simplified | mock accepts JSON; real uses `cxml-urlencoded` PunchOutOrderMessage XML |
| Cart-return response envelope | ⚠️ mock-specific | real cXML returns a redirect to the buyer system; mock returns JSON with `requisitionId` + `buyerSystemUrl` |
| `_mockViewUrl` top-level field | ❌ **demo only** | swap to `buyerSystemUrl` in prod |
| 10-digit PR id `0010xxxxxx` | ✅ real (SAP convention) | matches |
| Procurement Portal chrome | ⚠️ generic | not branded as any specific buyer system; could pass for SAP / Coupa / Ariba / Workday |
| Procurement Portal data persistence | ✅ real (durable) | **Vercel KV (Upstash Redis) when env vars set, globalThis (warm-only) otherwise** |
| Approval workflow actually firing | ✅ real | Approve button is disabled in the mock; would fire downstream tasks in prod |
| Webhook outbound on PR create | ✅ real | **not mocked** — Elementum can poll GET instead |
| Authorization on cart-return | ⚠️ relaxed | mock accepts anything |

If a prospect asks anything that requires the "❌" or "⚠️" rows to be real,
be upfront: "This is demo-mode — in the production integration we'd configure
[thing]." Don't paper over it.

---

## Vercel KV setup (one-time)

This mock needs **Vercel KV** (Upstash Redis under the hood) to persist
requisitions across cold starts and across serverless function instances.
Without KV the mock still runs — it falls back to a per-function-instance
in-memory store — but PRs created via the cart-return POST won't reliably
show up in the Procurement Portal because Vercel routes those reads to a
different function instance with separate memory.

One-time setup in the Vercel dashboard:

1. Open the `elementum-translator` project → **Storage** tab.
2. **Create Database** → **KV** (or **Upstash for Redis**).
3. Connect it to the project, all three environments (Production, Preview,
   Development).
4. Vercel injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` (also accepted:
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).
5. Redeploy from the latest main build.

Verify:
```bash
# Should return at least 3 (the seeded PRs)
curl -sS https://elementum-translator.vercel.app/demos/amazon-punchout-smoke/api/punchout/requisitions | jq '.size'

# Fire a cart return; capture the new id
NEW_ID=$(curl -sS -X POST \
  https://elementum-translator.vercel.app/demos/amazon-punchout-smoke/api/punchout/cart-return \
  -H 'Content-Type: application/json' \
  -d '{
    "sessionId": "kvtest-'$(date +%s)'",
    "items": [{"asin":"B0FAKE0007","title":"MX Master 3S","quantity":2,"unitPrice":89.99,"currency":"USD"}]
  }' | jq -r '.requisitionId')
echo "Created: $NEW_ID"

# Confirm via GET — proves cross-instance KV is bridging
curl -sS "https://elementum-translator.vercel.app/demos/amazon-punchout-smoke/api/punchout/requisitions/$NEW_ID" | jq
```

Then open the buyer-system URL for the new id — it'll render the PR detail
page with line items and status pill.

Local dev without KV: just run `npm run dev`. The store falls back to
`globalThis` and POSTs persist within the same dev-server process. Resets on
restart, which is fine for local iteration.

---

## Caveats

- **Cold starts still hit KV.** First read on a newly-minted function
  instance adds ~50ms. Negligible for demos.
- **Field names are Title Case with spaces** in Elementum
  (`"Requisition Id"`, `"PR URL"`) — not `requisitionId` or `requisition_id`.
- **Always `await`** the cart-return POST inside an Elementum automation
  before firing the next task. Fire-and-forget will silently drop writes.
- **Approval is cosmetic.** The Approve button on the PR detail is disabled.
  In prod we'd wire it to fire downstream tasks; in the demo we narrate that
  step instead of building it.
- **Store resets are manual.** Seeds re-seed only when the KV key is empty.
  Call `resetStore()` from `_lib/store.ts`, or delete the
  `amazon-punchout-smoke:requisitions:v1` key in the Upstash console.
