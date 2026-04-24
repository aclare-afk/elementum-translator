# Amazon Business

Amazon Business is Amazon's B2B marketplace. For the procurement side of SE demos, it is almost never a "system of record" in the SAP/ServiceNow sense — it is a **supplier** that customers reach **through** their procurement system via **punchout**. The demo story is always: user starts a PR in SAP Ariba / Coupa / SAP ECC / Oracle Procurement / Workday, clicks "Shop at Amazon Business," lands on a session-scoped Amazon storefront, fills a cart, submits the cart back to the procurement system, which turns the cart into requisition line items.

This file is therefore split between two surfaces:
1. **The Amazon Business storefront UI** a buyer sees inside a punchout session (this is what `amazon-mock.html` in the prior procurement repo mocks).
2. **The punchout integration protocols** Amazon Business actually supports — cXML (Ariba-originated) and OCI (SAP ECC-originated). These are what the mock's back-end endpoints must mirror if Elementum is going to wire into them.

Amazon Business also has a REST API for programmatic purchasing (B2B API), but that is a separate integration pattern and rarely what SE demos use. It is covered briefly below for completeness.

A "real" punchout session URL looks like `https://www.amazon.com/b2b/punchout?session=<token>&return_url=<encoded>` (Amazon Business serves from `amazon.com`, not a separate domain). The buyer's procurement system opens this URL in a new browser tab.

## CAPABILITIES

### Data model (from the integration point of view)
- **Punchout session** — a short-lived (typically 60-minute) scoped storefront context, keyed by a session ID issued by Amazon in response to a `PunchOutSetupRequest` (cXML) or an OCI-style form-post. Contains the buyer's user identity, return URL, and a session cookie.
- **Cart (cart return payload)** — the data structure sent back when the buyer clicks "Submit to Elementum" / "Transfer cart." Line items with: name, ASIN, quantity, unit price, unit of measure, supplier part ID, supplier part auxiliary ID, classification (UNSPSC), lead time, and (optionally) images.
- **ASIN** — Amazon Standard Identification Number. 10-char alphanumeric, the canonical product key. Every line item in a cart return carries the ASIN.
- **Product** — catalog entry. Has title, brand, price (list + business), ratings, reviews, delivery estimate, quantity tiers.
- **Business Price** — a separate price tier visible only to logged-in Amazon Business accounts; lower than the consumer price, often with quantity discount steps.
- **Account** — an Amazon Business organization account with its own user list, payment methods, approval workflows (Amazon's own; not the customer's procurement system), and Business Prime membership.

### UI surfaces (what the buyer sees inside a punchout)
- Amazon.com-standard search-and-browse experience with a **session banner** indicating the active punchout and a "Submit to <procurement system>" cart action.
- Category nav (left rail in mocks, horizontal in real product), filters (department, price, brand, business features).
- Product grid with product cards.
- Product detail page (PDP).
- Cart sidebar / cart page.
- Submit-cart confirmation.

### Integration protocols
- **cXML punchout** — the dominant protocol. XML-over-HTTPS. Used by SAP Ariba, Coupa, Jaggaer, Workday, Oracle Procurement, Ivalua, Zip, Airbase.
- **OCI (Open Catalog Interface)** — SAP's form-encoded POST protocol. Used by SAP ECC customers not on Ariba.
- **Amazon Business REST API / B2B API** — for programmatic buying without punchout. Separate integration pattern, typically for spot buys or reconciliation.
- **Amazon Business EDI** — ANSI X12 EDI for order confirmation and invoicing downstream of punchout. Not part of the cart return flow itself.

### Auth modes the platform accepts
- **cXML `<Credential>` blocks** for request authentication: `<From>`, `<To>`, `<Sender>` each carry a `<Credential domain="...">` with an `<Identity>` and optional `<SharedSecret>`. Amazon Business issues these during onboarding.
- **HTTPS with signed cXML** — some buyer systems additionally sign or mTLS-pin the connection.
- **Session token / cookie** for the punchout browser session — issued by Amazon when the session starts, embedded in the `StartPage` URL query string.
- **Amazon Business account login** for direct (non-punchout) web access and for the REST API, via OAuth 2.0 with scopes like `api:b2b.purchasing`.

### Admin
- Amazon Business admins configure punchout at `business.amazon.com` → Integrations → Punchout. They set up per-procurement-system credentials (domain + identity + shared secret) and optionally a `FromIdentity` whitelist.

## API SURFACE

Base URLs:
- **Punchout endpoints (cXML)**: `https://www.amazon.com/b2b/ab/cxml/setup` (setup) and `https://www.amazon.com/b2b/ab/cxml/order` (order acknowledgment). Some tenants get region-specific hostnames during onboarding.
- **Punchout storefront (the browser session)**: `https://www.amazon.com/b2b/punchout/...` — the `StartPage` URL returned in the setup response.
- **Cart-return target**: whatever `BrowserFormPost` URL the buyer system provided in the setup request. Amazon does not host this; the customer's procurement system hosts it. Mocks implement this endpoint themselves (e.g., `/api/punchout/cart-return`).
- **REST API (B2B)**: `https://api.business.amazon.com/v1/` — separate from punchout entirely.

### cXML — `PunchOutSetupRequest` (inbound to Amazon)

Sent by the buyer's procurement system as an HTTPS POST with `Content-Type: text/xml; charset=utf-8` (note: `text/xml`, not `application/xml` — some legacy validators are strict).

Body shape (sanitized, minimal example):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.009/cXML.dtd">
<cXML timestamp="2026-04-23T14:30:00-04:00" payloadID="1681234567890.12345@procurement.example.com">
  <Header>
    <From>
      <Credential domain="NetworkID">
        <Identity>AN01000012345</Identity>
      </Credential>
    </From>
    <To>
      <Credential domain="NetworkID">
        <Identity>AN02000009999</Identity>
      </Credential>
    </To>
    <Sender>
      <Credential domain="NetworkID">
        <Identity>AN01000012345</Identity>
        <SharedSecret>REDACTED</SharedSecret>
      </Credential>
      <UserAgent>Elementum Procurement 1.0</UserAgent>
    </Sender>
  </Header>
  <Request>
    <PunchOutSetupRequest operation="create">
      <BuyerCookie>opaque-session-ref-from-buyer</BuyerCookie>
      <Extrinsic name="UserEmail">jdavis@example.com</Extrinsic>
      <Extrinsic name="UniqueName">jdavis</Extrinsic>
      <Extrinsic name="FirstName">Jordan</Extrinsic>
      <Extrinsic name="LastName">Davis</Extrinsic>
      <BrowserFormPost>
        <URL>https://procurement.example.com/punchout/cart-return</URL>
      </BrowserFormPost>
      <SupplierSetup>
        <URL>https://www.amazon.com/b2b/ab/cxml/setup</URL>
      </SupplierSetup>
    </PunchOutSetupRequest>
  </Request>
</cXML>
```

Response from Amazon:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<cXML timestamp="2026-04-23T14:30:01-04:00" payloadID="amzn-punchout-123.abc@amazon.com">
  <Response>
    <Status code="200" text="success"/>
    <PunchOutSetupResponse>
      <StartPage>
        <URL>https://www.amazon.com/b2b/punchout?session=abc123def456&amp;token=opaque</URL>
      </StartPage>
    </PunchOutSetupResponse>
  </Response>
</cXML>
```

Status codes inside the cXML `<Status>` element:
- `200` — success
- `400` — malformed request
- `401` — credential validation failed
- `403` — supplier not authorized for this buyer account
- `500` — upstream error

HTTP-level status is almost always `200 OK` even for cXML-level errors; the true result is inside the `Status` element. This is a classic cXML trap for integrators who only check HTTP status.

### cXML — `PunchOutOrderMessage` (cart return, outbound from Amazon)

When the buyer clicks "Submit to <buyer system>" in the session, Amazon submits a self-posting HTML form to the `BrowserFormPost` URL from the setup request. The form has a single `cxml-urlencoded` field containing the URL-encoded XML body below, plus sometimes a raw `cXML` field.

Body shape:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<cXML timestamp="2026-04-23T14:52:18-04:00" payloadID="amzn-order-456.def@amazon.com">
  <Header>
    <From><Credential domain="NetworkID"><Identity>AN02000009999</Identity></Credential></From>
    <To><Credential domain="NetworkID"><Identity>AN01000012345</Identity></Credential></To>
    <Sender>
      <Credential domain="NetworkID"><Identity>AN02000009999</Identity><SharedSecret>REDACTED</SharedSecret></Credential>
      <UserAgent>Amazon Business cXML</UserAgent>
    </Sender>
  </Header>
  <Message>
    <PunchOutOrderMessage>
      <BuyerCookie>opaque-session-ref-from-buyer</BuyerCookie>
      <PunchOutOrderMessageHeader operationAllowed="edit">
        <Total>
          <Money currency="USD">114.92</Money>
        </Total>
      </PunchOutOrderMessageHeader>
      <ItemIn quantity="4">
        <ItemID>
          <SupplierPartID>B0013CJRZU</SupplierPartID>
          <SupplierPartAuxiliaryID>amz-B0013CJRZU-business</SupplierPartAuxiliaryID>
        </ItemID>
        <ItemDetail>
          <UnitPrice><Money currency="USD">7.64</Money></UnitPrice>
          <Description xml:lang="en">BIC Round Stic Ballpoint Pens, Medium Point, Black, 60-Count</Description>
          <UnitOfMeasure>EA</UnitOfMeasure>
          <Classification domain="UNSPSC">44121701</Classification>
          <ManufacturerName>BIC</ManufacturerName>
          <ManufacturerPartID>GSM609-BK</ManufacturerPartID>
          <LeadTime>1</LeadTime>
          <Extrinsic name="ASIN">B0013CJRZU</Extrinsic>
          <Extrinsic name="BusinessPrice">true</Extrinsic>
        </ItemDetail>
      </ItemIn>
      <!-- More <ItemIn> entries ... -->
    </PunchOutOrderMessage>
  </Message>
</cXML>
```

Rules for the cart-return receiver (what the mock must honor):
1. **Content-Type is `application/x-www-form-urlencoded`** — the XML body is URL-encoded inside a form field named `cxml-urlencoded`. Parse the form, URL-decode the value, then parse as XML.
2. **Accept both `cxml-urlencoded` and `cXML` field names**. Ariba sends `cxml-urlencoded`; some integrations send `cXML`. Support both.
3. **Respond with a 302 redirect** to a return page on the buyer system (e.g., the PR confirmation page). Amazon does not parse the HTTP response body.
4. **`operationAllowed` attribute** on the `PunchOutOrderMessageHeader` indicates whether the buyer system should allow editing (`edit`), be inspect-only (`inspect`), or create-only (`create`). Respect this in the downstream PR.
5. **Supplier Part ID is the ASIN.** Supplier Part Auxiliary ID is Amazon's internal variant key — preserve both; do not collapse them.
6. **`Money` values are decimal strings**, currency is always set on the element (e.g., `<Money currency="USD">7.64</Money>`). Do not drop currency.

### OCI punchout (SAP ECC style)

The alternate protocol. Buyer posts an HTML form to the Amazon punchout URL with these OCI parameters (URL-encoded):
- `HOOK_URL` — the URL Amazon posts the cart back to
- `USERNAME`, `PASSWORD` — (rarely used with Amazon; typically empty)
- `returntarget` — the browser target frame
- `caller` — identifier of the calling system

Amazon responds with a redirect to the storefront session URL. On cart return, Amazon form-posts to `HOOK_URL` with `NEW_ITEM-*` fields, one indexed field per attribute per line:

```
NEW_ITEM-DESCRIPTION[1]=BIC Round Stic Ballpoint Pens...
NEW_ITEM-QUANTITY[1]=4
NEW_ITEM-UNIT[1]=EA
NEW_ITEM-PRICE[1]=7.64
NEW_ITEM-CURRENCY[1]=USD
NEW_ITEM-MATNR[1]=B0013CJRZU
NEW_ITEM-VENDORMAT[1]=B0013CJRZU
NEW_ITEM-LEADTIME[1]=1
NEW_ITEM-MATGROUP[1]=44121701
NEW_ITEM-DESCRIPTION[2]=...
NEW_ITEM-QUANTITY[2]=...
...
```

Rules for OCI receivers:
1. **Content-Type is `application/x-www-form-urlencoded`**.
2. **Fields are indexed from `[1]`, not `[0]`.** An off-by-one bug here is the single most common OCI integration error.
3. **All values are strings.** Quantity and price are not typed in the protocol; the receiver must parse.
4. **Respond with a 302** to a return page on the buyer system. The browser frame is replaced, not a new window.

If the demo scenario is "SAP ECC (without Ariba) punches out to Amazon Business," this is the protocol to mock — NOT cXML. Get this right; conflating the two reflects an architecture the customer doesn't actually have.

### Amazon Business REST API (non-punchout)

For completeness. Base: `https://api.business.amazon.com/v1/`. OAuth 2.0. Covers: product search, order placement, order status, invoice retrieval. Rarely used in Elementum demos because most customers integrate through punchout, not the direct API. If an SE asks for a REST integration, confirm the customer has been onboarded for API access (a separate Amazon Business product tier).

### Rate limits

cXML punchout: no documented rate limits for setup requests — Amazon absorbs normal procurement volume without throttling. High-volume hiccups happen at ~100 setup requests/minute per buyer; Amazon support contact is the mitigation. ([cXML.org reference](https://cxml.org/files/cxml_1_2_022.pdf) does not prescribe limits; vendor-specific.)

REST API (B2B): documented at ~50 requests/second burst with longer-term limits configured per-tenant; return `429 Too Many Requests` with `Retry-After` when tripped.

## VISUAL IDENTITY

The storefront during a punchout session looks (and should look) like the public Amazon.com, with a **session banner** added and the cart action relabeled to "Submit to <procurement system>." Do not redesign the Amazon chrome — the point is that the buyer has the normal Amazon shopping experience.

Primary palette (real Amazon):
- Amazon Orange `#FF9900` — brand accent, primary calls-to-action, logo tail
- Amazon Dark Blue `#131921` — header (top strip)
- Amazon Medium Blue `#232F3E` — nav bar (second strip)
- Price Red `#CC0C39` — strikethrough / promo badges
- Business Teal `#007185` — link color, "Business Choice" / business-feature indicators
- Sale / Added Green `#007600` — delivery timing ("FREE delivery Tomorrow"), cart-added state
- Background `#EAEDED` — page background
- Surface `#FFFFFF` — product card, section background
- Divider `#DDDDDD`
- Muted text `#555555`, primary `#0F1111`

Punchout banner palette (added on top of Amazon chrome during a session):
- Session banner background: linear-gradient(`#1A3A5C` → `#0F2942`) with a 3px orange (`#FF9900`) bottom border — this reads as "this is a sanctioned business session," not a marketing surface
- Session ID displayed in monospace, `#666`

Typography:
- Primary font: **Amazon Ember** (Amazon's shipped typeface). For mocks, load via Google Fonts if available, else fall back to `Inter, Arial, sans-serif` — visually close enough.
- Body: 14px.
- Product title: 13px, `#007185` (teal link color).
- Product price: 18px, 700 weight.
- Delivery line: 11px `#007600`.
- Star rating: 12px `#FF9900`.

Icon set:
- Real Amazon uses internal SVG icons. For mocks, use raw emoji for product images (they scan at a glance) or `lucide-react` for UI icons. Icon weight is loose on Amazon; this works.

Layout primitives (storefront):
- Top header (dark blue): 48px, logo + search bar + cart.
- Search bar: flex-grow center, max 700px wide, orange button on the right.
- Sub-nav (medium blue): 32px, category links.
- Punchout banner (when active): 48px, spans full width, blue-gradient with orange accent border.
- Main content: left sidebar 220px (filters), right content flex.
- Product grid: 3 columns at desktop, 16px gutter.
- Product card: 16px padding, 4px border-radius, 140px image area, price + delivery + "Add to Cart" button.
- Cart panel (slide-out right): 340px wide, dark header, item list, subtotal, primary orange-bordered "Submit to <system>" button at the bottom.
- Cart submit button: Amazon orange `#FFD814` for consumer, but punchout cart return uses the dark blue `#131921` with orange border/text to distinguish the business action from a normal checkout.

## UI PATTERNS

### Punchout session banner
The one addition to the Amazon chrome. A narrow strip under the standard nav that says something like:
> ⚡ **Elementum Punchout Session Active** — Items added to cart will be sent back to Elementum for approval & requisition creation

Plus a session ID in monospace on the right. This is what tells the buyer "you are in a controlled shopping context, not your personal Amazon." Always show it.

### Shopping grid
Standard Amazon product grid with per-card:
- Product image (or emoji placeholder in mocks)
- Title (teal link)
- Star rating + review count
- Consumer price
- Delivery estimate ("FREE delivery Tomorrow")
- **Business price callout** — a light-blue tinted box with teal border: "💼 $7.64 with Business Prime"
- "Add to Cart" button (yellow Amazon-standard)
- Optional badge (top-left): "Best Seller" (red) / "Business Choice" (teal)

### Cart sidebar / cart page
Slides in from the right on Add to Cart, or opens as its own page from the cart icon.
- Each item: thumbnail, truncated name, quantity stepper, line total, "Remove" link
- Subtotal at the bottom
- Two action buttons:
  - Normal "Proceed to Checkout" (yellow) — **hidden or disabled** during a punchout session; the buyer doesn't check out on Amazon, they send the cart back
  - **"⚡ Submit to Elementum →"** (dark blue w/ orange border) — triggers the cart-return flow

### Cart-return transition
After the user clicks Submit to <system>:
1. A loading bar animates across the top (orange gradient).
2. Amazon computes the cart summary.
3. Amazon serves a self-posting HTML form page that POSTs the cart XML/form-data to the buyer's `BrowserFormPost` URL (in the mock: `/api/punchout/cart-return`).
4. The browser navigates to the buyer-system PR page showing the new/updated requisition.

Mocks should render a brief "Cart Submitted to Elementum — Requisition Created" success overlay with the PR ID and the first item's description, then auto-redirect after 2–3 seconds.

### Product detail page (PDP)
Not strictly required for a punchout demo, but realistic to include one PDP behind a product card click. Standard Amazon PDP: image gallery left, title + price + business price + buy box right, bullets below, reviews further down. Often skipped in SE demos — buyers typically Add to Cart directly from the grid.

## AUTH

Authentication modes a real Amazon Business integration uses:

1. **cXML shared secret** — embedded in the `<Sender><Credential><SharedSecret>` element of every cXML request. Issued by Amazon during onboarding. The shared secret is NEVER in a URL or query string; it is only in the request body. Mocks should not embed it anywhere client-side.

2. **cXML Network ID / Credential domain** — buyer and supplier each have a `NetworkID` (Ariba's naming, `AN`-prefixed). Real format is `AN` + 11 digits, e.g., `AN01000012345`. Amazon assigns these.

3. **OAuth 2.0 (REST API only)** — client credentials grant for server-to-server. Scopes control access to search / purchase / invoicing APIs. Token endpoint: `https://api.business.amazon.com/auth/oauth2/token`.

4. **Amazon Business account login** — for buyers accessing the direct web experience (not through punchout). Username + password + 2FA.

5. **Punchout session cookie** — during a live punchout session, Amazon issues a session cookie scoped to the punchout context. Expires at session end. Not something external integrations handle directly; it's buyer-browser-only.

**Default for mocks**: since the realistic integration is cXML punchout, mocks should simulate the shared-secret validation at the cart-return endpoint (even if the mock implementation just logs "validated") and NEVER embed a real shared secret or OAuth credential in the client bundle.

## KNOWN-IMPOSSIBLE

### No direct order placement bypassing the punchout cart
The cart in a punchout session is not an Amazon order. The cart is a data payload returned to the buyer system. Amazon only converts that payload into an actual order when the buyer system later submits a **PurchaseOrderRequest** cXML (or its OCI equivalent). Demoing "the buyer checks out on Amazon and Amazon ships" inside a punchout session is wrong — the checkout is on the buyer's side, Amazon ships only after receiving the separate PurchaseOrderRequest.

### No cart edit / persistent state across sessions
A punchout session is ephemeral. If the buyer closes the tab mid-session without submitting, the cart is gone. Amazon does not persist in-progress punchout carts across sessions. Mocks that show "resume a 3-day-old punchout cart" are fictitious.

### No real-time order status push from Amazon to buyer
Order status updates flow via either (a) scheduled polling of `/v1/orders/{id}` on the REST API, or (b) EDI / cXML OrderStatusUpdate documents on a schedule. Amazon does not push WebSocket or SSE events to buyers. Real-time dashboards of Amazon orders are built by polling every N minutes, not by subscription.

### No GraphQL
Amazon Business has no GraphQL API. Integrations are cXML, OCI, or REST (OAuth + JSON).

### No single-call "transfer this cart directly into my SAP PR"
The cart-return payload goes to a URL the buyer system controls; turning that into a PR (or a Coupa requisition, or a Workday req) is the buyer system's responsibility. Amazon does not call into SAP / Coupa / Workday APIs on the buyer's behalf. If the customer hasn't built the cart-return-to-PR bridge, it doesn't exist by magic.

### No "Amazon approves a purchase on your behalf"
Amazon has its own approval workflows inside Amazon Business (e.g., requires manager approval over $500). These are **separate** from the buyer's procurement system approval workflow. Running both causes double-approval friction. Most enterprise deployments disable Amazon's internal approvals when punchout is configured, because the buyer system owns the approval. Demoing "Amazon approves, then our system approves" is a misconfiguration you should never build toward.

### No sub-account / child account switching mid-session
A punchout session is bound to one Amazon Business user identity. No account-switch within a session.

### No freeform line items
Cart lines are always tied to an ASIN. Buyers cannot add a "custom item / description-only" line to a punchout cart. For one-off non-catalog purchases, customers use a different pattern ("special request" item in their procurement system, not Amazon).

## COMMON SE SCENARIOS

### `[REAL]` Buyer punches out from PR, shops, returns cart, PR is populated
The bread-and-butter punchout demo.
- Mock surfaces: a button in a procurement system PR (e.g., the SAP ECC mock) labeled "Shop at Amazon Business"; the Amazon Business storefront mock with session banner, grid, cart; cart-return endpoint on the procurement side; PR shows new line items with ASINs and prices.
- Back-end: setup endpoint (optional in mocks — just jump to the storefront with a session token in the URL), storefront, `POST /api/punchout/cart-return` on the buyer side.
- Fidelity: the storefront must show the session banner; the cart submit must actually roundtrip data back and not just open a success screen.

### `[REAL]` Buyer lands on Amazon storefront with agent-prefilled cart
Variation where an AI agent pre-populates the cart before the buyer reviews.
- The storefront accepts a `prefill` URL param (JSON-encoded array of `{name, qty, price}` items) and auto-populates the cart panel on load.
- Mock this by parsing `?prefill=<url-encoded-json>` — the prior procurement repo already implements this pattern.
- Caveat: in reality, Amazon does not accept externally pre-filled carts via URL params. Either state this clearly in the demo narrative ("this is how Elementum pre-fills through a planned extension") or implement prefill as a separate "suggested cart" UI that the buyer confirms before Amazon receives it.

### `[REAL-WITH-CAVEAT]` Show business pricing + quantity discounts
Buyers shopping under an Amazon Business account see lower prices and tiered quantity discounts.
- Mock surfaces: product card shows a "💼 $X with Business Prime" callout below the consumer price. Some products also show a quantity-break price ("$10.19 / ream when buying 10+").
- Caveat: real quantity-discount tiers come from Amazon's catalog data; mocks fabricate them. Flag if the customer questions specific tier math — the demo is illustrative, not an actual price quote.

### `[REAL]` Product search within a punchout session
Buyers use the Amazon search bar during a punchout as they would on normal Amazon.
- Mock surface: the search input is visually live but backed by a fixed product set in the mock. Fine for demos; note to the customer that real punchout searches hit Amazon's full 250M+ SKU catalog.

### `[REAL-WITH-CAVEAT]` Restricted categories (policy filtering)
Amazon Business can restrict specific categories (e.g., no alcohol, no firearms, no adult content) for a given business account. A buyer inside a punchout sees only policy-allowed results.
- Mock surface: none of the mock's demo products should be in restricted categories anyway. Don't seed products that would break if the customer actually enabled a stricter filter.

### `[NOT-SUPPORTED]` Real-time order tracking via WebSocket
See KNOWN-IMPOSSIBLE. Use polling.

### `[NOT-SUPPORTED]` Single-call "create PR + fill cart + submit" chain
See KNOWN-IMPOSSIBLE. The flow requires the user browser session to go through Amazon. A pure back-end automation of punchout is not supported by the protocol.

### `[NOT-SUPPORTED]` Add a freeform description-only item during punchout
See KNOWN-IMPOSSIBLE. Describe the workaround (non-catalog requisition item on the buyer side, entered outside the punchout session).

## HYGIENE

Naming conventions for mock data:

- **ASIN**: 10 chars, uppercase alphanumeric starting with `B` for most products, e.g., `B0013CJRZU`, `B00GS1QCF4`. Real ASINs in use are fine for seed (they're public catalog IDs).
- **Amazon Business Network ID**: `AN` + 11 digits, e.g., `AN01000012345` (buyer), `AN02000009999` (Amazon). Use obviously-fake number ranges for mocks.
- **Punchout session ID**: opaque string, 16–32 chars, not meaningful. Example: `punch-abc123def456ghi789`.
- **cXML payloadID**: `<timestamp>.<counter>@<hostname>` format. Example: `1681234567890.12345@procurement.example.com`.
- **Order number** (post-cart, buyer-side): follows the buyer system's convention (PR-XXXXXX in procurement mocks), not an Amazon format.
- **UNSPSC classification code**: 8 digits, e.g., `44121701` (Ball point pens), `43201800` (Computer keyboards). Real UNSPSC codes work.
- **Currency**: always ISO-4217 (USD, EUR, GBP). Always set.
- **Unit of Measure**: always 2-char UOM code — `EA` (each), `PK` (pack), `BX` (box), `CS` (case), `RM` (ream).

Price formatting:
- Display: `$7.64`, two decimals, dollar sign, no currency suffix in UI
- Payload: decimal string `7.64`, currency as attribute/field

Fake companies / people for seed data:
- **Buyer identities**: same conventions as procurement repo — `JDAVIS`, `MCHEN`, `TRODRIGUEZ`.
- **Buyer emails**: `@example.com` per repo convention.
- **Products**: use recognizably Amazon-sold business-category items (BIC pens, Amazon Basics notebooks, Pendaflex folders, HP printer paper, Post-it notes, Scotch tape, Logitech peripherals, Staples binders). These are the categories Amazon Business sells into the most and what customers expect to see in a demo.
- **Supplier brand names**: real brand names are fine (BIC, Post-it, Logitech, HP) — they're public market identifiers. **Do not fabricate prices that undercut current Amazon pricing in a way that could be read as a quote**; keep them illustrative.

Compliance red flags to avoid in seed data:
- Do not seed restricted-category items (alcohol, firearms, adult, prescription medical). Even as a joke. Demos have been killed over a "funny" test item showing up in a customer's screen recording.
- Do not embed real Amazon API credentials, shared secrets, or OAuth tokens anywhere in the mock — not in client bundles, not in JSON files, not in the README. Use placeholders like `REDACTED` or `<shared-secret>`.
- Real buyer emails or phone numbers — `@example.com` only.

Punchout session hygiene:
- Mock session tokens should be obviously opaque (`punch-<random>`) and never real.
- Redirect URLs in mocks should be relative to the mock's own domain, never to real amazon.com. The mock IS the Amazon Business simulation.
- If the mock stores the prefill-items JSON in a URL param, URL-encode it fully and budget for long URLs — don't rely on this for real integrations, which would POST a proper setup document.

## SOURCES

- [cXML 1.2.053 Reference Guide (cxml.org)](https://cxml.org/files/cxml_1_2_053.pdf) — authoritative cXML protocol spec, including `PunchOutSetupRequest`, `PunchOutOrderMessage`
- [Amazon Business Punchout Guide — public integration overview](https://www.amazon.com/b2b/info/punchout)
- [Amazon Business Developer Portal (REST API)](https://developer-docs.amazon.com/amazon-business/)
- [SAP OCI (Open Catalog Interface) 5.0](https://help.sap.com/docs/SAP_SRM/2e800cd9a12f441f991c738d1a1ca969/4f0f4e6d82f75be5e10000000a445394.html)
- [Amazon Brand Guidelines — amazon.com public brand page](https://brand.amazon.com/)
- [Amazon Business product page](https://business.amazon.com/) — for storefront visual reference

Last verified: 2026-04-23. If any cXML envelope shapes drift against a real production Amazon Business integration, update this file before updating any mock.
