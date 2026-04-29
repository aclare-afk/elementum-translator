# CLAUDE.md

Guidance for Claude sessions working in this repo. This file is the entry point — read it first in every new session.

## What this repo is

This is the **Elementum Translator** — a tool that translates customer source-of-record platforms (ServiceNow, Salesforce, Workday, SAP, Jira, Amazon Business, whatever) into grounded mock environments for SE demos. Elementum Sales Engineers chat with Claude (via Cowork) and request a translation of whichever platform they need for an upcoming customer demo. Claude generates the mock into this repo, pushes to a branch, and Vercel builds a live preview URL in 2–3 minutes.

The whole repo's value is keeping SE demos **grounded in what the real platform can actually do**. A mock that demos a feature the real platform cannot support creates the worst possible failure mode — the customer finds out during implementation and trust evaporates. Every design decision in this repo is in service of that constraint.

## Read these first, in order

1. **`SKILL.md`** (repo root) — the operating procedure Claude follows when an SE triggers a mock build. 7-step protocol: Clarify → Fidelity check → Plan → Generate → Register as featured demo → Commit → Handoff. Non-negotiable rules about UI chrome, API shapes, seed data hygiene, branch-based PRs, and the chip-resolution defensive value handling pattern every search/filter endpoint must implement.
2. **`PLATFORMS/README.md`** — the format for the per-platform fidelity reference files.
3. **`PLATFORMS/<platform>.md`** for whichever platform the SE is asking about — the source of truth for that platform's capabilities, API shapes, visual identity, auth modes, known-impossible features, and common demo scenarios. If the file doesn't exist yet for the requested platform, create it before building anything.
4. **`DESIGN.md`** — the repo's architectural philosophy and how the pieces fit.
5. The exemplar at **`app/demos/servicenow-itsm-exemplar/`** — the template every new mock should be structurally modeled after; also the canonical example of the defensive `applySysparmQuery` pattern.
6. **`app/demos/jsm-queue-smoke/`** — the canonical example of write-API + KV-backed store wiring.

## When an SE message comes in

Trigger phrases include:
- "Build me a &lt;platform&gt; mock"
- "Spin up a mock ServiceNow/Salesforce/Workday instance"
- "I have a demo in X days, need a mock that does Y"
- "Add a &lt;scenario&gt; mock to the repo"

When you recognize one of these, jump straight into the SKILL protocol. Do NOT:
- Start coding without Step 2 (fidelity check)
- Add to `main` directly — always a branch, always a PR
- Invent API endpoints or field shapes you haven't verified
- Put real customer PII in seed data

If the SE request is about Elementum itself (building real apps, real automations, real agents), this repo is not the right place — that work happens in the Elementum provider repo. Say so and hand back.

## Code style / conventions in this repo

- **Next.js 15 App Router** with TypeScript. Use server components by default, `"use client"` only where state/handlers need it.
- **Tailwind 3.4** for utility classes. Design tokens (platform colors, typography) live in `components/platforms/<name>/design-tokens.ts`, not inline. If you need to tweak a color, update the platform file first, then the token file, then the component.
- **Underscore-prefixed folders** (e.g., `_lib/`) for per-demo private code Next.js should not route.
- **Path aliases**: `@/components/...`, `@/lib/...` per `tsconfig.json`.
- **Imports from shared chrome** always via the barrel export: `import { Frame, Nav, Sidebar } from "@/components/platforms/servicenow"`.
- **API routes** under `app/demos/<slug>/api/...` must mirror the real platform's URL exactly. ServiceNow's Table API is `/api/now/table/{table_name}`, so the route file path is `api/now/table/[name]/route.ts`. Don't invent "cleaner" paths.
- **Utility endpoints** (for the mock itself, e.g., seed reset) go under `/api/__mock__/...` so they're clearly not part of the simulated surface.
- **Every mock page** must include the `[DEMO]` banner from the shared chrome. The `Frame` component already does this.

## Git workflow

```bash
git checkout -b demo/<slug>
git add app/demos/<slug> app/page.tsx
git commit -m "demo(<platform>): <slug> — <one-line scenario>"
git push -u origin demo/<slug>
# then open a PR
```

The branch name and commit message format are in SKILL.md § Step 6 (Commit). Don't deviate.

## Working directory context

- **Real source**: the `elementum-translator/` folder the user has open in Cowork — this repo.
- **Parent repo** at `/sessions/clever-busy-edison/mnt/fde-tf-cli-old/` is the Elementum Terraform provider, unrelated to this sub-project. Don't touch it from mock-building sessions.

## Things that would need updating if the project evolves

- If Next.js ships a new routing convention that breaks `app/demos/<slug>/api/now/table/.../route.ts` path nesting: update the routing examples in SKILL.md and DESIGN.md.
- If we move from Vercel to another host: update the deploy section in DESIGN.md and the handoff step in SKILL.md.
- If we add a UI where SEs can browse existing mocks instead of just the registry on `app/page.tsx`: update the registry format and the SKILL.md "add new mock" step.

## What NOT to change without discussion

- The **7-step protocol** in SKILL.md. It encodes the fidelity-first philosophy. Tweaks to wording are fine; restructuring needs an intentional decision.
- The **PLATFORMS/&lt;name&gt;.md required sections**. Downstream prompts depend on each section being present.
- The **hygiene rules** (no real PII, no real customer names even in seeds, `[DEMO]` banners). These exist because a leaked demo hurts everyone.
- The **defensive value handling pattern** for search/filter endpoints (SKILL.md § Step 4). Every new mock must implement it from the start; we burned debugging cycles re-discovering the chip-resolution edge case before codifying it.

## Tracking changes

When a vendor API changes and the mock needs to drift from what's documented in `PLATFORMS/<name>.md`, **update the platform file first, then the mock.** Never patch mocks around a stale platform file. The platform file is the source of truth; the mock is a derivation.
