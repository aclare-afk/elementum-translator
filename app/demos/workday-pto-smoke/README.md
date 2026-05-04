# workday-pto-smoke — SE Demo Script

**Scenario**: Employee asks an Elementum agent for time off, agent calls the Workday Absence Management REST API, the request appears in the worker's Time Off worklet history (and would land in their manager's Workday Inbox in real life). The cleanest possible Workday demo — three steps, tight scope, lands universally because every Workday customer uses PTO.

**Who this is for**: Any SE running a demo where the prospect has Workday as their HR system of record and wants to see Elementum read worker context, submit absence requests on the user's behalf, and link back to the canonical Workday view.

## Submitter identity

When an Elementum agent submits an absence request, it passes the calling user's email through `submitterEmail`, which the automation either templates into the path (`/.../workers/<email>/absenceRequests`) or drops into the body. The mock's worker resolver accepts WID, Employee_ID, OR email — so the agent doesn't have to do a separate worker lookup before submitting. The mock stores the resolved worker on the request, surfaces it in the Time Off history list, and threads it through to the chrome's logged-in-worker badge via the dynamic-chrome pattern.

The route handler's `cleanString` helper strips chip-name literals (`"submitterEmail"`, `"absenceType"`, etc.) so a chip that didn't resolve doesn't get stored as a fake field value.

## Quick URLs

Swap `<host>` for your Vercel preview or `localhost:3000`.

| Surface | URL |
|---|---|
| Mock home (worklet grid) | `<host>/demos/workday-pto-smoke` |
| Time Off worklet | `<host>/demos/workday-pto-smoke/time-off` |
| Absence request detail (seed) | `<host>/demos/workday-pto-smoke/time-off/ABS-2026-001045` |
| REST: list requests for a worker | `<host>/demos/workday-pto-smoke/api/absenceManagement/v1/workers/alex.reeves@acme.example/absenceRequests` |
| REST: submit a new request | (POST) `<host>/demos/workday-pto-smoke/api/absenceManagement/v1/workers/<wid-or-email>/absenceRequests` |
| REST: time-off balances | `<host>/demos/workday-pto-smoke/api/absenceManagement/v1/workers/alex.reeves@acme.example/timeOffBalances` |
| REST: workers directory | `<host>/demos/workday-pto-smoke/api/common/v1/workers` |
| REST: single worker | `<host>/demos/workday-pto-smoke/api/common/v1/workers/alex.reeves@acme.example` |

## What's real vs what's fake

### `[REAL]` — mirrors real Workday
- URL shape: `/absenceManagement/v1/workers/{ID}/absenceRequests`, `/absenceManagement/v1/workers/{ID}/timeOffBalances`, `/common/v1/workers`, `/common/v1/workers/{ID}` all match the Workday API Gateway resource hierarchy.
- Response envelope: `{ "data": [...], "total": N }` for list endpoints; single-resource GET returns the object directly.
- Resource shape: every entity has both an internal `id` (WID, 32-char hex) and a `descriptor` (human-readable label) — Workday's universal convention.
- Date handling: `from` / `to` are date-only `YYYY-MM-DD`. `submittedAt` / `lastModifiedAt` are full ISO 8601 with timezone.
- Status codes: 200 OK, 201 Created on POST, 404 on missing worker, 400 on bad body.
- Hygiene: WIDs are 32-char lowercase hex. Display IDs are `ABS-YYYY-NNNNNN`. Tenant slug `acme_dpt1` follows the lowercase-alphanumeric convention.
- Chrome: top bar with the orange Workday wordmark on a dark navy background, app launcher / inbox / notifications / avatar on the right, worklet card grid on the home page, balance row + history list on the Time Off worklet — all read as Workday at a glance.

### `[REAL-WITH-CAVEAT]` — close enough for a demo, but know the gaps
- **Auth**: the mock accepts any `Authorization` header. A real tenant requires OAuth 2.0. If the prospect asks: "yes, Workday uses refresh-token OAuth — `POST https://<pod>/ccx/oauth2/<tenant>/token` with `grant_type=refresh_token`. Elementum's `api_task` would send `Authorization: Bearer <access_token>`. The mock skips it for demo speed."
- **Worker resolution**: the path's `{workerId}` segment can be a WID (real Workday's only accepted form), an Employee_ID, or an email (the dynamic-submitter shape). Real Workday only accepts WIDs at this position. The mock relaxes this so demos don't need a separate worker-lookup hop. If demoing the integration architecture, frame it as "in production we'd resolve the email to a WID first via `GET /common/v1/workers?email=...`."
- **Filters**: the list endpoint supports `worker`, `state`, `from`, `to` query params. Real Workday supports a richer filter grammar (`effective`, `category`, `manager`-scoped views) — fine for the seed but don't live-type a complex filter expecting it to render.
- **State machine**: a real submission lands in `IN_PROGRESS` until the user explicitly Submits, then moves through Approver routing on the Business Process. The mock defaults POSTs to `SUBMITTED` to keep the demo's "I just submitted PTO" mental model intact. Override via `state` in the body if you want to demo the unsubmitted-draft case.
- **Persistence**: writes go to **Vercel KV (Upstash Redis)** when the env vars are configured. Falls back to per-process `globalThis` when KV is not configured (local dev). Same setup as the other mocks — see `app/demos/jsm-queue-smoke/README.md § Vercel KV setup`. The KV key is `workday-pto-smoke:absenceRequests:v1`.

### `[NOT-SUPPORTED]` — don't demo these, and here's why
- **Hire / Termination / Job Change via REST**: Workday's REST API does NOT cover these — they're SOAP-only today. If a prospect asks for "we want Elementum to onboard new hires from a request form," the honest answer is "yes, but the Workday side is SOAP, which is a heavier integration than this demo shows." Don't extend the mock to fake REST for these.
- **Real-time worker change webhooks**: Workday has no generic webhook subscription. Outbound REST is configured per Business Process step at design time. If a prospect wants "notify Elementum when any worker's email changes," the real path is either a polling integration or a per-BP outbound step — not a webhook subscription.
- **Studio integration replacement** (the strategic Translator pitch): this is `[REAL-WITH-CAVEAT]` rather than `[NOT-SUPPORTED]`, but the mock doesn't cover it. Studio integrations are customer-built, idiosyncratic, and have to be discovered case-by-case. If the prospect's pain is "we have 14 Studio integrations we don't want to maintain," that's a separate scoped conversation — schedule the deep dive, don't try to handle it in the smoke.

If a prospect asks for something in the `[NOT-SUPPORTED]` list, that's a signal to **revisit the scenario**, not extend the mock. The point of this repo is to keep us from implementing things Workday can't actually do.

## Talking points (90-second walkthrough)

1. **Open the home page**: `<host>/demos/workday-pto-smoke`. Point at the orange Workday wordmark, the worklet card grid, the inbox badge in the top-right. "This is the canonical Workday tenant home — workers see the same shape on day one."
2. **Click into Time Off**. Show the four balance cards (Vacation / Sick / Personal / Bereavement) and the My Requests history list. "Everything a worker tracks PTO out of — and everything an integration would write to."
3. **Open a second tab and `curl` the Absence Management REST API**:
   ```bash
   curl '<host>/demos/workday-pto-smoke/api/absenceManagement/v1/workers/alex.reeves@acme.example/absenceRequests' | jq
   ```
   Show the `data` array, the `descriptor` fields, the `_mockViewUrl` per record. "Same envelope as the real API Gateway — `{ data, total }`, every entity has `{ id, descriptor }` — an Elementum automation pointed at the prospect's actual tenant gets the same JSON."
4. **Submit a new request via POST**:
   ```bash
   curl -X POST '<host>/demos/workday-pto-smoke/api/absenceManagement/v1/workers/alex.reeves@acme.example/absenceRequests' \
     -H 'Content-Type: application/json' \
     -d '{
       "absenceType": "VACATION",
       "from": "2026-07-12",
       "to": "2026-07-14",
       "hoursPerDay": 8,
       "comment": "Long weekend"
     }'
   ```
   Reload the Time Off worklet — the new request appears at the top of "My Requests" with the `SUBMITTED` chip. "Three lines of REST and PTO is in Workday."
5. **Show the chrome update**: refresh the page. The top-bar avatar switched to the worker who just submitted. "The chrome reflects whoever the agent acted on behalf of — same dynamic-submitter pattern as our other platform mocks."

## Elementum api_task config

When wiring this mock into an Elementum automation, the api_task config looks like:

| Field | Value |
|---|---|
| URL | `https://<vercel-host>/demos/workday-pto-smoke/api/absenceManagement/v1/workers/{{ submitterEmail }}/absenceRequests` |
| Method | POST |
| Headers | `Content-Type: application/json` (no auth needed for the mock) |
| Body | JSON with `absenceType`, `from`, `to`, `hoursPerDay`, `comment` |
| Response: `_mockViewUrl` | Surface as the agent's "Here's your request" link |
| Response: `descriptor` | Surface as the human-readable Request ID |

The `submitterEmail` chip is templated into the URL path so the mock can resolve the worker without a separate lookup. See `skills/elementum-automations/SKILL.md § Dynamic submitter` for the broader pattern.

## Seed data shape

- 5 workers (Alex Reeves the default viewer, Patricia Nguyen, Marcus Chen, Henry Schultz, Lily Okafor) — same fictional universe as the Salesforce/Jira mocks.
- 5 absence requests across all five lifecycle states (`IN_PROGRESS`, `SUBMITTED`, `APPROVED`, `DENIED`, plus historical reference).
- 4 absence types: Vacation, Sick, Personal, Bereavement.
- Per-worker balances tuned by tenure (longer tenure → higher vacation balance).

All seed data lives in `data/*.ts`. Dates are computed relative-to-now at module load — the demo always looks current regardless of when it's run. Edit before the demo if the prospect wants to see their own absence types reflected — but keep the personas fake.

## Hygiene reminders

- The `[DEMO]` banner across the top of every screen is non-negotiable — it prevents a screenshot of this mock from ever being mistaken for a real Workday tenant.
- Don't seed real photos of real people. If you customize the worker list for a prospect, use placeholder avatars (initials on brand-orange).
- Tenant slug stays as `acme_dpt1` unless you fork the mock for a specific prospect — and if you do, fork into a new slug (`workday-pto-acme`) rather than editing this exemplar.
- Before you add a new endpoint or field, check `PLATFORMS/workday.md`. If you're tempted to add SOAP-only data (Hire, Job Change) to the REST mock because the demo "needs it," that's the signal to verify the real platform supports it.

## Extending this mock

Common next moves and how hard they are:

- **Add an Expense Report endpoint**: moderate. Copy the absence request shape, swap `from`/`to` for line items + currency, add an Expenses worklet page on the home grid. The Workday REST resource is `/expenses/v1/workers/{ID}/expenseReports` — the URL shape carries.
- **Add a Worker Profile page**: moderate. Real Workday's worker profile is the Job/Comp/Time Off/Pay/Personal/Career/Performance/Documents tab strip. Even a 2-tab subset (Job + Time Off) reads as Workday.
- **Add OAuth refresh-token issuance**: if the prospect specifically sells on Elementum's auth handling, mock `POST /ccx/oauth2/<tenant>/token` returning `{ access_token, expires_in: 3600, token_type: "Bearer" }`. Then require the bearer on subsequent calls. Budget ~30 min.
- **Add Custom Object support**: lower-priority for SE demos but a real differentiator. Mock `/customObjects/v1/<tenantPrefix>_<objectName>` for a customer-defined entity. Talk to a Workday-experienced PM before scoping this — the security-group implications are nuanced.

## Why no SOAP

Workday's SOAP API covers everything the platform can do, but: (a) it's XML, which is awkward for Elementum's JSON-first `api_task`, and (b) it requires a tenant-issued WSDL per service. For demo purposes, REST covers the most-asked scenarios cleanly. If a prospect specifically needs to demo Hire / Termination / Comp Change, scope a SOAP-aware follow-up — don't try to fake REST coverage for those.
