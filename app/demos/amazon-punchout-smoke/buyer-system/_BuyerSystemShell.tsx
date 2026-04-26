// Procurement Portal chrome.
//
// Generic on purpose: this is the "buyer system" half of the punchout flow
// (where carts land after Amazon returns them), but we don't tie it to any
// specific platform — SAP Ariba, Coupa, Workday, Oracle iProcurement all
// have a similar shape: dark-blue topbar, segmented nav, inset card surface,
// neutral typography. Branding it as Amazon would muddy the demo
// ("but the cart already came from Amazon?"), and branding it as Elementum
// would muddy the story ("our customer's procurement system is Elementum?").
// So we make it look like a credible internal procurement tool that nobody
// in particular built.
//
// Underscore prefix keeps Next.js from treating this as a route segment.

import Link from "next/link";
import type { ReactNode } from "react";

const portalColors = {
  topBar: "#1B3A57",
  topBarAccent: "#2C5985",
  page: "#F4F6F9",
  surface: "#FFFFFF",
  divider: "#E1E5EC",
  textPrimary: "#1F2A37",
  textSecondary: "#5A6675",
  link: "#1F5BB6",
  badgeBg: "#E8EEF7",
  badgeFg: "#1F5BB6",
} as const;

const portalFont = {
  family:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const;

export function BuyerSystemShell({
  children,
  breadcrumbs,
  buyerName = "ACME Corp",
  userName = "Sam Reeves",
}: {
  children: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  buyerName?: string;
  userName?: string;
}) {
  return (
    <div
      style={{
        backgroundColor: portalColors.page,
        fontFamily: portalFont.family,
        color: portalColors.textPrimary,
        minHeight: "100vh",
      }}
    >
      {/* Top bar -------------------------------------------------------- */}
      <header
        style={{
          backgroundColor: portalColors.topBar,
          color: "#FFFFFF",
          borderBottom: `2px solid ${portalColors.topBarAccent}`,
        }}
      >
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-3">
          <Link
            href="/demos/amazon-punchout-smoke/buyer-system"
            className="flex items-center gap-3"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded bg-white/15 text-[12px] font-bold tracking-wider">
              PP
            </div>
            <div>
              <div className="text-[14px] font-semibold leading-tight">
                Procurement Portal
              </div>
              <div className="text-[11px] leading-tight opacity-75">
                {buyerName} · Indirect Spend
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-5 text-[13px]">
            <Link
              href="/demos/amazon-punchout-smoke/buyer-system"
              className="opacity-90 hover:opacity-100"
            >
              Requisitions
            </Link>
            <span className="opacity-60">Approvals</span>
            <span className="opacity-60">Receipts</span>
            <span className="opacity-60">Suppliers</span>
            <span className="opacity-60">Reports</span>
          </nav>

          <div className="flex items-center gap-2 text-[12px]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-[11px] font-semibold">
              {initials(userName)}
            </div>
            <span className="opacity-90">{userName}</span>
          </div>
        </div>
      </header>

      {/* Breadcrumbs ---------------------------------------------------- */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div
          className="border-b"
          style={{
            backgroundColor: portalColors.surface,
            borderColor: portalColors.divider,
          }}
        >
          <div className="mx-auto max-w-[1200px] px-6 py-2 text-[12px]">
            {breadcrumbs.map((b, i) => (
              <span key={i}>
                {b.href ? (
                  <Link
                    href={b.href}
                    style={{ color: portalColors.link }}
                    className="hover:underline"
                  >
                    {b.label}
                  </Link>
                ) : (
                  <span style={{ color: portalColors.textSecondary }}>
                    {b.label}
                  </span>
                )}
                {i < breadcrumbs.length - 1 && (
                  <span
                    className="mx-2"
                    style={{ color: portalColors.textSecondary }}
                  >
                    /
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Body ----------------------------------------------------------- */}
      <main className="mx-auto max-w-[1200px] px-6 py-6">{children}</main>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone = statusTone(status);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: tone.bg, color: tone.fg }}
    >
      {status}
    </span>
  );
}

export function PortalCard({
  children,
  title,
  actions,
}: {
  children: ReactNode;
  title?: string;
  actions?: ReactNode;
}) {
  return (
    <section
      className="rounded border"
      style={{
        backgroundColor: portalColors.surface,
        borderColor: portalColors.divider,
      }}
    >
      {(title || actions) && (
        <header
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: portalColors.divider }}
        >
          {title && (
            <h2 className="text-[13px] font-semibold uppercase tracking-wide">
              {title}
            </h2>
          )}
          {actions}
        </header>
      )}
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

export const buyerSystemColors = portalColors;
export const buyerSystemFont = portalFont;

// ---- helpers -------------------------------------------------------------

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusTone(status: string): { bg: string; fg: string } {
  switch (status) {
    case "Approved":
      return { bg: "#DCFCE7", fg: "#166534" };
    case "Ordered":
      return { bg: "#DBEAFE", fg: "#1E40AF" };
    case "Received":
      return { bg: "#E0F2FE", fg: "#075985" };
    case "Pending Approval":
      return { bg: "#FEF3C7", fg: "#92400E" };
    case "Draft":
    default:
      return { bg: "#F3F4F6", fg: "#374151" };
  }
}
