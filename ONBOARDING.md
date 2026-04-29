# Team Onboarding — Elementum Translator

Welcome. This doc gets you from "I was added to the repo" to "I just shipped a platform mock for my demo Friday" in about 15 minutes of one-time setup, then 2–3 minutes per mock after that.

## Who this is for

Elementum Sales Engineers who need a grounded mock of ServiceNow / Salesforce / Jira / SAP / Amazon Business / Workday / whatever-else-the-customer-runs for an upcoming demo. You're not writing HCL, not standing up sandboxes, not clicking through Figma. You ask Claude, Claude generates the mock, Vercel gives you a live URL.

## What you'll have at the end

- A local clone of this repo, open in Cowork
- The ability to say "build me a Workday HR mock for an Acme demo Friday" in Cowork and get a live preview URL in 2–3 minutes
- A shared PR-and-preview workflow so the team reviews each other's fidelity and nobody's demo interferes with anyone else's

## What's already shipped

Five platforms are demo-ready end-to-end with create + search + dynamic submitter identity:

- **Salesforce Service Cloud** — Cases (REST + SOQL)
- **Jira Software** — Issues (REST API)
- **ServiceNow ITSM** — Incidents (Table API)
- **SAP S/4HANA** — Purchase Requisitions (OData v2)
- **Amazon Business** — Punchout cart hand-off + buyer-system requisitions

Three more (JSM, additional Salesforce surfaces, others) live as smoke-level scaffolds — read each demo's README before assuming end-to-end fidelity.

---

## One-time setup (~15 minutes)

### 1. Get repo access

Ping Xander in Slack asking to be added as a collaborator to `aclare-afk/elementum-translator`. You'll get a GitHub email invite — accept it.

### 2. Install prerequisites

If you don't already have these:

- **Git** — `git --version` to check. On Mac it comes with Xcode Command Line Tools; `xcode-select --install` if not.
- **Node.js 18+** — `node --version` to check. Grab from nodejs.org or `brew install node`.
- **Cowork desktop app** — if you don't have it, download from Anthropic.

### 3. Clone the repo

```bash
cd ~/Documents/GitHub   # or wherever you keep projects
git clone https://github.com/aclare-afk/elementum-translator.git
cd elementum-translator
npm install
```

If Git prompts for a password, that's GitHub asking for a Personal Access Token (not your account password — GitHub doesn't accept passwords for git-over-HTTPS anymore). To make one: github.com → your avatar → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token → check the `repo` scope → copy the `ghp_...` string and paste it as the "password."

### 4. Verify it runs locally

```bash
npm run dev
```

Open http://localhost:3000. You should see the Elementum Translator landing page with the five platform mocks listed. Click into any of them, poke around. Hit Ctrl+C in Terminal to stop the server.

### 5. Open the repo in Cowork

Launch Cowork → "Select folder" → point at `~/Documents/GitHub/elementum-translator`. Cowork will auto-load the skill from `SKILL.md` and you're ready.

---

## The demo-building loop (every time you need a mock)

### Step 1: Ask Claude in Cowork

One sentence is enough. Examples that work:

> Build me a Workday HR mock for an Acme demo Friday. Need the worker record UI and the REST endpoint for creating a worker.

> I need a Coupa procurement mock for a demo next Tuesday — purchase requisitions, REST API, an admin queue view.

> Build me a Microsoft Dynamics 365 case management mock — record list, record page, the relevant Power Platform REST surface.

Claude follows a 7-step protocol (defined in `SKILL.md`):

1. **Clarify** — asks up to 4 questions if anything is ambiguous
2. **Fidelity check** — cross-references `PLATFORMS/<platform>.md` to confirm the real platform can actually do what you're asking. If it can't, Claude pushes back and proposes an alternative.
3. **Plan** — tells you the slug, pages, API endpoints, seed data shape. Gets your okay.
4. **Generate** — writes all the files under `app/demos/<slug>/`
5. **Register** — adds the new mock to the landing page registry, marks it as the featured demo if you ask
6. **Commit** — pushes a branch
7. **Handoff** — hands you the PR URL, the preview URL, and a copy of the demo README's talking points

### Step 2: Grab the preview URL

When the PR opens, Vercel comments on it within 2–3 minutes with a live preview URL. Format:

```
https://elementum-translator-<hash>-xanders-projects-b317df5e.vercel.app/demos/<slug>
```

Demo from the preview URL directly — you don't need to merge for customer demos.

### Step 3 (optional): Merge to main

Only merge if you want a stable production URL at `elementum-translator.vercel.app/demos/<slug>`. For one-off customer demos, the preview URL is fine and lives as long as the branch does.

---

## Things to know

### Trust the fidelity refusals

If Claude says *"ServiceNow doesn't expose a websocket — want me to mock the polling pattern instead?"* — that's the skill working as designed. The whole point is to keep demos grounded in what the real platform can actually do. A mock that simulates fake capabilities gets the customer burned during implementation and kills the deal. Redesign the demo around what's real.

### Adding a new platform

If there's no `PLATFORMS/<platform>.md` for what you need, Claude will create one first by reading the vendor's official developer docs. This adds ~5 minutes to the first mock of a new platform. Every subsequent mock of that same platform reuses the reference file.

### Seed data rules

Claude uses fake customer names (Acme Corp, Initech, Wayne Enterprises) and `@example.com` emails. Don't swap in real customer data — if a screenshot of the mock leaks, that's a data hygiene problem. If you need actual customer branding for a specific 1:1 reveal demo, do a find-and-replace in your branch right before the call.

### Persistent state via Vercel KV

Every mock that mutates state (creates, updates) is backed by **Vercel KV** (Upstash Redis under the hood). Writes survive cold starts and cross-function-instance routing — so when an Elementum agent creates a record and then immediately searches for it, the search finds it. Each mock uses a unique key prefix so they coexist in one KV instance without colliding.

Locally, mocks fall back to a `globalThis`-backed in-memory store when KV env vars aren't present. POSTs persist within a running dev server but reset between restarts — fine for local iteration, KV is what keeps production demos honest.

### Dynamic submitter identity

When an Elementum agent calls these mocks with a real user's email/name in scope, records get attributed to that user (Created By, Reporter, Contact, etc.) instead of a default seed persona. Each mock's README has a "Submitter Identity" section with the specifics, but the short version: pass `submitterEmail` and `submitterName` (or platform-specific equivalents) on every create call.

### Defensive value handling

Every search/filter endpoint and create body uses defensive value handling for chip-resolution edge cases — when an Elementum api_task chip resolves to its own parameter name (`status: "status"` instead of `status: "01"`), the mocks treat that as "no value" and fall back to defaults. See `SKILL.md` § "Search/filter endpoints — defensive value handling" for the canonical pattern. Apply it to every new mock from the start.

### The one rule

**Never `git push` to `main` directly.** Always a feature branch + PR. The PR review is where someone on the team catches "wait, ServiceNow doesn't actually do that" before the mock becomes a customer-facing promise.

---

## Common issues

**"Permission denied to aclare-afk/..."** — Your GitHub PAT is stale or cached from a different account. Make a fresh one; if macOS Keychain keeps handing the old one, open Keychain Access, search `github.com`, delete the entries, retry.

**Vercel build failed** — Check the Deployments tab on vercel.com. 90% of the time it's a TypeScript error in code Claude just generated. Open the PR, ping Claude in Cowork with the error message, it'll fix and push a new commit. The other 10% is usually a Next.js 15 quirk (e.g., `useSearchParams` requires a Suspense boundary — the Amazon punchout page hit this once).

**Mock looks right but Elementum can't reach the API** — Double-check the base URL (should include `/demos/<slug>/api/...`). The API routes are nested under the demo folder; they don't live at the Vercel app root.

**Cowork didn't pick up the skill** — Confirm you opened the `elementum-translator` folder itself, not a parent folder. The `SKILL.md` at the repo root is what Cowork auto-loads.

**Chip in api_task resolves to its parameter name** — known Elementum quirk; the mocks already handle it defensively, but if you see `?status=status` in an execution log, that's the chip not getting populated. Check the agent's skill instructions for the corresponding tool — it should explicitly tell the agent what value to pass for that field.

---

## Reference

- **[SKILL.md](./SKILL.md)** — the full 7-step protocol Claude follows, plus refusal patterns, the chip-resolution defensive pattern, and the minimum competence bar
- **[CLAUDE.md](./CLAUDE.md)** — entry point for Claude sessions; read this if you want to understand how Claude is oriented on the repo
- **[DESIGN.md](./DESIGN.md)** — why the repo is structured the way it is; read if you want to extend it
- **[PLATFORMS/README.md](./PLATFORMS/README.md)** — format for the per-platform fidelity reference files
- **[app/demos/servicenow-itsm-exemplar/](./app/demos/servicenow-itsm-exemplar/)** — the reference mock for write-API + search/filter patterns
- **[app/demos/jsm-queue-smoke/](./app/demos/jsm-queue-smoke/)** — the reference mock for KV-backed store + multi-surface UI

---

## Questions, bugs, ideas

Ping Xander in Slack. If you catch a mock that simulates something the real platform can't do, that's a P1 — flag it, update the relevant `PLATFORMS/<name>.md`, and let's fix the pattern before it burns a real customer.
