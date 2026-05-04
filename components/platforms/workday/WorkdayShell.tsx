// Workday shell — the outer chrome frame every Workday mock sits inside.
// Mirrors what Workday calls the "tenant home" frame: top bar (navy
// background with the orange wordmark on the left, global search center,
// app-launcher / inbox / notifications / avatar on the right), and a content
// area below.
//
// Anatomy (top to bottom):
//   - DemoBanner at the very top (non-negotiable per SKILL.md)
//   - Top bar (56px, navy): wordmark + tenant breadcrumb, centered search,
//     right-side icon cluster (apps / inbox / notifications / avatar)
//   - Optional breadcrumb row below the top bar
//   - Main content area — children render here, centered to contentMaxWidth
//
// This is shared between every Workday product surface (HCM home, Time Off,
// Expenses, etc.) because all of them sit on the same shell. Worklet-grids
// and worker profiles are content components, not chrome.
//
// Fidelity anchor: PLATFORMS/workday.md § UI PATTERNS > Home page +
// § VISUAL IDENTITY > Layout primitives.

import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, Inbox, Search } from "lucide-react";
import { DemoBanner } from "./DemoBanner";
import { workdayColors, workdayFont, workdayLayout } from "./design-tokens";

export type WorkdayBreadcrumb = {
  label: string;
  href?: string;
};

type WorkdayShellProps = {
  /** Tenant slug, e.g. "acme_dpt1" -> shown in the top-bar breadcrumb. */
  tenant?: string;
  /** Current worker's display name — drives avatar initials + tooltip. */
  workerName?: string;
  /** Optional position title shown next to the avatar in the top bar. */
  workerTitle?: string;
  /** Optional breadcrumb trail shown under the top bar. */
  breadcrumbs?: WorkdayBreadcrumb[];
  /** Inbox badge count. Shows a small red dot when > 0. */
  inboxCount?: number;
  /** Notifications badge count. */
  notificationsCount?: number;
  /** Optional handler for the App Launcher (waffle) icon — visual only by default. */
  onAppLauncher?: () => void;
  /** Main content area children. */
  children: ReactNode;
};

export function WorkdayShell({
  tenant = "acme_dpt1",
  workerName = "Alex Reeves",
  workerTitle,
  breadcrumbs,
  inboxCount = 0,
  notificationsCount = 0,
  onAppLauncher,
  children,
}: WorkdayShellProps) {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: workdayColors.page,
        color: workdayColors.textPrimary,
        fontFamily: workdayFont.family,
        fontSize: workdayFont.sizeBody,
      }}
    >
      <DemoBanner />
      <TopBar
        tenant={tenant}
        workerName={workerName}
        workerTitle={workerTitle}
        inboxCount={inboxCount}
        notificationsCount={notificationsCount}
        onAppLauncher={onAppLauncher}
      />
      {breadcrumbs && breadcrumbs.length > 0 && (
        <BreadcrumbRow breadcrumbs={breadcrumbs} />
      )}
      <main className="flex-1">
        <div
          style={{
            maxWidth: workdayLayout.contentMaxWidth,
            margin: "0 auto",
            paddingInline: workdayLayout.pagePaddingX,
            paddingBlock: workdayLayout.pagePaddingY,
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

// ── Top bar ─────────────────────────────────────────────────────────────────

type TopBarProps = {
  tenant: string;
  workerName: string;
  workerTitle?: string;
  inboxCount: number;
  notificationsCount: number;
  onAppLauncher?: () => void;
};

function TopBar({
  tenant,
  workerName,
  workerTitle,
  inboxCount,
  notificationsCount,
  onAppLauncher,
}: TopBarProps) {
  return (
    <header
      className="flex items-center justify-between px-4"
      style={{
        height: workdayLayout.topBarHeight,
        background: workdayColors.headerNavy,
        color: workdayColors.textOnDark,
      }}
    >
      {/* Left: wordmark + tenant breadcrumb */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="text-[18px] font-bold leading-none"
            style={{ color: workdayColors.brandOrange, letterSpacing: "-0.01em" }}
          >
            workday.
          </span>
        </Link>
        <span
          className="text-[11px]"
          style={{ color: workdayColors.textMuted }}
        >
          {tenant}
        </span>
      </div>

      {/* Center: global search */}
      <div
        className="flex flex-1 justify-center px-6"
        style={{ maxWidth: workdayLayout.searchBarMaxWidth, flex: "1 1 auto" }}
      >
        <div
          className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-[13px]"
          style={{
            background: "rgba(255, 255, 255, 0.10)",
            color: workdayColors.textOnDark,
          }}
        >
          <Search size={14} aria-hidden />
          <span style={{ opacity: 0.7 }}>Search</span>
        </div>
      </div>

      {/* Right: app launcher / inbox / notifications / avatar */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onAppLauncher}
          aria-label="App launcher"
          className="grid grid-cols-3 gap-0.5 rounded p-1.5 hover:bg-white/10"
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="h-1 w-1 rounded-full"
              style={{ background: workdayColors.textOnDark }}
            />
          ))}
        </button>
        <IconButton
          ariaLabel="Inbox"
          count={inboxCount}
          icon={<Inbox size={16} />}
        />
        <IconButton
          ariaLabel="Notifications"
          count={notificationsCount}
          icon={<Bell size={16} />}
        />
        {/* Avatar + name */}
        <div className="ml-2 flex items-center gap-2">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
            style={{
              background: workdayColors.brandOrange,
              color: workdayColors.textOnDark,
            }}
            aria-label={workerName}
            title={workerName}
          >
            {initials(workerName)}
          </span>
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-[12px] font-semibold">{workerName}</span>
            {workerTitle && (
              <span
                className="text-[10px]"
                style={{ color: workdayColors.textMuted }}
              >
                {workerTitle}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function IconButton({
  ariaLabel,
  count,
  icon,
}: {
  ariaLabel: string;
  count: number;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="relative rounded p-1.5 hover:bg-white/10"
      title={ariaLabel}
    >
      {icon}
      {count > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
          style={{
            background: workdayColors.brandOrange,
            color: workdayColors.textOnDark,
          }}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}

// ── Breadcrumb row ──────────────────────────────────────────────────────────

function BreadcrumbRow({
  breadcrumbs,
}: {
  breadcrumbs: WorkdayBreadcrumb[];
}) {
  return (
    <div
      className="border-b"
      style={{
        background: workdayColors.surface,
        borderColor: workdayColors.divider,
      }}
    >
      <div
        className="flex items-center gap-1.5 text-[12px]"
        style={{
          maxWidth: workdayLayout.contentMaxWidth,
          margin: "0 auto",
          paddingInline: workdayLayout.pagePaddingX,
          paddingBlock: 10,
        }}
      >
        {breadcrumbs.map((b, i) => (
          <span key={`${b.label}-${i}`} className="flex items-center gap-1.5">
            {b.href ? (
              <Link
                href={b.href}
                className="hover:underline"
                style={{ color: workdayColors.actionBlue }}
              >
                {b.label}
              </Link>
            ) : (
              <span style={{ color: workdayColors.textPrimary }}>
                {b.label}
              </span>
            )}
            {i < breadcrumbs.length - 1 && (
              <span style={{ color: workdayColors.textSecondary }}>/</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
