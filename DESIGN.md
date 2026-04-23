# DESIGN.md

The why behind this repo. Read `README.md` first for the what.

## The problem we're solving

Every Elementum SE hits the same wall: a customer says *"can you show us what this would look like hitting our ServiceNow / Salesforce / Workday instance?"* and the SE is staring down a week of build time. Options historically have been:

1. **Beg for a real sandbox.** Slow, requires customer cooperation, locks the demo to one customer.
2. **Fake it in Figma / click-through.** Looks plausible in a meeting, but can't actually be wired to an Elementum automation. The moment a prospect asks "can I see Elementum push data back?" the demo falls apart.
3. **Stand up a real instance for the demo.** Hours or days. Not practical under deadline.

This repo is option 4: a shared, versioned, live-URL mock environment where the SE gets a **functioning platform simulator** — real UI chrome, real API surface, real response shapes — in the time it takes to run a prompt and wait for Vercel to build.

## The core constraint: fidelity

The single rule that shapes every decision in this repo: **don't simulate capabilities the real platform doesn't have.**

This matters because:
- Demos turn into expectations. A customer who sees a "ServiceNow websocket feed" in our demo will ask for it in implementation. When the answer is "sorry, ServiceNow doesn't expose that," we've set up Elementum to look like the liar, not the honest broker.
- Implementation teams inherit demo expectations. A good demo is a contract with implementation. If the demo is untruthful, implementation pays the bill.
- Competitors will catch this. Any prospect evaluating seriously will talk to someone who actually uses the platform. "Their demo showed X" / "the real platform doesn't do X" is a fatal pattern.

So: the `PLATFORMS/<name>.md` files are the audit trail. They say what the real platform can and cannot do, with source links. Claude consults them before building. Features that would require the real platform to do something it can't become **refusals**, not silent additions to the mock.

The refusal is a feature. An SE who comes back to Claude with "the customer really wants the websocket though" should hear the same answer: "ServiceNow doesn't expose that; your options are polling or outbound Business Rule webhooks." Then the demo is redesigned around what's real, and the SE walks into the meeting having already internalized the same answer the customer will get during scoping.

## Why mocks instead of a shared real sandbox

We thought about pointing every SE at a shared ServiceNow dev org and calling it a day. Why we didn't:

- **State bleeds across demos.** Customer A's incidents end up in Customer B's list view.
- **Sandboxes rate-limit and lag.** A customer demo cannot afford a 30-second Table API cold start.
- **Customization is slow.** Re-seeding a sandbox for a specific customer's scenario is a half-day of work each time.
- **Sandboxes have version drift.** ServiceNow releases a new UI; the sandbox suddenly looks different from the version the customer is on.

Mocks solve all of these: per-customer seed data, no rate limits, zero cold start for static pages, we control the UI version, and demos are branch-scoped so they don't interfere with each other.

## Why Vercel + Next.js App Router

- **One-command deploys per branch.** That's the core loop we need — SE pushes, preview URL is live in 2–3 minutes. Vercel does this without ceremony.
- **API routes and UI pages colocated.** Next.js lets us put `app/demos/<slug>/page.tsx` next to `app/demos/<slug>/api/now/table/incident/route.ts`. Same deployment, same folder, same mental model.
- **No separate backend to operate.** We don't want a Postgres dependency for demos that need five seed records.
- **URL control.** App Router segments let us mirror real vendor URL shapes without reverse proxies. ServiceNow's `/api/now/table/incident` lands at the route file `app/demos/<slug>/api/now/table/incident/route.ts` with no rewrites.

If we hit a Vercel limitation (e.g., we need a persistent DB across cold starts), we'll revisit. So far the in-memory store with `globalThis` caching has been enough.

## The structure: mocks as folders, not routes

Every mock lives at `app/demos/<slug>/` and is fully self-contained. That is:

- UI pages (`layout.tsx`, `page.tsx`, nested routes)
- API routes (`api/...` with paths that match the real vendor)
- Seed data (`data/*.json`)
- Private helpers (`_lib/*.ts`, with the underscore prefix to keep Next.js from routing them)
- An SE-facing `README.md` with talking points

This lets us:
- Copy-paste a mock for a customer-specific variant (`servicenow-itsm-exemplar` → `servicenow-itsm-acme`) without cross-contamination.
- Delete a mock by deleting one folder — no scattered config to clean up.
- Version individual demos independently.

## Shared chrome: per-platform, not per-mock

UI chrome lives at `components/platforms/<name>/`. ServiceNow gets `Nav`, `Sidebar`, `Frame`, `ListViewShell`, `FormShell`, `DemoBanner`, and `design-tokens.ts`. Every ServiceNow mock imports from this module.

Why:
- **Consistency across demos.** All ServiceNow mocks look like ServiceNow. An SE who builds an ITSM mock and then a CSM mock reuses the same Application Navigator behavior.
- **Single place to fix drift.** When ServiceNow ships a UI refresh and our chrome starts looking dated, we update `components/platforms/servicenow/` once and every ServiceNow mock in the repo picks it up.
- **Design tokens as contract.** The hex codes and typography live in `design-tokens.ts`. Mocks can't deviate without editing the tokens, which means the fidelity conversation happens up front, not scattered across 20 `style={{ background: "#somehex" }}` inlines.

The boundary is deliberate: **platform-specific UI** goes in shared chrome; **scenario-specific content** stays in the mock folder. A ServiceNow list view of incidents lives in the mock; the list view's sort/paginate/filter-chip mechanics live in shared chrome.

## The `PLATFORMS/` fidelity model

Each `PLATFORMS/<name>.md` has 10 required sections (see `PLATFORMS/README.md` for the spec). The four that do the most work:

- **CAPABILITIES**: what the platform can do. A feature inventory.
- **API SURFACE**: real endpoint paths, query params, request/response shapes, pagination, errors, rate limits. Byte-for-byte accuracy matters here.
- **KNOWN-IMPOSSIBLE**: the list of things the platform can't do but customers assume it can. This is where refusals come from.
- **COMMON SE SCENARIOS**: named demo shapes with `[REAL]` / `[REAL-WITH-CAVEAT]` / `[NOT-SUPPORTED]` flags so Claude can match an SE's request to a precedent.

These files are **living**. When Claude uses WebFetch during a build to fill a gap in a platform file, the finding writes back into the file in the same PR. The next SE building a mock of the same platform doesn't re-fetch.

## The Vercel preview flow

The SE does not deploy. The PR triggers a Vercel build, which produces a preview URL. URL pattern:

```
https://elementum-translator-<hash>-<team>.vercel.app/demos/<slug>
```

The SE can:
1. Demo from the preview URL directly. Preview URLs are long-lived and stable per-branch.
2. Merge to `main` for a stable production URL (`https://elementum-translator.vercel.app/demos/<slug>` or whatever the custom domain ends up being).

Never `git push` directly to `main`. The one rule — fidelity first — only holds if every mock goes through a PR review where someone can call out "wait, ServiceNow doesn't actually do that."

## What we chose not to build (yet)

Things that sound like good ideas but aren't on the roadmap:

- **An admin UI for managing seed data.** Tempting. But seed data in JSON files under version control is better — it's diffable, reviewable, and doesn't require us to build auth for a mock admin panel.
- **A generic mock framework.** We're resisting the urge to build a "platform mock DSL." Each platform is different enough that a DSL would either leak implementation details or get abandoned. Per-platform shared chrome + per-mock scenarios keeps things honest.
- **Real OAuth token issuance across the repo.** Most demos don't need it; the handful that do can mock `/oauth_token.do` in their own mock folder. A repo-wide auth layer would get in the way of the 90% of demos that just need the API shape.
- **Automatic screenshot / GIF generation for SE handoff.** Would be nice; add later if the team hits the limit of "read the README, walk in prepared."
- **Custom domains per demo.** Vercel subdomains are fine for demos. If a customer specifically needs to see their branded domain, that's a one-off local find-and-replace right before the call, not a repo feature.

## What "done" looks like for a mock

Per SKILL.md § Minimum competence bar:

1. A customer looking at the UI can't tell within 10 seconds that it's a mock (modulo the `[DEMO]` banner).
2. An Elementum automation pointed at the mock's API base URL works against it without code changes when repointed at the real platform.
3. The SE can read the mock's `README.md` and walk into the demo 30 minutes later without re-preparing.

If all three are true, the mock is good. If any one is false, it's not done.

## Tradeoffs we're living with

- **In-memory state.** Writes via the mock's API don't survive cold starts. For 98% of demos this is fine — the SE creates an incident, shows it appearing, talks about what Elementum would do next. For the edge case where state needs to persist (a multi-day rehearsal), the SE re-seeds. We'd rather live with this than bring in a database.
- **Not all query operators.** ServiceNow's `sysparm_query` supports operators like `LIKE`, `STARTSWITH`, `>=`. The exemplar only handles `=` joined by `^`. Enough for the demos we've seen; we'll extend when a real scenario needs more.
- **No real auth by default.** The mock accepts any Authorization header. If a demo is specifically about Elementum's auth handling, that mock mocks `/oauth_token.do` and enforces the bearer. The default is to skip auth friction in favor of demo speed.

These are conscious choices, not oversights. If an SE hits a case where one of these tradeoffs doesn't hold, the fix is to extend the mock thoughtfully — not to re-architect the repo.

## Maintenance posture

- **Quarterly**: skim every `PLATFORMS/<name>.md` against the vendor's current docs. Flag drift.
- **Per-PR**: reviewer checks that any new API shape in the mock is cited in the corresponding platform file. If not, reject or request the citation.
- **Per-incident**: if a customer reports during an implementation that "the demo showed X but our platform doesn't do X," treat it as a P1 platform-file bug. Update the file, update the mock, audit other mocks for the same pattern.
