// Client-side Service Cloud Cases list view.
//
// Receives serialized Cases from the server component `page.tsx`, owns the
// list-view picker state, status filter, and search box. Split out of
// page.tsx because page.tsx is now a Server Component that reads from
// _lib/store.ts, and event handlers can't cross the server/client boundary.
//
// Pairs with the canonical Case detail page at
// /lightning/r/Case/<Id>/view — clicking a row routes there via Next.js
// client navigation. Same URL `_mockViewUrl` from the create API points at,
// so the SE can verify both paths land on the same screen.
//
// Fidelity anchor: PLATFORMS/salesforce.md § UI PATTERNS > List view +
// § VISUAL IDENTITY (SLDS 1).

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LightningShell,
  ObjectIcon,
  StatusBadge,
  UserChip,
  salesforceColors,
  salesforceFont,
  type LightningAppTab,
  type StatusBadgeTone,
} from "@/components/platforms/salesforce-shared";
import type { SalesforceCase, SalesforceCaseStatus } from "./data/types";

type CaseListClientProps = {
  rows: SalesforceCase[];
};

/** The only nav tabs we render in the Service app shell. Real Service Cloud
 *  apps include Files, Chatter, Reports, Dashboards too — we trim to the
 *  set Service Cloud SEs typically demo. */
const SERVICE_APP_TABS: LightningAppTab[] = [
  { id: "home", label: "Home" },
  { id: "cases", label: "Cases", active: true },
  { id: "accounts", label: "Accounts" },
  { id: "contacts", label: "Contacts" },
  { id: "reports", label: "Reports" },
  { id: "dashboards", label: "Dashboards" },
];

/** List-view picker options. Real Salesforce ships system list views ("All
 *  Cases", "My Cases", "Recently Viewed", "Closed Cases") plus user/admin
 *  ones; we mock the standard set so the picker dropdown isn't suspiciously
 *  bare. */
const LIST_VIEWS = [
  { id: "all", label: "All Open Cases" },
  { id: "my", label: "My Cases" },
  { id: "recently-viewed", label: "Recently Viewed" },
  { id: "all-cases", label: "All Cases" },
] as const;

const STATUS_TONE: Record<SalesforceCaseStatus, StatusBadgeTone> = {
  New: "info",
  Working: "neutral",
  Escalated: "warning",
  Closed: "success",
};

const PRIORITY_TONE: Record<string, StatusBadgeTone> = {
  Low: "neutral",
  Medium: "info",
  High: "error",
};

export function CaseListClient({ rows: allRows }: CaseListClientProps) {
  const router = useRouter();
  const [listView, setListView] = useState<(typeof LIST_VIEWS)[number]["id"]>(
    "all",
  );
  const [search, setSearch] = useState("");

  // Apply the selected list-view filter, then any free-text search. List
  // views are a real Salesforce concept; the smoke implements a sensible
  // subset:
  //   - All Open Cases  → IsClosed = false
  //   - My Cases        → OwnerName = "Sam Rivera" (the current user)
  //   - Recently Viewed → 5 most recent
  //   - All Cases       → no filter
  const rows = useMemo(() => {
    let out = allRows;
    if (listView === "all") {
      out = out.filter((c) => !c.IsClosed);
    } else if (listView === "my") {
      out = out.filter((c) => c.OwnerName === "Sam Rivera");
    } else if (listView === "recently-viewed") {
      out = out.slice(0, 5);
    }

    if (search) {
      const needle = search.toLowerCase();
      out = out.filter(
        (c) =>
          c.Subject.toLowerCase().includes(needle) ||
          c.CaseNumber.toLowerCase().includes(needle) ||
          (c.AccountName ?? "").toLowerCase().includes(needle) ||
          (c.ContactName ?? "").toLowerCase().includes(needle),
      );
    }
    return out;
  }, [allRows, listView, search]);

  return (
    <LightningShell
      myDomain="acme"
      appName="Service Console"
      appTabs={SERVICE_APP_TABS}
      userName="Sam Rivera"
    >
      <ListHeader
        listView={listView}
        onListViewChange={(v) => setListView(v)}
        rowCount={rows.length}
      />
      <ActionRow search={search} onSearchChange={setSearch} />
      <CaseTable
        rows={rows}
        onOpen={(c) =>
          router.push(`/demos/salesforce-case-smoke/lightning/r/Case/${c.Id}/view`)
        }
      />
    </LightningShell>
  );
}

// ---- List header -----------------------------------------------------------

type ListHeaderProps = {
  listView: (typeof LIST_VIEWS)[number]["id"];
  onListViewChange: (v: (typeof LIST_VIEWS)[number]["id"]) => void;
  rowCount: number;
};

function ListHeader({ listView, onListViewChange, rowCount }: ListHeaderProps) {
  const current = LIST_VIEWS.find((v) => v.id === listView) ?? LIST_VIEWS[0];
  return (
    <header
      className="mb-4 flex items-center gap-3"
      style={{ fontFamily: salesforceFont.family }}
    >
      <ObjectIcon entity="Case" size={32} />
      <div className="min-w-0 flex-1">
        <div
          className="text-[11px]"
          style={{ color: salesforceColors.textWeak }}
        >
          Cases
        </div>
        <div className="flex items-center gap-2">
          <select
            value={listView}
            onChange={(e) =>
              onListViewChange(
                e.target.value as (typeof LIST_VIEWS)[number]["id"],
              )
            }
            className="appearance-none rounded border bg-white px-2 py-1 text-[18px] font-bold"
            style={{
              borderColor: salesforceColors.border,
              color: salesforceColors.textHeading,
            }}
            aria-label="List view"
          >
            {LIST_VIEWS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
          <span
            className="text-[12px]"
            style={{ color: salesforceColors.textWeak }}
          >
            {rowCount} item{rowCount === 1 ? "" : "s"} · {current.label}
          </span>
        </div>
      </div>
    </header>
  );
}

// ---- Action row ------------------------------------------------------------

function ActionRow({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
}) {
  return (
    <div
      className="mb-3 flex items-center justify-between gap-3 rounded-t border bg-white px-3 py-2"
      style={{
        borderColor: salesforceColors.border,
        fontFamily: salesforceFont.family,
      }}
    >
      <div className="flex items-center gap-1.5">
        {/* New / Import / Change Owner — visual only on the smoke. Real
            Salesforce wires "New" to the create modal; we leave it as
            chrome to avoid a second, redundant "create case" path. */}
        {["New", "Import", "Change Owner"].map((label, i) => (
          <button
            key={label}
            type="button"
            className="rounded border px-2.5 py-1 text-[12px] hover:bg-neutral-50"
            style={{
              borderColor: salesforceColors.border,
              background: salesforceColors.surface,
              color: salesforceColors.textLink,
              fontWeight: i === 0 ? 700 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search this list…"
          className="rounded border px-2 py-1 text-[12px]"
          style={{
            borderColor: salesforceColors.border,
            color: salesforceColors.textBody,
            minWidth: 240,
          }}
        />
        {/* View switcher icons — visual only. Real Salesforce toggles between
            Table / Kanban / Split here. */}
        {["▦", "▤", "▥"].map((icon) => (
          <button
            key={icon}
            type="button"
            aria-label={`view ${icon}`}
            className="rounded p-1 hover:bg-neutral-100"
            style={{ color: salesforceColors.textWeak }}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Case table ------------------------------------------------------------

type CaseTableProps = {
  rows: SalesforceCase[];
  onOpen: (c: SalesforceCase) => void;
};

function CaseTable({ rows, onOpen }: CaseTableProps) {
  return (
    <div
      className="overflow-hidden rounded-b border border-t-0 bg-white"
      style={{
        borderColor: salesforceColors.border,
        fontFamily: salesforceFont.family,
      }}
    >
      <table className="w-full text-[13px]">
        <thead>
          <tr
            className="text-left"
            style={{
              background: "#FAFAF9",
              color: salesforceColors.textWeak,
              borderBottom: `1px solid ${salesforceColors.border}`,
            }}
          >
            <Th width="110px">Case Number</Th>
            <Th width="320px">Subject</Th>
            <Th width="110px">Status</Th>
            <Th width="100px">Priority</Th>
            <Th width="160px">Date/Time Opened</Th>
            <Th width="170px">Account Name</Th>
            <Th width="160px">Contact Name</Th>
            <Th width="170px">Case Owner Alias</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="px-3 py-12 text-center"
                style={{ color: salesforceColors.textWeak }}
              >
                No items match your filter.
              </td>
            </tr>
          ) : (
            rows.map((c) => (
              <tr
                key={c.Id}
                onClick={() => onOpen(c)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen(c);
                  }
                }}
                tabIndex={0}
                className="cursor-pointer hover:bg-neutral-50"
                style={{
                  borderBottom: `1px solid ${salesforceColors.border}`,
                  color: salesforceColors.textBody,
                }}
              >
                <td className="px-3 py-2">
                  {/* Render CaseNumber as link-styled text. We don't use
                      <RecordKey> here because <RecordKey> is a <button> and
                      nesting a button inside a clickable <tr> creates a
                      duplicate event target — clicks would fire twice. The
                      whole row handles the route, so the cell stays declarative. */}
                  <span
                    style={{
                      color: salesforceColors.textLink,
                      fontFamily: salesforceFont.familyMono,
                      fontSize: "12px",
                    }}
                  >
                    {c.CaseNumber}
                  </span>
                </td>
                <td
                  className="px-3 py-2"
                  style={{ color: salesforceColors.textBody }}
                >
                  <span className="block max-w-[300px] truncate">
                    {c.Subject}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <StatusBadge
                    label={c.Status}
                    tone={STATUS_TONE[c.Status]}
                    withDot
                  />
                </td>
                <td className="px-3 py-2">
                  <StatusBadge
                    label={c.Priority}
                    tone={PRIORITY_TONE[c.Priority] ?? "neutral"}
                  />
                </td>
                <td className="px-3 py-2">
                  {formatDateForList(c.CreatedDate)}
                </td>
                <td className="px-3 py-2">
                  {c.AccountName ? (
                    <span style={{ color: salesforceColors.textLink }}>
                      {c.AccountName}
                    </span>
                  ) : (
                    <span style={{ color: salesforceColors.textWeak }}>—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {c.ContactName ? (
                    <span style={{ color: salesforceColors.textLink }}>
                      {c.ContactName}
                    </span>
                  ) : (
                    <span style={{ color: salesforceColors.textWeak }}>—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <UserChip
                    accountId={c.OwnerId}
                    displayName={c.OwnerName}
                    size={20}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  width,
}: {
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <th
      scope="col"
      className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide"
      style={{ width, fontWeight: 700 }}
    >
      {children}
    </th>
  );
}

/**
 * Salesforce list views render `CreatedDate` like "4/23/2026, 1:32 PM" — local
 * time with a 12h clock. We do the same, falling back to the raw string if
 * parsing fails.
 */
function formatDateForList(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
