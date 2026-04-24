// JSM customer portal landing page — the other half of the JSM smoke.
//
// This renders the *customer-facing* chrome (PortalShell + RequestTypeTile),
// which is completely different from the agent queue at /demos/jsm-queue-smoke.
// In real Jira this lives at https://<tenant>.atlassian.net/servicedesk/
// customer/portal/<id>. There's no top nav, no left sidebar — just a centered
// tenant-branded header and a tile grid of request types.
//
// Fidelity anchor: PLATFORMS/jira.md § UI PATTERNS > JSM Customer Portal.

"use client";

import {
  PortalShell,
  RequestTypeTile,
} from "@/components/platforms/jira-service-management";
import {
  jiraColors,
  jiraFont,
} from "@/components/platforms/jira-shared";
import { requestTypes, serviceDesk } from "../data/requests";

export default function JsmPortalSmokePage() {
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
              onClick={(id) =>
                // Smoke — we don't route to a real request form. Just log.
                console.log(`Open request form for type ${id}`)
              }
            />
          ))}
        </div>

        <div
          className="mt-8 rounded border bg-white p-4 text-[13px]"
          style={{
            borderColor: jiraColors.divider,
            color: jiraColors.textSecondary,
          }}
        >
          Looking for something you already submitted? Go to{" "}
          <a
            href="#requests"
            className="underline"
            style={{ color: jiraColors.brandBlue }}
          >
            Requests
          </a>{" "}
          to see your open and resolved tickets.
        </div>
      </div>
    </PortalShell>
  );
}
