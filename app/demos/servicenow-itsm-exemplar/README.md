# servicenow-itsm-exemplar — SE Demo Script

**Scenario**: L1 ITSM incident intake, assignment, and status progression, with an externally-callable Table API so Elementum (or any integration) can read and write incidents just like it would against a real ServiceNow instance.

**Who this is for**: Any SE running a demo where the customer has ServiceNow as a system of record for incidents and wants to see Elementum pull incident data, react to it, and push updates back.

## Quick URLs

Swap `<host>` for your Vercel preview or `localhost:3000`.

| Surface | URL |
|---|---|
| Mock landing | `<host>/demos/servicenow-itsm-exemplar` |
| Incidents list | `<host>/demos/servicenow-itsm-exemplar/incidents` |
| Open-only list | `<host>/demos/servicenow-itsm-exemplar/incidents?state=open` |
| Critical list | `<host>/demos/servicenow-itsm-exemplar/incidents?priority=1` |
| Incident form (INC0010001) | `<host>/demos/servicenow-itsm-exemplar/incidents/46b66a40a9fe1981013806a3bd9d1a0e` |
| Table API (list) | `<host>/demos/servicenow-itsm-exemplar/api/now/table/incident` |
| Table API (record) | `<host>/demos/servicenow-itsm-exemplar/api/now/table/incident/46b66a40a9fe1981013806a3bd9d1a0e` |

## What's real vs what's fake

### `[REAL]` — mirrors real ServiceNow
- URL shape: `/api/now/table/{table}` and `/api/now/table/{table}/{sys_id}` match ServiceNow exactly.
- Response envelope: `{ "result": [...] }` for collections, `{ "result": {...} }` for single records.
- Reference fields render as `{ "link": "...", "value": "<sys_id>" }` objects.
- All field values are strings (`"true"`, `"1"`, `"2026-04-22 08:12:47"`).
- `sysparm_query` with `^`-joined equality clauses, `sysparm_limit`, `sysparm_offset`, `sysparm_fields` all work.
- `sys_id` values are 32-char lowercase hex.
- Incident numbers are `INC` + 7 zero-padded digits.
- Status codes: 200 OK, 201 Created on POST, 204 No Content on DELETE, 404 on missing record, 400 on bad body.
- Dates: `YYYY-MM-DD HH:mm:ss` UTC.
- UI: Application Navigator (left rail), list view with breadcrumb filters, form view with two-column sections + related-list tabs + activity stream — all match classic ServiceNow layout.

### `[REAL-WITH-CAVEAT]` — close enough for a demo, but know the gaps
- **Auth**: the mock accepts any `Authorization` header. A real ServiceNow requires Basic or OAuth 2.0 Bearer. If the prospect asks about auth, the honest answer is "yes, ServiceNow supports Basic, OAuth Authorization Code, OAuth Password, OAuth Client Credentials, and JWT Bearer — this mock skips it for demo speed, Elementum's `api_task` would send `Authorization: Bearer <token>` against the real endpoint."
- **Query language**: `sysparm_query` in real ServiceNow supports operators (`LIKE`, `STARTSWITH`, `>=`, etc.) and joins. This mock only supports `field=value` equality joined by `^`. Works for most demo filters; don't live-type a complex query expecting it to render.
- **Pagination**: `X-Total-Count` header is set. `Link` header with rel=next/prev is NOT set (real ServiceNow sets both). If the demo walks through pagination, stick to `X-Total-Count`.
- **Persistence**: writes go to **Vercel KV (Upstash Redis)** when the env vars are configured (durable across cold starts and serverless function instances). Falls back to per-process `globalThis` when KV is not configured (local dev). See `app/demos/jsm-queue-smoke/README.md § Vercel KV setup` for the one-time dashboard click-path — both mocks share the same Upstash database under different keys (`servicenow-itsm-exemplar:incidents:v1` here, `jsm-queue-smoke:requests:v1` for JSM). For a fresh demo, call `resetIncidents()` from `_lib/db.ts` or delete the key from the Upstash console.

### `[NOT-SUPPORTED]` — don't demo these, and here's why
- **Websocket / SSE stream of incidents**: ServiceNow doesn't have one. If a prospect asks for "live incident updates," the real pattern is polling or an outbound Business Rule webhook. This mock does not expose `wss://...` because the real platform doesn't. Demo polling instead.
- **GraphQL over all tables**: ServiceNow's Scripted GraphQL is per-API, not federated. This mock has no GraphQL endpoint. If the customer pushes on this, explain that it's a real limitation of the platform, not of the mock.
- **Upsert on the Table API**: there's no `POST /api/now/table/incident?unique=number`. Create-then-search is the real pattern.

If a prospect asks for something in the `[NOT-SUPPORTED]` list and an SE needs to extend the mock to cover it, that's a signal to **revisit the scenario** — not to extend the mock. The point of this repo is to keep us from implementing things ServiceNow can't actually do.

## Talking points (90-second walkthrough)

1. **Open the list view**: `<host>/demos/servicenow-itsm-exemplar/incidents`. Point at the Application Navigator on the left, the breadcrumb filter row, the priority pills. "This is the classic ServiceNow ITSM surface your L1 agents live in."
2. **Click into INC0010001** (the P1 email server outage). Highlight the two-column form, the activity stream, the related-list tabs. "Everything a ServiceNow agent works out of — and everything an integration would read or write."
3. **Open a second tab and `curl` the Table API** (or run it from Elementum's API task):
   ```bash
   curl '<host>/demos/servicenow-itsm-exemplar/api/now/table/incident?sysparm_query=active=true^priority=1' | jq
   ```
   Show the response. Point out `{ result: [...] }`, the `{ link, value }` reference objects, the all-string field values. "This is the exact shape of the real ServiceNow Table API — an Elementum automation pointed at your actual instance sees the same JSON."
4. **Create an incident via POST** to show the write path:
   ```bash
   curl -X POST '<host>/demos/servicenow-itsm-exemplar/api/now/table/incident' \
     -H 'Content-Type: application/json' \
     -d '{"short_description":"Kiosk offline at warehouse","priority":"2","urgency":"2","impact":"2"}'
   ```
   Reload the list view. New incident appears at top. "Same verb, same URL, same envelope as production."
5. **PATCH the record** to flip state:
   ```bash
   curl -X PATCH '<host>/demos/servicenow-itsm-exemplar/api/now/table/incident/<sys_id>' \
     -H 'Content-Type: application/json' \
     -d '{"state":"6","assigned_to":"6816f79cc0a8016401c5a33be04be441"}'
   ```
   Reload the form. State is now "Resolved." "Elementum can move tickets through their lifecycle without a human in ServiceNow."

## Seed data shape

- 5 incidents across priorities 1–4, mixed states (New / In Progress / On Hold / Resolved).
- 5 users (Alice Example, Bob Sample, Chris Demo, admin, Dana Acme).
- 4 assignment groups (Service Desk, Database, Network, Payroll Support).
- Fake company branding only (Acme Corp). No real customer names, no real domains.

All seed data lives in `data/*.json`. Edit before the demo if the customer wants to see their own ticket volume / priorities reflected — but keep it fake, and do the find-and-replace locally, never in a committed seed file.

## Hygiene reminders

- The `[DEMO]` banner across the top of every screen is non-negotiable — it prevents a screenshot of this mock from ever being mistaken for a real instance.
- If you need to customize this mock for a specific customer (their logo, their incident categories), fork it into a new slug: `servicenow-itsm-acme`. Don't edit this exemplar for one-off demos — it's the template the next SE reaches for.
- Before you change the API shape, check `PLATFORMS/servicenow.md`. If you're tempted to add a field or an endpoint because the demo "needs it," that's the signal to verify the real platform supports it.

## Extending this mock

Common next moves and how hard they are:

- **Add a `change_request` table**: trivial. Copy `api/now/table/incident/` to `api/now/table/change_request/`, seed `data/changes.json`, build a list + form the same way. Numbers start with `CHG`.
- **Add an `/api/now/stats/incident` aggregate endpoint**: moderate. Group-by + count works with the existing seed; the response shape differs from Table API (see `PLATFORMS/servicenow.md § Aggregate API`).
- **Add OAuth token issuance**: if the demo specifically sells Elementum's ability to authenticate, mock `/oauth_token.do` that returns `{ access_token, refresh_token, expires_in: 1800, token_type: "Bearer" }` on `grant_type=password`. Then require the bearer on subsequent calls. Budget ~30 min.
- **Add a Scripted REST API namespace**: for a customer's custom endpoint, scaffold `api/<namespace>/<api_name>/<resource>/route.ts`. Don't hide the namespace — the whole point is that the SE can show the customer "this is your instance's URL pattern."

Last edit: 2026-04-23.
