// JSM Customer Portal shell — completely different chrome from the agent
// view. Customer portals (https://<tenant>.atlassian.net/servicedesk/customer/...)
// have a minimal top header (service desk name + customer avatar + "Requests"
// link) and a centered, narrow content area. No left sidebar, no Create
// button, no JQL search — customers only see their own view.
//
// See PLATFORMS/jira.md § UI PATTERNS > JSM Customer Portal.

import type { ReactNode } from "react";
import { DemoBanner } from "@/components/platforms/jira-shared/DemoBanner";
import { jiraColors, jiraFont } from "@/components/platforms/jira-shared";

type PortalShellProps = {
  /** Service desk public-facing name, e.g., "Acme IT Help". */
  serviceDeskName: string;
  /** Tagline shown under the name on the landing page. */
  tagline?: string;
  /** Customer display name — shown in the top-right. */
  customerName?: string;
  children: ReactNode;
};

export function PortalShell({
  serviceDeskName,
  tagline,
  customerName = "Jane Davis",
  children,
}: PortalShellProps) {
  return (
    <div
      className="min-h-screen"
      style={{
        background: jiraColors.page,
        fontFamily: jiraFont.family,
        color: jiraColors.textPrimary,
      }}
    >
      <DemoBanner />
      {/* Portal header — brandable per service desk in real Jira. */}
      <header
        className="border-b bg-white"
        style={{ borderColor: jiraColors.divider }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded font-semibold text-white"
              style={{ background: jiraColors.brandBlue }}
              aria-hidden
            >
              IT
            </span>
            <div>
              <div
                className="text-[16px] font-semibold"
                style={{ color: jiraColors.textPrimary }}
              >
                {serviceDeskName}
              </div>
              {tagline && (
                <div
                  className="text-[12px]"
                  style={{ color: jiraColors.textSecondary }}
                >
                  {tagline}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-[13px]">
            <a
              href="#requests"
              className="hover:underline"
              style={{ color: jiraColors.textPrimary }}
            >
              Requests
            </a>
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full font-semibold text-white"
              style={{ background: jiraColors.brandBlueBold, fontSize: 12 }}
              aria-label={customerName}
            >
              {customerName
                .split(/\s+/)
                .slice(0, 2)
                .map((w) => w[0]!.toUpperCase())
                .join("")}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
