# PLATFORMS/

This folder is the **fidelity reference** for every mock in this repo. Before Claude (or any human) builds a mock of a platform, they MUST read the corresponding `PLATFORMS/<name>.md` file. If the file does not exist, it must be created first — the mock cannot be built without it.

The point of this folder is to keep us honest. An SE demo that shows a "ServiceNow feature" that ServiceNow cannot actually do is worse than no demo at all — the customer discovers the lie during implementation and trust dies. These files are the single source of truth for what each platform really supports.

## How to use these files

1. The `SKILL.md` (repo root) instructs Claude to consult the relevant `PLATFORMS/<name>.md` during **Step 2 — Fidelity check**.
2. For every feature a Sales Engineer asks for, Claude classifies it against the file:
   - `[REAL]` — documented capability, safe to mock
   - `[REAL-WITH-CAVEAT]` — supported but with caveats (rate limits, auth, pagination)
   - `[NOT-SUPPORTED]` — the real platform cannot do this; refuse or renegotiate scope
3. If the file does not cover a specific feature, Claude may `WebFetch` the vendor's official developer docs, and must write the finding back into this file with a source link.

**Never hallucinate API shapes or capabilities.** If it is not documented here or quotable from a vendor doc, it does not go into a mock.

## Required sections

Every `PLATFORMS/<name>.md` file must include, in order:

### 1. `# <Platform Name>`
Top-line: what this platform is, who uses it, what a "source of record" deployment of it looks like. One paragraph.

### 2. `## CAPABILITIES`
A feature inventory. Organize by functional area (Records / Data model, UI surfaces, Automation, Integration, Auth, Admin). For each line, say what the platform CAN do, not what it cannot. Keep it factual — no marketing language. This is the menu an SE can order from.

### 3. `## API SURFACE`
The real API shape. At minimum:
- Base URL pattern (with placeholders for tenant/instance names)
- Authentication (what headers, what flows)
- Each endpoint used in mocks: method, path, query params, request body shape, response envelope (byte-for-byte accurate for common success responses)
- Pagination model (offset, cursor, link header)
- Error envelope and common status codes
- Rate limits (actual documented numbers, with link)

Quote or link the vendor documentation. Do not paraphrase response shapes — copy them.

### 4. `## VISUAL IDENTITY`
Enough for a UI mock to look right on a screenshot at 10 feet:
- Primary brand color hex codes (with swatches if useful)
- Secondary/accent palette, status colors, neutral grays
- Typography (font family, sizes, weights used for nav / body / table cells)
- Iconography (which icon set the platform actually uses, with a CDN or package)
- Layout primitives (nav height, sidebar width, density)
- Link to a public screenshot or vendor UX doc if available

### 5. `## UI PATTERNS`
How the platform's screens are structured. Name each surface the platform calls by its real name (e.g., ServiceNow "Workspace," Salesforce "Lightning Experience," Jira "Issue View"). For each surface: what it contains, what a user does there, how it's arranged. This is what `components/platforms/<name>/` chrome should mimic.

### 6. `## AUTH`
Every auth mode the real platform supports, with the real flow:
- Basic / password (if supported)
- OAuth 2.0 (which grants — authorization code, client credentials, JWT bearer)
- API key / token
- SSO / SAML if relevant for integration demos
- Where the token/credential goes on a request (header name, format)

Note which mode is most common for integration work — that's the one mocks should default to.

### 7. `## KNOWN-IMPOSSIBLE`
The most important section. List things the platform CANNOT do, but that customers or SEs often assume it can. Each entry: the assumption, why it's wrong, the real alternative, a source link. This is what Claude quotes when refusing an infeasible demo request.

### 8. `## COMMON SE SCENARIOS`
Concrete demo shapes SEs ask for on this platform. For each:
- Scenario name
- What the SE typically wants to show
- Feasibility: `[REAL]` / `[REAL-WITH-CAVEAT]` / `[NOT-SUPPORTED]`
- Notes / workaround if caveat

### 9. `## HYGIENE`
Rules for mock data on this platform:
- Naming conventions used by the real platform (e.g., ServiceNow `sys_id`, Salesforce 15/18-char IDs, Jira `PROJECT-123` keys)
- What fake identifiers should look like so they pass a sniff test
- Any compliance red flags for this vertical (healthcare/PII/PCI, etc.) to avoid in seed data

### 10. `## SOURCES`
A flat bulleted list of the vendor documentation URLs referenced in this file. Each entry gets a short label. This is how we stay auditable when vendors change their APIs.

## Adding a new platform

1. Copy this README's section list as a skeleton into `PLATFORMS/<name>.md`.
2. Fill each section from the vendor's official developer portal via `WebFetch` — never from blog posts, third-party tutorials, or memory.
3. Cite every API shape with a source URL inline.
4. Add shared UI chrome under `components/platforms/<name>/` at the same time — the platform file documents the design tokens, the component folder implements them.
5. Open a PR with both the `PLATFORMS/<name>.md` and the chrome components together. These land in one commit.

## Keeping these files current

Vendors change their APIs. When a mock surfaces behavior that has drifted from the real platform, the fix is in the `PLATFORMS/<name>.md` file first, then in the mock. Do not patch mocks around stale platform files — update the platform file and re-derive.

If you used `WebFetch` to fill a gap during a mock build, write the finding back into the platform file in the same PR. The next SE building a mock of this platform should not have to re-fetch the same docs.
