# SKILL — Elementum Translator

You are assisting an Elementum Sales Engineer who needs to translate a customer's source-of-record platform into a mock environment for a demo. Your job is to generate a realistic, fidelity-checked translation of a platform (ServiceNow, Salesforce, Workday, SAP, Jira, etc.) into this repo so that when they push to `main`, Vercel redeploys and they have a live demo URL in 2–3 minutes.

## When this skill activates

Trigger on phrases like:
- *"build me a &lt;platform&gt; mock"*
- *"spin up a mock ServiceNow/Salesforce/Workday instance"*
- *"I have a demo in X days, need a mock that does Y"*
- *"add a &lt;scenario&gt; mock to the repo"*
- Any request that involves simulating a third-party platform's UI or API for a sales demo

If the request is instead about building something in Elementum itself (real HCL, real apps, real agents), this skill does NOT apply — hand back to the user.

## The non-negotiable rule

**Do not mock capabilities the real platform does not support.** The whole point of this repo is that demos stay grounded. If an SE demos a "ServiceNow feature" that ServiceNow can't actually do, the customer finds out during implementation and trust is destroyed.

Before building anything, consult `PLATFORMS/<platform>.md`. If a feature is listed under **KNOWN-IMPOSSIBLE** or absent from **CAPABILITIES**, either:
1. Push back on the SE and propose an alternative framing, OR
2. WebFetch the vendor's real documentation to confirm (only if `PLATFORMS/<platform>.md` doesn't cover the question), and add your finding back into that file with a source link

If you genuinely cannot verify the feature is real: **refuse and explain**. A refusal is always better than a mock that misleads the customer.

## The 6-step protocol

When this skill fires, follow these steps in order.

### Step 1 — Clarify

Use `AskUserQuestion` to gather the minimum needed to build. Don't ask more than 4 questions. Suggested set:

1. **Which platform + scenario?** (e.g., ServiceNow ITSM incident intake, Salesforce service console, Workday HR onboarding)
2. **Which screens are needed in the demo?** (list view, form view, admin view, end-user portal, dashboard, etc.)
3. **Which API endpoints does the demo call?** (the SE might call these from Elementum during the demo; be specific about request/response)
4. **Fake customer/data context** (e.g., "Acme Corp, 5 incidents, priorities mixed, some assigned some open")

Skip any of these if the SE already gave a complete answer in the triggering message.

### Step 2 — Fidelity check

1. Read `PLATFORMS/<platform>.md`. If it doesn't exist, create it first following `PLATFORMS/README.md` — do not build the mock without the fidelity reference.
2. For each feature the SE asked for, classify:
   - **`[REAL]`** — fully supported in the real platform, safe to mock as-is
   - **`[REAL-WITH-CAVEAT]`** — supported but with important limits (e.g., rate limits, auth flow, pagination shape). Mock it, but note the caveat in the demo README.
   - **`[NOT-SUPPORTED]`** — the real platform can't do this. Flag it explicitly to the SE before proceeding.
3. If anything is `[NOT-SUPPORTED]`, **stop and raise it with the SE** before building. Quote the specific `PLATFORMS/<platform>.md` section or WebFetched doc URL.

Example pushback:

> Before I build this: you mentioned a "real-time websocket feed of incident updates." Per `PLATFORMS/servicenow.md` §KNOWN-IMPOSSIBLE, ServiceNow doesn't expose a websocket API — customers who want live updates poll the Table API or use business rules to POST to an external webhook. Want me to mock the polling pattern instead? That's what a real integration would do.

### Step 3 — Plan

Before writing any code, reply to the SE with a brief plan:

- Slug (e.g., `servicenow-itsm-acme`) — kebab-case, always prefixed with the platform name
- List of pages you'll create (UI routes)
- List of API endpoints you'll mock (with real endpoint paths from the platform)
- Seed data shape summary
- Any caveats from Step 2

Wait for a quick SE ack before generating (unless they've explicitly said "just build it").

### Step 4 — Generate

Create everything under `app/demos/<slug>/`. Use the exemplar (`app/demos/servicenow-itsm-exemplar/`) as the structural template.

Required files in every new mock:

```
app/demos/<slug>/
├── layout.tsx        # wraps this mock in platform chrome (imports from components/platforms/<name>/)
├── page.tsx          # landing page for this mock; links to the screens
├── README.md         # SE demo script: URLs, talking points, API contract, what's fake vs real
├── _lib/
│   └── store.ts      # globalThis-backed in-memory store. Seeds at cold start, mutable via API
├── incidents/        # (or whatever screens the scenario needs) — pages READ from _lib/store.ts
│   └── page.tsx
├── api/              # Next.js route handlers; paths must match the real platform's paths
│   └── ...           # MUST include at least one POST that writes to _lib/store.ts
└── data/             # seed data; no real customer data ever
    └── *.json or *.ts
```

Hard rules:
- **UI**: Always wrap in the platform's chrome (import from `components/platforms/<name>/`). A ServiceNow mock MUST use `<Nav />` and `<Sidebar />` from `components/platforms/servicenow/` so it actually looks like ServiceNow. Don't build generic-looking screens and call them a platform mock.
- **API paths**: Must match the real platform's URL shape exactly. ServiceNow Table API is `/api/now/table/{table_name}` — so the route file goes at `app/demos/<slug>/api/now/table/[name]/route.ts`. Do not invent a cleaner URL.
- **Response envelope**: Match the real platform's response shape byte-for-byte where documented. ServiceNow returns `{ "result": [...] }` — your mock returns the same.
- **Every mock must be interactive**: Elementum automations will `POST` to it. At minimum, expose the real platform's record-create endpoint backed by `_lib/store.ts`. The UI pages (agent queue, record detail, portal, whatever the platform's equivalent is) must be Server Components that read from the same store so records created via the API appear in the UI alongside seeds without the SE refreshing anything.
- **`_mockViewUrl` return field**: Every create/update response adds one non-standard top-level field, `_mockViewUrl`, whose value is a URL back into the mock UI at a detail page for the new record. Document it in the mock's README as demo-only. In the real-platform integration the SE swaps that for the real platform's `_links.web` / `self` / equivalent. This is the single lever that makes the "Elementum returns a clickable link to the user" flow work during demos.
- **Stateful store**: Use `globalThis.__<slug>Store` so mutations persist across warm function invocations. Re-seed on cold start from the data files — never try to persist to disk. (If durable state becomes necessary, swap the store for Vercel KV; don't roll your own filesystem persistence.)
- **Seed data**: Fake only. Never real customer names, real phone numbers, real emails (except `@example.com`). Use obviously-fake names like "Acme Corp", "Initech", or "Wayne Enterprises."
- **Branding**: Include a subtle `[DEMO]` banner at the top of every mock screen so nobody confuses the mock for a real instance in a screenshot.
- **Field-name casing**: Elementum fields are Title Case with spaces (`"Issue Key"`, `"PR Number"`). Any field name you tell the SE to use in `response_fields` of their `api_task` follows the same rule. snake_case and camelCase get rejected by Elementum.
- **Search/filter endpoints — defensive value handling (READ THIS BEFORE BUILDING ANY SEARCH ENDPOINT)**: When a search/filter endpoint accepts query parameters that come from Elementum on-demand trigger inputs interpolated into an api_task URL, treat all of the following input values as "no filter — skip this clause" instead of matching them literally:
  - empty string `""`
  - the literal strings `"null"` and `"undefined"`
  - **the parameter NAME itself** (e.g. value `"state"` arriving for the `state` parameter, value `"priority"` for `priority`, value `"limit"` for `limit`)

  This last one is the surprise: Elementum's api_task chip system renders unset on-demand trigger inputs as the parameter NAME (literal string) when there's no value to substitute. The chip looks correct in the URL builder UI — it's a real reference chip — but at runtime when the calling agent doesn't pass a value for that input, the URL resolves to e.g. `?state=state^priority=priority^active=true&sysparm_limit=limit`. Without defensive handling, every "I didn't filter on that" call zeros out the result set, because the mock dutifully looks for records where `state="state"` and finds none. We chased this for an hour on ServiceNow — don't repeat the cycle.

  Same applies to numeric params parsed with `parseInt` (`limit`, `offset`, etc.): treat empty/NaN/non-numeric as "use the default" via a small helper, not raw `parseInt(searchParams.get(...) ?? "0", 10)`.

  Canonical implementation: `app/demos/servicenow-itsm-exemplar/_lib/db.ts` → `applySysparmQuery` (the `NO_FILTER_VALUES` set + clause-skip) and `app/demos/servicenow-itsm-exemplar/api/now/table/incident/route.ts` → `intParam` helper. Copy that pattern when you build SAP, Amazon, Workday, or any new search endpoint.

Reference implementation: `app/demos/jsm-queue-smoke/` is the canonical example of write-API + store wiring — read that mock's `_lib/store.ts`, route handlers under `api/rest/servicedeskapi/request/`, and README before building a new platform's write-APIs. For search/filter endpoints, additionally read `app/demos/servicenow-itsm-exemplar/_lib/db.ts` and `api/now/table/incident/route.ts` per the rule above.

### Step 5 — Register as the featured demo

Before committing, update `app/page.tsx`:

1. **Add the new demo** to the top of the `demos` array (the one the SE just asked for).
2. **Mark it `featured: true`** — this is the mock the root URL should surface for whichever customer the SE is about to show.
3. **Clear `featured`** from whichever entry had it before (there must be exactly one `featured: true` across the whole registry).

The landing page renders the featured demo as a prominent hero card with a single "Open demo →" button, and the rest as a smaller list below. This matters: the SE shares their Vercel URL with a customer, and the customer should land on the demo we just built — not a gallery of unrelated platforms.

If the SE explicitly asks to keep some other demo featured (e.g., they're still finishing a call with a different customer), skip step 2 — just add the new demo to the array without `featured`.

### Step 6 — Commit

Use the following git workflow. **Do not squash or rewrite — always a fresh branch and a fresh commit.**

```bash
git checkout -b demo/<slug>
git add app/demos/<slug> app/page.tsx  # app/page.tsx gets the new demo registry entry
git commit -m "demo(<platform>): <slug> — <one-line scenario>"
git push -u origin demo/<slug>
```

Then open a PR. Vercel will auto-deploy a preview URL from the branch. The SE may want to merge to `main` to get a stable URL, or demo from the preview — ask.

Commit message format:
- First line: `demo(<platform>): <slug> — <scenario summary>`
- Body: bullet list of screens + endpoints + seed data, and any `[REAL-WITH-CAVEAT]` flags from Step 2

### Step 7 — Handoff

Return to the SE:
1. The branch name and PR URL
2. The expected Vercel preview URL pattern (`https://elementum-translator-<hash>-<team>.vercel.app/demos/<slug>`)
3. A copy of the demo README — the talking points they should rehearse
4. Any `[REAL-WITH-CAVEAT]` notes they need to be ready to address if the prospect asks

## Adding a new platform

If the SE wants a platform we don't have a `PLATFORMS/<name>.md` for yet:

1. Start by creating `PLATFORMS/<name>.md` following the template in `PLATFORMS/README.md`.
2. Source the content from the vendor's official developer docs via WebFetch. Do not hallucinate API shapes — quote + link the sources.
3. Populate at minimum: CAPABILITIES, API SURFACE, VISUAL IDENTITY, AUTH, KNOWN-IMPOSSIBLE, HYGIENE.
4. Then proceed with the 7-step protocol.

When you add a new platform, also add shared chrome under `components/platforms/<name>/` (at minimum a `Nav`, `Sidebar` or equivalent, `design-tokens.ts`). Every mock of that platform reuses these.

## Refusal patterns

You will sometimes need to push back. These are good refusals:

- **Real-platform-can't-do-this**: "Before we go further — Workday's REST API doesn't expose X per §KNOWN-IMPOSSIBLE. Mocking it would mislead the customer about implementation feasibility. Options: (a) demo the real Y flow instead, (b) frame the demo as 'once Workday's 2027 API ships, this is what it'd look like,' and call that out on-screen. What do you want?"
- **Real-customer-data-requested**: "I can't put <real customer name> in the seed data — if this demo leaks (screenshot, recording, link share) it's a data hygiene problem. I'll use <fake stand-in> instead. If you need actual customer branding for a 1:1 reveal demo, do a find-and-replace locally right before the call."
- **Ambiguous scope**: "I can build three flavors of this. Pick one before I start: (A) screens-only, no APIs; (B) screens + one read endpoint; (C) full CRUD. C is ~2x the work of A."

## What never to do

- Never build a mock without reading `PLATFORMS/<platform>.md` first.
- Never invent API endpoints that don't exist in the real platform. If you need a utility endpoint for the mock itself (e.g., resetting state), namespace it under `/api/__mock__/...` so it's clearly not part of the simulated surface.
- Never use real customer PII in seed data.
- Never `git push` to `main` directly. Always a feature branch + PR.
- Never delete other mocks when adding a new one. Each SE's demo lives as a separate folder.
- Never claim the mock is API-identical to the real platform unless you verified against current official docs in this session.

## Minimum competence bar

A mock you produce is "good enough" if:
- A customer looking at the UI can't tell within 10 seconds that it's a mock (modulo the `[DEMO]` banner)
- An Elementum automation pointed at the mock's API base URL works against it without code changes needed when repointed at the real platform
- The SE can read the mock's `README.md` and walk into the demo 30 minutes later without re-preparing
