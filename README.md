# Elementum Translator

A Next.js + Vercel repo where Elementum Sales Engineers **translate customer source-of-record platforms** (ServiceNow, Salesforce, Workday, SAP, Jira, and friends) into grounded, fidelity-correct mock environments for demos.

Each mock is a self-contained folder under `app/demos/<slug>/` with its own UI pages, API routes, seed data, and an SE-facing README. Push a branch, Vercel spins up a live preview URL, the SE walks into the demo 30 minutes later.

## How it works

1. An SE opens this repo in Cowork and asks Claude something like *"build me a ServiceNow ITSM mock for a demo Friday — need incident list, form, and the Table API so Elementum can read/write against it."*
2. Claude follows the 6-step protocol in [`SKILL.md`](./SKILL.md): clarify scope, fidelity-check against [`PLATFORMS/<platform>.md`](./PLATFORMS/), plan the mock, generate files under `app/demos/<slug>/`, commit on a feature branch, open a PR.
3. Vercel auto-deploys a preview URL from the branch.
4. The SE demos from the preview URL or merges to `main` for a stable one.

## Repo layout

```
elementum-translator/
├── SKILL.md                      # The operating procedure Claude follows
├── CLAUDE.md                     # Entry point for Claude sessions
├── DESIGN.md                     # Architectural philosophy
├── PLATFORMS/
│   ├── README.md                 # Format for platform fidelity files
│   └── servicenow.md             # Per-platform fidelity reference
├── components/
│   └── platforms/
│       └── servicenow/           # Shared chrome: Nav, Sidebar, ListView, Form
├── app/
│   ├── page.tsx                  # Registry of available mocks
│   ├── layout.tsx                # Root layout
│   └── demos/
│       └── servicenow-itsm-exemplar/    # Example ServiceNow mock
│           ├── layout.tsx
│           ├── page.tsx
│           ├── README.md                 # SE demo script
│           ├── _lib/                     # Private per-demo code
│           ├── incidents/                # UI routes
│           ├── api/now/table/incident/   # API routes (match real paths)
│           └── data/                     # Seed JSON (fake data only)
├── lib/
│   └── utils.ts                  # Shared helpers (cn, sysId, date formatters)
└── vercel.json                   # Vercel deploy config
```

## Local development

```bash
npm install
npm run dev
# open http://localhost:3000
```

The landing page lists every available mock. Click through to a mock's landing page to see its UI surfaces and API endpoints.

Try the exemplar's Table API:

```bash
curl 'http://localhost:3000/demos/servicenow-itsm-exemplar/api/now/table/incident?sysparm_query=active=true^priority=1' | jq
```

## Adding a new translation

Don't write these by hand. Ask Claude in Cowork:

> Build me a Workday HR mock for an onboarding demo. Need the worker record UI and the REST endpoint for creating a worker.

Claude will follow the SKILL.md protocol, including pushing back if the scenario requires something the real platform can't actually do. That friction is the point.

## Adding a new platform

If there's no `PLATFORMS/<platform>.md` yet for what the SE wants, Claude creates one first — sourcing capabilities, API shapes, and visual identity from the vendor's official developer docs via WebFetch. Shared UI chrome lands in `components/platforms/<name>/` at the same time. See [`PLATFORMS/README.md`](./PLATFORMS/README.md) for the required sections.

## The one rule

**Don't mock capabilities the real platform doesn't support.** If an SE asks for a "real-time websocket feed of ServiceNow incidents," the mock pushes back — ServiceNow doesn't have one, customers poll the Table API or use outbound Business Rule webhooks. The refusal is the feature. A mock that simulates fake capabilities gets the customer burned during implementation and kills the deal and the relationship.

See [`SKILL.md`](./SKILL.md) § Refusal patterns for the scripted pushbacks.

## Deployment

Connected to Vercel. Every branch gets a preview URL of the form:

```
https://elementum-translator-<branch-hash>-<team>.vercel.app/demos/<slug>
```

Merging to `main` updates the stable URL. Never `git push` directly to `main` — always branch + PR.

## For new SEs joining the team

Read [`ONBOARDING.md`](./ONBOARDING.md). It walks through repo access, local setup, opening the project in Cowork, and the loop for building a mock for your first customer demo. Should take ~10 minutes end-to-end.

## For SE team leads

- The repo is intentionally single-product (platform translations for demos) and single-audience (Elementum SEs). Keep it that way; don't let it drift into "and also some prototypes" or "and also the real customer portals."
- The fidelity bar is non-negotiable. If you catch a mock that simulates something the real platform can't do, revert it and update the relevant `PLATFORMS/<name>.md` to prevent recurrence.
- Every PR should land with its `PLATFORMS/<name>.md` updates inline — if Claude learned something new about a platform while building, that finding needs to live in the platform file.
