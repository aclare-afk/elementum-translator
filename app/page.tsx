import Link from "next/link";

// Registry of platform translations in this workspace.
//
// Exactly one entry should be marked `featured: true` — that entry is the
// demo this SE is currently running, and it becomes the hero card that
// a customer lands on when they open the root URL. When Claude generates
// a new translation via the SKILL.md protocol, it sets `featured: true`
// on the new entry and clears it from whichever entry had it before.
//
// This file is intentionally hand-editable: the SE can also flip `featured`
// on their own to switch which demo the root URL surfaces — useful when
// running back-to-back demos for different customers off the same workspace.
const demos = [
  {
    slug: "jira-software-smoke",
    platform: "Jira Software",
    name: "Sprint 42 Board — Acme Web Platform",
    scenario:
      "Scrum board with 4 columns, WIP limits, 8 seeded issues across every priority + status category, epic-colored card borders, and a right-pane issue detail view.",
    status: "smoke" as const,
    featured: true,
  },
  {
    slug: "jsm-queue-smoke",
    platform: "Jira Service Management",
    name: "IT Help — Agent Queue",
    scenario:
      "Agent queue with 6 requests covering every SLA state (healthy / at risk / breached / paused / completed), SLA chips, and a pending-approval detail pane with Approve/Decline for the viewer.",
    status: "smoke" as const,
  },
  {
    slug: "jsm-queue-smoke/portal",
    platform: "Jira Service Management",
    name: "IT Help — Customer Portal",
    scenario:
      "Customer-facing portal landing page with tenant-branded header and request-type tile grid (Get help / Request hardware / Request access / Report outage). Same smoke, different chrome.",
    status: "smoke" as const,
  },
  {
    slug: "servicenow-itsm-exemplar",
    platform: "ServiceNow",
    name: "ITSM Exemplar — Incidents",
    scenario:
      "L1 intake → assignment → resolution. Mock Table API for incident records plus matching UI.",
    status: "example" as const,
  },
  {
    slug: "sap-me5a-smoke",
    platform: "SAP",
    name: "ME5A — List Display of Purchase Requisitions",
    scenario:
      "SAP GUI procurement transaction with selection screen, ALV grid, status dots, and 6 seed PRs. Exercises the shared SAP chrome.",
    status: "smoke" as const,
  },
  {
    slug: "amazon-punchout-smoke",
    platform: "Amazon Business",
    name: "Punchout Storefront",
    scenario:
      "Storefront with punchout session banner, 6 business-catalog products, Add-to-Cart, and Submit-to-Elementum cart return. Exercises the shared Amazon chrome.",
    status: "smoke" as const,
  },
];

type Demo = (typeof demos)[number];

// First featured entry wins; if none is marked, fall back to the first demo
// so the hero card never renders empty.
const featured: Demo = demos.find((d) => d.featured) ?? demos[0];
const others: Demo[] = demos.filter((d) => d.slug !== featured.slug);

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Elementum Translator
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Translates customer source-of-record platforms into grounded mock
          environments for SE demos. Every translation here is grounded in what
          the real platform can actually do — see{" "}
          <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
            SKILL.md
          </code>{" "}
          and{" "}
          <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
            PLATFORMS/
          </code>
          .
        </p>
      </header>

      {/* Featured demo — the hero card. This is the mock the SE is currently
          running; it's what a customer sees when they open the root URL. */}
      <section aria-labelledby="featured-heading" className="mb-10">
        <h2
          id="featured-heading"
          className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500"
        >
          Now demoing
        </h2>
        <Link
          href={`/demos/${featured.slug}`}
          className="block rounded-xl border-2 border-neutral-900 bg-white p-6 transition hover:bg-neutral-50"
        >
          <div className="flex items-center gap-2">
            <span className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
              {featured.platform}
            </span>
            <StatusBadge status={featured.status} />
          </div>
          <h3 className="mt-3 text-xl font-semibold text-neutral-900">
            {featured.name}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            {featured.scenario}
          </p>
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-neutral-900">
            Open demo
            <span aria-hidden>→</span>
          </div>
        </Link>
      </section>

      {/* All other translations available in this workspace. These are still
          navigable — the SE may want to show two platforms side-by-side or
          reference an older mock — but they don't compete with the hero. */}
      {others.length > 0 && (
        <section aria-labelledby="others-heading">
          <h2
            id="others-heading"
            className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500"
          >
            Other translations in this workspace
          </h2>
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {others.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/demos/${d.slug}`}
                  className="flex items-start justify-between gap-6 px-5 py-4 hover:bg-neutral-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                        {d.platform}
                      </span>
                      <StatusBadge status={d.status} />
                    </div>
                    <h3 className="mt-1.5 text-base font-medium text-neutral-900">
                      {d.name}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-600">
                      {d.scenario}
                    </p>
                  </div>
                  <div className="pt-1 text-xs text-neutral-400">→</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-12 border-t border-neutral-200 pt-6 text-xs text-neutral-500">
        Generated by the Elementum Translator skill. To add a new translation,
        open this repo in Cowork and ask Claude: <em>&quot;build me a
        &lt;platform&gt; mock for my &lt;scenario&gt; demo.&quot;</em> The new
        mock automatically becomes the featured demo on this page.
      </footer>
    </main>
  );
}

function StatusBadge({ status }: { status: Demo["status"] }) {
  if (status === "example") {
    return (
      <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
        example
      </span>
    );
  }
  return (
    <span className="rounded border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-700">
      smoke
    </span>
  );
}
