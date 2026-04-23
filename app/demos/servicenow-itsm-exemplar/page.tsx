// Landing page for the ServiceNow ITSM exemplar mock.
// Shows the SE what's in this demo and links to the main screens + APIs.

import Link from "next/link";
import { snowColors } from "@/components/platforms/servicenow";

export default function ServiceNowItsmLanding() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-semibold" style={{ color: snowColors.textPrimary }}>
        ITSM Exemplar — Incidents
      </h1>
      <p className="mt-2 text-sm" style={{ color: snowColors.textMuted }}>
        A minimal but fidelity-correct ServiceNow mock for L1 incident intake and
        assignment. The UI mirrors the classic Application Navigator + list +
        form surfaces, and the API matches the real{" "}
        <code className="rounded bg-neutral-100 px-1">/api/now/table/incident</code>{" "}
        shape byte-for-byte per{" "}
        <code className="rounded bg-neutral-100 px-1">PLATFORMS/servicenow.md</code>.
      </p>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: snowColors.textMuted }}>
          UI surfaces
        </h2>
        <ul
          className="divide-y rounded-sm border bg-white"
          style={{ borderColor: snowColors.divider }}
        >
          <li>
            <Link
              href="/demos/servicenow-itsm-exemplar/incidents"
              className="block px-4 py-3 hover:bg-neutral-50"
            >
              <div className="text-sm font-medium">Incidents list view</div>
              <div className="text-xs" style={{ color: snowColors.textMuted }}>
                Filterable grid at <code>/incidents</code>. Supports query params for Open / Critical / Assigned-to-me.
              </div>
            </Link>
          </li>
          <li>
            <Link
              href="/demos/servicenow-itsm-exemplar/incidents/46b66a40a9fe1981013806a3bd9d1a0e"
              className="block px-4 py-3 hover:bg-neutral-50"
            >
              <div className="text-sm font-medium">Incident form — INC0010001</div>
              <div className="text-xs" style={{ color: snowColors.textMuted }}>
                Single-record form with two-column layout, related lists, activity stream.
              </div>
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: snowColors.textMuted }}>
          API endpoints
        </h2>
        <ul
          className="divide-y rounded-sm border bg-white font-mono text-[12px]"
          style={{ borderColor: snowColors.divider }}
        >
          <li className="px-4 py-2.5">
            <span className="mr-2 inline-block w-12 rounded-sm bg-emerald-600 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
              GET
            </span>
            /api/now/table/incident
            <div
              className="ml-14 text-[11px] font-sans"
              style={{ color: snowColors.textMuted }}
            >
              List incidents. Supports sysparm_query, sysparm_limit, sysparm_offset, sysparm_fields.
            </div>
          </li>
          <li className="px-4 py-2.5">
            <span className="mr-2 inline-block w-12 rounded-sm bg-emerald-600 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
              POST
            </span>
            /api/now/table/incident
            <div
              className="ml-14 text-[11px] font-sans"
              style={{ color: snowColors.textMuted }}
            >
              Create incident. Returns 201 with {"{ result: {...} }"} envelope.
            </div>
          </li>
          <li className="px-4 py-2.5">
            <span className="mr-2 inline-block w-12 rounded-sm bg-emerald-600 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
              GET
            </span>
            /api/now/table/incident/&#123;sys_id&#125;
          </li>
          <li className="px-4 py-2.5">
            <span className="mr-2 inline-block w-12 rounded-sm bg-amber-600 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
              PATCH
            </span>
            /api/now/table/incident/&#123;sys_id&#125;
          </li>
          <li className="px-4 py-2.5">
            <span className="mr-2 inline-block w-12 rounded-sm bg-rose-600 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
              DEL
            </span>
            /api/now/table/incident/&#123;sys_id&#125;
          </li>
        </ul>
        <p className="mt-2 text-[11px]" style={{ color: snowColors.textMuted }}>
          See <code>README.md</code> in this folder for the SE demo script.
        </p>
      </section>
    </div>
  );
}
