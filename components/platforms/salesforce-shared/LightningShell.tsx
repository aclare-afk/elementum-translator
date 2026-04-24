// LightningShell — the outer chrome frame that every Lightning Experience
// mock sits inside. Mirrors what Salesforce calls the "One.app" shell.
//
// Anatomy (top to bottom):
//   - DemoBanner at the very top (non-negotiable per SKILL.md)
//   - Global header (56px, white, bottom border): App Launcher 9-dot grid,
//     current app name, global search (center), favorites/help/setup/
//     notifications/avatar on the right
//   - App navigation bar (40px, white, bottom border): tabs scoped to the
//     current app (Home / Accounts / Opportunities / etc.)
//   - Main content area (page padding) — children render here
//   - Optional utility bar (36px, bottom-docked) for Service Console apps
//
// This is shared between Sales Cloud and Service Cloud mocks because both
// run on the same shell. Console-specific behavior (subtabs, Omni-Channel
// widget) goes in product-specific components like ServiceConsole.tsx.
//
// Fidelity anchor: PLATFORMS/salesforce.md § UI PATTERNS > Global shell.

import type { ReactNode } from "react";
import { DemoBanner } from "./DemoBanner";
import { salesforceColors, salesforceFont, salesforceLayout } from "./design-tokens";

export type LightningAppTab = {
  id: string;
  label: string;
  /** Marks the currently active tab with a brand-blue underline. */
  active?: boolean;
  /** Optional href for real navigation. Mocks typically leave undefined. */
  href?: string;
};

type LightningShellProps = {
  /** My Domain subdomain, e.g., "acme" -> acme.my.salesforce.com. Rendered in the top-right breadcrumb. */
  myDomain?: string;
  /** Name of the current Lightning app shown in the global header. */
  appName: string;
  /** Tabs shown in the 40px app nav bar. Exactly one should be `active: true`. */
  appTabs: LightningAppTab[];
  /** Current user's display name — drives the avatar initials + tooltip. */
  userName?: string;
  /** Main content area children. */
  children: ReactNode;
  /** Optional utility bar contents (Service Console). If omitted, the utility bar is suppressed. */
  utilityBar?: ReactNode;
  /** Optional handler for the App Launcher (9-dot) — smokes typically log. */
  onAppLauncher?: () => void;
};

export function LightningShell({
  myDomain = "acme",
  appName,
  appTabs,
  userName = "Jordan Lane",
  children,
  utilityBar,
  onAppLauncher,
}: LightningShellProps) {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: salesforceColors.page,
        fontFamily: salesforceFont.family,
        color: salesforceColors.textBody,
      }}
    >
      <DemoBanner />
      <GlobalHeader
        myDomain={myDomain}
        appName={appName}
        userName={userName}
        onAppLauncher={onAppLauncher}
      />
      <AppNavBar tabs={appTabs} />

      <main
        className="flex-1"
        style={{
          paddingInline: salesforceLayout.pagePaddingX,
          paddingBlock: salesforceLayout.pagePaddingY,
        }}
      >
        {children}
      </main>

      {utilityBar && <UtilityBar>{utilityBar}</UtilityBar>}
    </div>
  );
}

// ── Global header (56px) ─────────────────────────────────────────────────────

type GlobalHeaderProps = {
  myDomain: string;
  appName: string;
  userName: string;
  onAppLauncher?: () => void;
};

function GlobalHeader({
  myDomain,
  appName,
  userName,
  onAppLauncher,
}: GlobalHeaderProps) {
  return (
    <header
      className="flex items-center justify-between border-b px-3"
      style={{
        height: salesforceLayout.headerHeight,
        background: salesforceColors.headerBg,
        borderColor: salesforceColors.border,
      }}
    >
      <div className="flex items-center gap-3">
        {/* App Launcher (9-dot grid) */}
        <button
          type="button"
          onClick={onAppLauncher}
          aria-label="App Launcher"
          className="grid grid-cols-3 gap-0.5 rounded p-1.5 hover:bg-neutral-100"
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="h-1 w-1 rounded-[1px]"
              style={{ background: salesforceColors.textWeak }}
            />
          ))}
        </button>
        {/* Salesforce cloud logo */}
        <span
          aria-hidden
          className="inline-flex h-6 w-8 items-center justify-center rounded-[3px]"
          style={{ background: salesforceColors.brandBlue }}
        >
          <svg width="18" height="12" viewBox="0 0 24 16" aria-hidden>
            <path
              fill="#FFFFFF"
              d="M8 3a4 4 0 0 1 7.4-2.1A4.5 4.5 0 0 1 22 5a3.5 3.5 0 0 1-.7 6.8A3.6 3.6 0 0 1 17 14a4 4 0 0 1-7.5.6A3.5 3.5 0 0 1 3 10a3.5 3.5 0 0 1 2-3.2A4 4 0 0 1 8 3z"
            />
          </svg>
        </span>
        {/* Current app name */}
        <button
          type="button"
          className="flex items-center gap-1 rounded px-1.5 py-1 text-[15px] font-bold hover:bg-neutral-100"
          style={{ color: salesforceColors.textHeading }}
        >
          {appName}
          <span
            className="text-[11px]"
            style={{ color: salesforceColors.textWeak }}
          >
            ▾
          </span>
        </button>
      </div>

      {/* Global search */}
      <div className="flex max-w-xl flex-1 items-center px-6">
        <div
          className="flex w-full items-center gap-2 rounded border px-2 py-1.5 text-[13px]"
          style={{
            borderColor: salesforceColors.border,
            background: salesforceColors.surface,
            color: salesforceColors.textWeak,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
            <circle
              cx="7"
              cy="7"
              r="4.5"
              stroke="currentColor"
              fill="none"
              strokeWidth="1.5"
            />
            <path
              d="M10.5 10.5L14 14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span>Search...</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Favorites, Help, Setup, Notifications */}
        {["Favorites", "Help", "Setup", "Notifications"].map((label) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            className="rounded p-1.5 hover:bg-neutral-100"
          >
            <span
              aria-hidden
              className="block h-4 w-4 rounded-full border"
              style={{ borderColor: salesforceColors.textWeak }}
            />
          </button>
        ))}
        {/* Avatar */}
        <span
          className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-[3px] text-[11px] font-bold text-white"
          style={{ background: salesforceColors.brandBlueDark }}
          aria-label={userName}
          title={`${userName} · ${myDomain}.my.salesforce.com`}
        >
          {userName
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() ?? "")
            .join("") || "?"}
        </span>
      </div>
    </header>
  );
}

// ── App nav bar (40px) ───────────────────────────────────────────────────────

function AppNavBar({ tabs }: { tabs: LightningAppTab[] }) {
  return (
    <nav
      className="flex items-stretch gap-1 border-b px-3"
      style={{
        height: salesforceLayout.navHeight,
        background: salesforceColors.navBg,
        borderColor: salesforceColors.border,
      }}
    >
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={tab.href ?? "#"}
          className="flex items-center px-3 text-[13px]"
          style={{
            borderBottom: tab.active
              ? `3px solid ${salesforceColors.brandBlue}`
              : "3px solid transparent",
            color: tab.active
              ? salesforceColors.textHeading
              : salesforceColors.textBody,
            fontWeight: tab.active ? 700 : 400,
            marginBottom: -1,
          }}
          aria-current={tab.active ? "page" : undefined}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}

// ── Utility bar (36px, optional) ─────────────────────────────────────────────

function UtilityBar({ children }: { children: ReactNode }) {
  return (
    <footer
      className="flex items-center gap-2 border-t px-3 text-[12px]"
      style={{
        height: salesforceLayout.utilityBarHeight,
        background: salesforceColors.utilityBarBg,
        borderColor: salesforceColors.border,
      }}
    >
      {children}
    </footer>
  );
}
