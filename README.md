# Elementum Translator

A Next.js + Vercel repo where Elementum Sales Engineers **translate customer source-of-record platforms** (ServiceNow, Salesforce, Jira, SAP, Amazon Business, and friends) into grounded, fidelity-correct mock environments for demos.

Each mock is a self-contained folder under `app/demos/<slug>/` with its own UI pages, API routes, seed data, and an SE-facing README. Push a branch, Vercel spins up a live preview URL, the SE walks into the demo 30 minutes later.

## What's shipped

Five platform mocks are live and demo-ready end-to-end:

| Platform | Slug | Shape | Demo capability |
|----------|------|-------|-----------------|
| Salesforce Service Cloud | `salesforce-case-smoke` | REST + SOQL | Create + search Cases (Lightning chrome) |
| Jira Software | `jira-software-smoke` | REST | Create + search Issues (Atlassian chrome) |
| ServiceNow ITSM | `servicenow-itsm-exemplar` | OData-style Table API | Create + search Incidents |
| SAP S/4HANA | `sap-me5a-smoke` | OData v2 | Create + search Purchase Requisitions |
| Amazon Business | `amazon-punchout-smoke` | cXML-flavored JSON | Punchout cart hand-off + buyer-system requisition list |

All five support **dynamic submitter identity** — when an Elementum agent calls these mocks with a real user's email/name, records are attributed to that user instead of a default persona. Each mock also has defensive value handling for the api_task chip-resolution patterns documented in [`SKILL.md`](./SKILL.md).

## How it works

1. An SE opens this repo in Cowork and asks Claude something like *"build me a Workday HR mock for an onboarding demo Friday — need the worker record UI and the REST endpoint for creating a worker."*
2. Claude follows the 7-step protocol in [`SKILL.md`](./SKILL.md): clarify scope, fidelity-check against [`PLATFORMS/<platform>.md`](./PLATFORMS/), plan the mock, generate files under `app/demos/<slug>/`, commit on a feature branch, open a PR.
3. Vercel auto-deploys a preview URL from the branch.
4. The SE demos from the preview URL or merges to `main` for a stable one.

## Repo layout

```
elementum-translator/
├── SKILL.md                      # The operating procedure Claude follows
├── CLAUDE.md                     # Entry point for Claude sessions
├── DESIGN.md                     # Architectural philosophy
├── ONBOARDING.md                 # Setup guide for new SEs
├── PLATFORMS/
│   ├── README.md                 # Format for platform fidelity files
│   ├── amazon-business.md
│   ├── jira.md
│   ├── salesforce.md
│   ├── sap.md
│   └── servicenow.md
├── components/
│   └── platforms/
│       ├── amazon-business/      # Shared chrome per platform
│       ├── jira-shared/
│       ├── salesforce-shared/
│       ├── sap-shared/
│       └── servicenow/
├── app/
│   ├── page.tsx                  # Registry of available mocks
│   ├── layout.tsx                # Root layout
│   └── demos/
│       ├── amazon-punchout-smoke/
│       ├── jira-software-smoke/
│       ├── jsm-queue-smoke/
│       ├── salesforce-case-smoke/
│       ├── sap-me5a-smoke/
│       └── servicenow-itsm-exemplar/
└── vercel.json                   # Vercel deploy config
```

Each mock follows the same internal layout — `_lib/store.ts` for KV-backed state, `api/` matching the real platform's URL paths, `data/` for seed JSON, plus whichever UI routes the demo needs.

## Local development

```bash
npm install
npm run dev
# open http://localhost:3000
```

The landing page lists every available mock. Click through to a mock's landing page to see its UI surfaces and API endpoints.

Try the ServiceNow Table API exemplar:

```bash
curl 'http://localhost:3000/demos/servicenow-itsm-exemplar/api/now/table/incident?sysparm_query=active=true^priority=1' | jq
```

Try the SAP OData v2 list:

```bash
curl 'http://localhost:3000/demos/sap-me5a-smoke/api/sap/opu/odata/sap/API_PURCHASEREQ_PROCESS_SRV/PurchaseRequisitionHeader?$inlinecount=allpages' | jq '.d.__count'
```

## Adding a new translation

Don't write these by hand. Ask Claude in Cowork:

> Build me a Workday HR mock for an onboarding demo. Need the worker record UI and the REST endpoint for creating a worker.

Claude will follow the SKILL.md protocol, including pushing back if the scenario requires something the real platform can't actually do. That friction is the point.

## Adding a new platform

If there's no `PLATFORMS/<platform>.md` yet for what the SE wants, Claude creates one first — sourcing capabilities, API shapes, and visual identity from the vendor's official developer docs via WebFetch. Shared UI chrome lands in `components/platforms/<name>/` at the same time. See [`PLATFORMS/README.md`](./PLATFORMS/README.md) for the required sections.

## The non-negotiable rule

**Don't mock capabilities the real platform doesn't support.** If an SE asks for a "real-time websocket feed of ServiceNow incidents," the mock pushes back — ServiceNow doesn't have one, customers poll the Table API or use outbound Business Rule webhooks. The refusal is the feature. A mock that simulates fake capabilities gets the customer burned during implementation and kills the deal and the relationship.

See [`SKILL.md`](./SKILL.md) § Refusal patterns for the scripted pushbacks.

## Persistence (Vercel KV)

Every mock that mutates state (creates, updates) is backed by **Vercel KV** (Upstash Redis under the hood) so writes survive across cold starts and cross-function-instance routing. Each mock uses a unique key prefix (`servicenow-itsm-exemplar:incidents:v1`, `sap-me5a-smoke:prs:v1`, etc.) so they coexist in one KV instance without collisions.

Locally, mocks fall back to a `globalThis`-backed in-memory store when KV env vars aren't present — POSTs persist within a running dev server but reset between restarts. Good enough for local iteration; production demos rely on KV.

See each mock's README for KV setup specifics, or the JSM smoke's README for the canonical reference.

## Deployment

Connected to Vercel. Every branch gets a preview URL of the form:

```
https://elementum-translator-<branch-hash>-<team>.vercel.app/demos/<slug>
```

Merging to `main` updates the stable URL at `https://elementum-translator.vercel.app`. Never `git push` directly to `main` — always branch + PR.

## For new SEs joining the team

Read [`ONBOARDING.md`](./ONBOARDING.md). It walks through repo access, local setup, opening the project in Cowork, and the loop for building a mock for your first customer demo. Should take ~15 minutes end-to-end.

## For SE team leads

- The repo is intentionally single-product (platform translations for demos) and single-audience (Elementum SEs). Keep it that way; don't let it drift into "and also some prototypes" or "and also the real customer portals."
- The fidelity bar is non-negotiable. If you catch a mock that simulates something the real platform can't do, revert it and update the relevant `PLATFORMS/<name>.md` to prevent recurrence.
- Every PR should land with its `PLATFORMS/<name>.md` updates inline — if Claude learned something new about a platform while building, that finding needs to live in the platform file.
- Defensive patterns documented in `SKILL.md` § "Search/filter endpoints — defensive value handling" should be applied to every search/filter endpoint in every mock from the start. Don't burn a debugging cycle re-discovering the chip-resolution edge case.
