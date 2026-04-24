// JSM customer portal landing page — the other half of the JSM smoke.
//
// This renders the *customer-facing* chrome (PortalShell + RequestTypeTile),
// which is completely different from the agent queue at /demos/jsm-queue-smoke.
// In real Jira this lives at https://<tenant>.atlassian.net/servicedesk/
// customer/portal/<id>. There's no top nav, no left sidebar — just a centered
// tenant-branded header, a tile grid of request types, and a list of the
// customer's own recent requests.
//
// Server component: pulls recent requests from the in-memory store so records
// created via `POST /rest/servicedeskapi/request` appear here alongside seeds.
//
// Fidelity anchor: PLATFORMS/jira.md § UI PATTERNS > JSM Customer Portal.

import Link from "next/link";
import {
  PortalShell,
  RequestTypeTile,
} from "@/components/platforms/jira-service-management";
import {
  jiraColors,
  jiraFont,
  StatusPill,
  IssueKey,
} from "@/components/platforms/jira-shared";
import { requestTypes, serviceDesk } from "../data/requests";
import { listRequests } from "../_lib/store";

export const dynamic = "force-dynamic";

export default function JsmPortalSmokePage() {
  // Show the 5 most recent requests. Real JSM portals scope this to the
  // signed-in customer's own requests; we don't have a real auth layer in
  // the mock, so we show all recent as if they all belonged to the viewer.
  const recent = listRequests().slice(0, 5);

  return (
    <PortalShell
      serviceDeskName={serviceDesk.name}
      tagline={serviceDesk.portalTagline}
      customerName="Jane Davis"
    >
      <div style={{ fontFamily: jiraFont.family }}>
        <div className="mb-8">
          <h1
            className="text-[28px] font-semibold"
            style={{ color: jiraColors.textPrimary }}
          >
            Welcome to {serviceDesk.name}
          </h1>
          <p
            className="mt-1 text-[14px]"
            style={{ color: jiraColors.textSecondary }}
          >
            {serviceDesk.portalTagline} Pick what you need help with below.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {requestTypes.map((rt) => (
            <RequestTypeTile
              key={rt.id}
              id={rt.id}
              name={rt.name}
              description={rt.description}
              icon={rt.icon}
            />
          ))}
        </div>

        {/* My requests — populated from the store. Records created via
            POST /rest/servicedeskapi/request show up here once the SE's
            Elementum automation has fired. */}
        <section id="requests" className="mt-10">
          <h2
            className="mb-3 text-[16px] font-semibold"
            style={{ color: jiraColors.textPrimary }}
          >
            My recent requests
          </h2>
          {recent.length === 0 ? (
            <p
              className="rounded border bg-white p-4 text-[13px]"
              style={{
                borderColor: jiraColors.divider,
                color: jiraColors.textSecondary,
              }}
            >
              You haven&apos;t submitted any requests yet.
            </p>
          ) : (
            <ul
              className="divide-y rounded border bg-white"
              style={{ borderColor: jiraColors.divider }}
            >
              {recent.map((r) => (
                <li key={r.key}>
                  <Link
                    href={`/demos/jsm-queue-smoke/portal/requests/${r.key}`}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <IssueKey issueKey={r.key} />
                        <StatusPill
                          name={r.status.name}
                          category={r.status.category}
                        />
                      </div>
                      <div
                        className="truncate text-[13px]"
                        style={{ color: jiraColors.textPrimary }}
                      >
                        {r.summary}
                      </div>
                    </div>
                    <span
                      className="shrink-0 text-[12px]"
                      style={{ color: jiraColors.textSecondary }}
                    >
                      {r.createdText}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
