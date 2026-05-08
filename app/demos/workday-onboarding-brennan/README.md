# workday-onboarding-brennan — SE Demo Script

**Scenario**: Brennan Health System — partner-led HLS account, regional hospital network, ~50K employees, Cognizant-led modernization. The Elementum agent reads a new hire's worker context from Workday, decides the role-based access bundle (badge group, EMR role, on-call rotation, M365 license), and fires that bundle into the customer's existing ServiceNow access-request flow — turning a multi-day, multi-ticket scramble into a one-sentence ask. This mock is the **Workday side** of that demo: a worker directory + worker profile that the Elementum onboarding skill can `GET` against, with a Brennan-flavored tenant chrome so the audience reads it as Workday at a glance.

**Why not also mock the Hire BP itself?** Workday Hire is SOAP-only (see `PLATFORMS/workday.md` § KNOWN-IMPOSSIBLE and the `[NOT-SUPPORTED]` section below). Pretending we created the worker would be the kind of fidelity break this repo exists to prevent. Honest framing: HR puts Sarah in Workday overnight via a real Hire BP; Elementum picks up where that leaves off — Day-1 access provisioning across the rest of the stack.

**Who this is for**: The Brennan pitch on Tuesday, but transferable to any health-system or regional-enterprise prospect where Workday is system-of-record, ServiceNow is the access-request rails, and the pain is downstream provisioning latency.

## The new hire

The default viewer is **Sarah Chen** — RN, Med-Surg 4-East, day shift, hire date next Monday. She's the worker the agent will look up during the demo. Two alternative personas are seeded so you can pick the role flavor that matches the room:

| Persona | Role | Why pick her/him |
|---|---|---|
| **Sarah Chen** | RN, Med-Surg 4-East | Default. Universal hospital persona. Access bundle is meaty (badge, EMR-RN-MedSurg, on-call, M365 Clinical) so the "multi-ticket today" story lands. |
| **Marcus Patel, MD** | Hospitalist, ICU | Pick if the room leans toward physicians/clinicians. Bundle differs (Hospitalist EMR role, ICU on-call pool) — proves the rule engine isn't hardcoded. |
| **Linda Okafor** | Patient Access Coordinator | Pick if the room cares about back-office/admissions. Bundle has zero clinical — just admin badge, ServiceNow Patient Access group, M365 Standard. Different shape, same chassis. |

## Submitter identity (dynamic chrome)

When the Elementum agent calls this mock with a worker email, the chrome's logged-in-worker badge updates to that worker on the next render. So when you act as Sarah during the demo, the top-bar avatar reflects Sarah, not the seed default. Same dynamic-submitter pattern as the other platform mocks in this repo. The route handler's `cleanString` helper strips chip-name literals so a chip that didn't resolve doesn't get stored as a fake field value.

## Quick URLs

Swap `<host>` for your Vercel preview or `localhost:3000`.

| Surface | URL |
|---|---|
| Mock home (worklet grid) | `<host>/demos/workday-onboarding-brennan` |
| Worker directory listing | `<host>/demos/workday-onboarding-brennan/api/common/v1/workers` |
| **Sarah Chen — single worker (the primary lookup)** | `<host>/demos/workday-onboarding-brennan/api/common/v1/workers/sarah.chen@brennan.example` |
| Marcus Patel — alternative persona | `<host>/demos/workday-onboarding-brennan/api/common/v1/workers/marcus.patel@brennan.example` |
| Linda Okafor — alternative persona | `<host>/demos/workday-onboarding-brennan/api/common/v1/workers/linda.okafor@brennan.example` |
| Time Off worklet (chrome decoration) | `<host>/demos/workday-onboarding-brennan/time-off` |
| REST: list absence requests for a worker | `<host>/demos/workday-onboarding-brennan/api/absenceManagement/v1/workers/<email>/absenceRequests` |
| REST: time-off balances | `<host>/demos/workday-onboarding-brennan/api/absenceManagement/v1/workers/<email>/timeOffBalances` |

The Time Off / absence endpoints are inherited from the parent `workday-pto-smoke` exemplar and aren't part of the onboarding demo — they're chrome decoration so worker profiles look populated. Don't surface them unless the audience asks.

## What's real vs what's fake

### `[REAL]` — mirrors real Workday
- URL shape: `/common/v1/workers`, `/common/v1/workers/{ID}` match the Workday API Gateway resource hierarchy. The onboarding skill targets these.
- Response envelope: `{ "data": [...], "total": N }` for list endpoints; single-resource GET returns the object directly — Workday's universal convention.
- Resource shape: every entity has both an internal `id` (WID, 32-char hex) and a `descriptor` (human-readable label).
- Worker fields returned: `wid`, `employeeId`, `displayName`, `email`, `positionTitle`, `managerWid`, `costCenter`, `supervisoryOrg`, `hireDate` — the canonical fields the onboarding rule engine cares about.
- Hygiene: WIDs are 32-char lowercase hex. Tenant slug `brennan_dpt1` follows the lowercase-alphanumeric convention.
- Chrome: orange Workday wordmark on dark navy, app launcher / inbox / avatar on the right, worklet card grid on home — reads as Workday at a glance.

### `[REAL-WITH-CAVEAT]` — close enough for a demo, but know the gaps
- **Auth**: the mock accepts any `Authorization` header. A real tenant requires OAuth 2.0. If asked: *"yes, Workday uses refresh-token OAuth — `POST https://<pod>/ccx/oauth2/<tenant>/token` with `grant_type=refresh_token`. Elementum's `api_task` would send `Authorization: Bearer <access_token>`. The mock skips it for demo speed."*
- **Worker resolution**: the path's `{workerId}` segment can be a WID (real Workday's only accepted form), an Employee_ID, or an email. Real Workday only accepts WIDs at this position. The mock relaxes this so demos don't need a separate worker-lookup hop. If asked architecturally: *"in production we'd resolve email to WID first via `GET /common/v1/workers?email=...`, then call the WID-scoped endpoint."*
- **Persistence**: writes go to **Vercel KV (Upstash Redis)** when env vars are set; falls back to per-process `globalThis` for local dev. Same setup as the other mocks — see `app/demos/jsm-queue-smoke/README.md § Vercel KV setup`. The KV key is `workday-onboarding-brennan:absenceRequests:v1`.

### `[NOT-SUPPORTED]` — don't demo these, and here's why
- **Hire / Termination / Job Change via REST**: Workday's REST API does NOT cover these — they're SOAP-only. **This is the single most important fidelity boundary for the Brennan demo.** If Eric or Sangita asks "wait, did Elementum just create a worker?" — *no, the worker existed already. Workday Hire is a separate SOAP integration; we're showing what happens after HR's done their part.* That answer respects the depth of their existing systems and avoids the kind of bluff a CIO will spot instantly.
- **Real-time worker change webhooks**: Workday has no generic webhook subscription. Outbound REST is configured per Business Process step at design time. The honest path for "notify Elementum when a worker is hired" is either a polling integration or a per-BP outbound step — not a webhook subscription.
- **Studio integration replacement** (the strategic Translator pitch): out of scope for this mock. Studio integrations are customer-built and have to be discovered case-by-case.

If a prospect asks for something in the `[NOT-SUPPORTED]` list, that's a signal to **revisit the scenario**, not extend the mock.

## Talking points (for the Brennan pitch)

This is the order of clicks for Demo Beat 2 in the pitch prep doc:

1. **Pull up Sarah Chen's worker profile** (or the JSON directly): `<host>/demos/workday-onboarding-brennan/api/common/v1/workers/sarah.chen@brennan.example`. *"This is your Workday tenant. Sarah Chen — RN, Med-Surg 4-East — added by HR overnight. Her record is here; her access isn't."*
2. **Switch to the Elementum agent chat. Type: *"Onboard Sarah Chen for her start Monday."*** *"Same agent. New skill — Onboard Worker."*
3. **Agent calls the Workday mock** → returns Sarah's role, supervisory org, cost center, manager. *"Capture and Navigate happen against Workday — same way the ITSM demo went against your catalog."*
4. **Agent shows the access bundle decision.** *"Populate is rule-driven — Cognizant defines the role-to-access mapping. RN in Med-Surg gets badge, EMR role, on-call rotation, M365 license."*
5. **Agent fires N ServiceNow access requests in sequence.** *"Validate runs per item. Submit fires the same `ValidateAndSubmit` workflow you saw five minutes ago. Same plumbing."*
6. **Switch to ServiceNow list view, refresh.** *"Four access requests. One sentence. Day-1 readiness for one nurse. Multiply by 50,000."*

## Elementum api_task config — worker lookup leg

When the Onboard Worker skill calls this mock to read worker context, the api_task config looks like:

| Field | Value |
|---|---|
| URL | `https://<vercel-host>/demos/workday-onboarding-brennan/api/common/v1/workers/{{ submitterEmail }}` |
| Method | GET |
| Headers | (none required for the mock; a real tenant would need `Authorization: Bearer <access_token>`) |
| Response: `positionTitle` | Drives the access bundle rule (e.g. "Registered Nurse" → clinical bundle) |
| Response: `supervisoryOrg` | Disambiguates unit-specific access (e.g. "Nursing — Med-Surg 4-East" → Med-Surg-4E badge group) |
| Response: `managerWid` | Optional: route the access requests to manager-approval workflows |
| Response: `costCenter` | Optional: tag downstream tickets for billing/cost allocation |

The `submitterEmail` chip is templated into the URL path so the lookup happens directly without a separate `?email=` filter call. See `skills/elementum-automations/SKILL.md § Dynamic submitter` for the broader pattern.

## Seed data shape

- **8 workers** in the Brennan supervisory tree:
  - **Sarah Chen** — RN, Med-Surg 4-East (default viewer, the new hire we're onboarding, hire date next Monday)
  - **Marcus Patel, MD** — Hospitalist, ICU (alternative demoable persona)
  - **Linda Okafor** — Patient Access Coordinator (alternative demoable persona)
  - **Karen Morrison, RN** — Charge Nurse, Med-Surg 4-East (Sarah's manager)
  - **Dr. James Holloway** — Chief of Medicine (Marcus Patel's manager)
  - **Brenda Walsh** — Patient Access Manager (Linda's manager)
  - **Margaret Sullivan** — COO (top of the supervisory tree, mentioned in the pitch brief)
  - **Alexander Clare** — Sales Engineer (the Elementum SE running the demo; email matches the calling user so the dynamic-submitter chain resolves)
- **5 absence requests** across all lifecycle states (`IN_PROGRESS`, `SUBMITTED`, `APPROVED`, `DENIED`) — chrome decoration only, none reference Sarah.
- **4 absence types**: Vacation, Sick, Personal, Bereavement.
- **Tenure-derived vacation balances**: Sarah gets 0 hours (future hire date). Others are tiered by years-of-service. Not on screen unless the audience clicks into Time Off.

All seed data lives in `data/*.ts`. Dates are computed relative-to-now at module load — the demo always looks current.

## Hygiene reminders

- The `[DEMO]` banner across the top of every screen is non-negotiable — it prevents a screenshot of this mock from ever being mistaken for a real Workday tenant.
- Don't seed real photos of real people. Use SVG initials avatars on brand-orange.
- Brennan Health System is fictional. The personas (Sarah Chen, Marcus Patel, etc.) do not match any real Brennan or Cognizant employees.
- Tenant slug stays as `brennan_dpt1` for this fork. If a future demo needs a different customer flavor, fork to a new slug — don't edit this one.
- Before you add a new endpoint or field, check `PLATFORMS/workday.md`. If you're tempted to add SOAP-only data (Hire, Job Change) to the REST mock because the demo "needs it," that's the signal to revisit the scenario, not the mock.

## Extending this mock

Common next moves:

- **Add a Worker Profile page** (Job / Time Off tabs at minimum) so the SE can show Sarah's profile in the chrome instead of just JSON. ~2 hours.
- **Add OAuth refresh-token issuance** for prospects who specifically sell on Elementum's auth handling. ~30 min.
- **Add an Expense Report endpoint** — Workday Procurement use cases. Moderate.
- **Don't add Hire / Termination / Job Change** — those are SOAP-only in real Workday and faking them in REST violates the repo's fidelity rule.

## Why no SOAP

Workday's SOAP API covers everything the platform can do, but: (a) XML is awkward for Elementum's JSON-first `api_task`, and (b) it requires a tenant-issued WSDL per service. For the onboarding demo, REST coverage is sufficient — we read worker context from REST and provision downstream via ServiceNow. Hire / Termination / Comp Change would need a SOAP-aware follow-up, but that's a different demo.
