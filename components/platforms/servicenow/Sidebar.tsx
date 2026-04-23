// ServiceNow Application Navigator — the iconic left rail.
// Source: PLATFORMS/servicenow.md § UI PATTERNS > Application Navigator.
// "240px wide, #293E40 background, white text, collapsible. Tree is grouped by
// Application with modules under each. Filter input at the top."

"use client";

import Link from "next/link";
import { useState } from "react";
import { snowColors, snowLayout, snowFont } from "./design-tokens";
import { ChevronDown, ChevronRight, Star, Clock, History } from "lucide-react";

export type SidebarModule = {
  label: string;
  href: string;
};

export type SidebarApplication = {
  label: string;
  modules: SidebarModule[];
  defaultOpen?: boolean;
};

type SidebarProps = {
  applications: SidebarApplication[];
};

export function Sidebar({ applications }: SidebarProps) {
  const [filter, setFilter] = useState("");
  const filterLower = filter.trim().toLowerCase();

  const filtered = applications
    .map((app) => {
      if (!filterLower) return app;
      const hit = app.label.toLowerCase().includes(filterLower);
      const modules = app.modules.filter((m) =>
        m.label.toLowerCase().includes(filterLower),
      );
      if (hit || modules.length > 0) {
        return { ...app, modules: hit ? app.modules : modules, defaultOpen: true };
      }
      return null;
    })
    .filter((a): a is SidebarApplication => a !== null);

  return (
    <aside
      className="flex shrink-0 flex-col overflow-hidden"
      style={{
        width: snowLayout.navWidth,
        background: snowColors.darkGreen,
        color: snowColors.textOnDark,
        fontFamily: snowFont.family,
        fontSize: snowFont.sizeNav,
      }}
    >
      {/* Filter row */}
      <div className="border-b border-white/10 p-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter navigator"
          className="w-full rounded-sm bg-black/30 px-2 py-1.5 text-xs text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-white/40"
        />
      </div>

      {/* View toggle strip (All / Favorites / History) — decorative only */}
      <div className="flex items-center justify-around border-b border-white/10 py-1.5 text-[10px] uppercase tracking-wide text-white/70">
        <button className="flex items-center gap-1 hover:text-white">
          <Star size={12} /> Favorites
        </button>
        <button className="flex items-center gap-1 text-white">
          <Clock size={12} /> All
        </button>
        <button className="flex items-center gap-1 hover:text-white">
          <History size={12} /> History
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {filtered.map((app) => (
          <AppGroup key={app.label} app={app} />
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-xs text-white/50">No matches.</div>
        )}
      </nav>
    </aside>
  );
}

function AppGroup({ app }: { app: SidebarApplication }) {
  const [open, setOpen] = useState<boolean>(app.defaultOpen ?? false);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[13px] font-medium hover:bg-white/5"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{app.label}</span>
      </button>
      {open && (
        <ul className="mb-1">
          {app.modules.map((m) => (
            <li key={m.href}>
              <Link
                href={m.href}
                className="block py-1 pl-9 pr-3 text-[12px] text-white/80 hover:bg-white/10 hover:text-white"
              >
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
