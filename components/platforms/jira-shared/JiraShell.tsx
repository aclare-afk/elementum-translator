// JiraShell — the outer chrome frame shared between Jira Software and Jira
// Service Management agent views. Renders:
//   - DemoBanner at the very top
//   - Global top nav (56px, white, 1px divider below)
//   - Two-pane body: left sidebar slot (240px) + content area
//
// The left sidebar is a slot, not a component, because the contents differ
// between products — Software shows Backlog/Board/Timeline/Releases/Reports,
// JSM shows Queues/Requests/Customers/Knowledge base/Assets. Mocks pass in
// <SoftwareSidebar /> or <JsmSidebar /> as the `sidebar` prop.
//
// See PLATFORMS/jira.md § VISUAL IDENTITY > Layout primitives and § UI
// PATTERNS for the anatomy this mirrors.

import type { ReactNode } from "react";
import { DemoBanner } from "./DemoBanner";
import { jiraColors, jiraFont, jiraLayout } from "./design-tokens";

type JiraShellProps = {
  /** Tenant subdomain for the breadcrumb label, e.g., "acme" -> acme.atlassian.net. */
  tenant?: string;
  /** Which Atlassian product this view is rendering. Drives the product-name badge. */
  product: "Jira Software" | "Jira Service Management";
  /** Current user's display name (shown in the top-right avatar+name). */
  userName?: string;
  /** Left-sidebar contents. Typically <SoftwareSidebar /> or <JsmSidebar />. */
  sidebar: ReactNode;
  /** Main content area. */
  children: ReactNode;
  /** Top-right Create button — handler is optional; when omitted the button is visual only. */
  onCreate?: () => void;
};

export function JiraShell({
  tenant = "acme",
  product,
  userName = "Jane Davis",
  sidebar,
  children,
  onCreate,
}: JiraShellProps) {
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
      <TopNav
        tenant={tenant}
        product={product}
        userName={userName}
        onCreate={onCreate}
      />
      <div className="flex">
        <aside
          className="shrink-0 border-r"
          style={{
            width: jiraLayout.sidebarWidth,
            background: jiraColors.sidebarBg,
            borderColor: jiraColors.divider,
            minHeight: `calc(100vh - ${jiraLayout.topNavHeight}px)`,
          }}
        >
          {sidebar}
        </aside>
        <main className="min-w-0 flex-1" style={{ padding: jiraLayout.pagePadding }}>
          {children}
        </main>
      </div>
    </div>
  );
}

type TopNavProps = {
  tenant: string;
  product: "Jira Software" | "Jira Service Management";
  userName: string;
  onCreate?: () => void;
};

function TopNav({ tenant, product, userName, onCreate }: TopNavProps) {
  return (
    <header
      className="flex items-center justify-between border-b px-4"
      style={{
        height: jiraLayout.topNavHeight,
        background: jiraColors.topNavBg,
        borderColor: jiraColors.divider,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Atlassian 9-dot product switcher (visual only) */}
        <button
          type="button"
          className="grid grid-cols-3 gap-0.5 rounded p-1.5 hover:bg-neutral-100"
          aria-label="Switch Atlassian product"
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="h-1 w-1 rounded-full"
              style={{ background: jiraColors.textSecondary }}
            />
          ))}
        </button>
        {/* Jira wordmark */}
        <div className="flex items-center gap-1.5">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
            <path
              fill={jiraColors.brandBlue}
              d="M11.53 2L5.5 8.03a2 2 0 0 0 0 2.82L11.53 16.9l6.03-6.05a2 2 0 0 0 0-2.82L11.53 2zm0 8.97l-3-3 3-3 3 3-3 3z"
            />
            <path
              fill={jiraColors.brandBlue}
              opacity="0.5"
              d="M11.53 9.11L8.5 12.13l3.03 3.03 3.03-3.03-3.03-3.02z"
            />
          </svg>
          <span
            className="text-[15px] font-semibold"
            style={{ color: jiraColors.textPrimary }}
          >
            {product}
          </span>
        </div>
        {/* Nav item row (visual only — real Jira has Your work / Projects / Filters / Dashboards / People) */}
        <nav className="ml-4 flex items-center gap-1 text-[13px]">
          {["Your work", "Projects", "Filters", "Dashboards", "People"].map((label) => (
            <button
              key={label}
              type="button"
              className="rounded px-2 py-1 hover:bg-neutral-100"
              style={{ color: jiraColors.textPrimary }}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCreate}
          className="rounded px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90"
          style={{ background: jiraColors.brandBlue }}
        >
          Create
        </button>
        {/* Search */}
        <div
          className="flex items-center gap-1.5 rounded border px-2 py-1 text-[12px]"
          style={{
            borderColor: jiraColors.divider,
            color: jiraColors.textSecondary,
            width: 180,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden>
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" fill="none" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Search</span>
        </div>
        {/* Icon buttons (visual only) */}
        {["Notifications", "Help"].map((label) => (
          <button
            key={label}
            type="button"
            className="rounded p-1.5 hover:bg-neutral-100"
            aria-label={label}
            style={{ color: jiraColors.textSecondary }}
          >
            <span className="block h-4 w-4 rounded-full border" style={{ borderColor: "currentColor" }} />
          </button>
        ))}
        {/* Tenant subdomain (visual breadcrumb) */}
        <span
          className="ml-1 text-[11px]"
          style={{ color: jiraColors.textSecondary }}
        >
          {tenant}.atlassian.net
        </span>
        {/* Avatar */}
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white"
          style={{ background: jiraColors.brandBlueBold }}
          aria-label={userName}
        >
          {userName
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0]!.toUpperCase())
            .join("")}
        </span>
      </div>
    </header>
  );
}
