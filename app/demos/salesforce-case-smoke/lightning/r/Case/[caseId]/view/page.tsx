// Salesforce Service Cloud — Case record page.
//
// Canonical share-link target. Real Salesforce URLs look like
// `https://<my-domain>.lightning.force.com/lightning/r/Case/<Id>/view`;
// the mock mirrors the suffix exactly so a chat reply containing the
// `_mockViewUrl` from the create API drops a customer straight onto this
// page. § HYGIENE > Identifiers + § UI PATTERNS > Record page.
//
// Server Component. Looks up the Case from the KV store
// (`_lib/store.ts`) so records freshly created via the REST API render
// here without a code-path branch. If the Case Id is unknown, we render
// a notFound() so Next.js returns a 404 rather than a half-rendered page.

import { notFound } from "next/navigation";
import Link from "next/link";
import { getCaseById, API_VERSION } from "../../../../../_lib/store";
import {
  LightningShell,
  RecordHighlights,
  DetailsGrid,
  RelatedList,
  StatusBadge,
  UserChip,
  salesforceColors,
  salesforceFont,
  type DetailSection,
  type LightningAppTab,
  type StatusBadgeTone,
  type RelatedRow,
} from "@/components/platforms/salesforce-shared";
import type {
  SalesforceCase,
  SalesforceCaseStatus,
} from "../../../../../data/types";
import { CaseTabs } from "./_CaseTabs";

export const dynamic = "force-dynamic";

const SERVICE_APP_TABS: LightningAppTab[] = [
  { id: "home", label: "Home" },
  { id: "cases", label: "Cases", active: true },
  { id: "accounts", label: "Accounts" },
  { id: "contacts", label: "Contacts" },
  { id: "reports", label: "Reports" },
  { id: "dashboards", label: "Dashboards" },
];

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

type PageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function CaseViewPage({ params }: PageProps) {
  const { caseId } = await params;
  const c = await getCaseById(caseId);

  if (!c) {
    notFound();
  }

  return (
    <LightningShell
      myDomain="acme"
      appName="Service Console"
      appTabs={SERVICE_APP_TABS}
      userName="Sam Rivera"
    >
      <Breadcrumb caseNumber={c.CaseNumber} />
      <div className="mb-3" />
      <RecordHighlights
        entity="Case"
        entityLabel="Case"
        recordName={c.Subject}
        compactFields={[
          { label: "Case Number", value: c.CaseNumber },
          {
            label: "Status",
            value: (
              <StatusBadge
                label={c.Status}
                tone={STATUS_TONE[c.Status]}
                withDot
              />
            ),
          },
          {
            label: "Priority",
            value: (
              <StatusBadge
                label={c.Priority}
                tone={PRIORITY_TONE[c.Priority] ?? "neutral"}
              />
            ),
          },
          { label: "Origin", value: c.Origin },
          {
            label: "Owner",
            value: (
              <UserChip
                accountId={c.OwnerId}
                displayName={c.OwnerName}
                size={20}
              />
            ),
          },
        ]}
        actions={[
          { label: "Edit", primary: true },
          { label: "Follow" },
          { label: "▾" },
        ]}
      />

      {/* Two-column body: left = tabs (Details/Related/etc.), right = related
          rail. Mirrors the standard Lightning Record Page 70/30 split on
          desktop. */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div>
          <CaseTabs sections={buildDetailSections(c)} />
        </div>
        <div className="flex flex-col gap-4">
          <ContactRail caseRecord={c} />
          <ApiTraceRail caseRecord={c} />
        </div>
      </div>
    </LightningShell>
  );
}

// ---- Breadcrumb ------------------------------------------------------------

function Breadcrumb({ caseNumber }: { caseNumber: string }) {
  return (
    <nav
      className="flex items-center gap-2 text-[12px]"
      style={{
        color: salesforceColors.textWeak,
        fontFamily: salesforceFont.family,
      }}
    >
      <Link
        href="/demos/salesforce-case-smoke"
        style={{ color: salesforceColors.textLink }}
      >
        Cases
      </Link>
      <span aria-hidden>›</span>
      <span style={{ color: salesforceColors.textBody }}>{caseNumber}</span>
    </nav>
  );
}

// ---- Detail sections -------------------------------------------------------

function buildDetailSections(c: SalesforceCase): DetailSection[] {
  return [
    {
      title: "Case Information",
      fields: [
        { label: "Case Number", value: c.CaseNumber },
        {
          label: "Owner",
          value: <UserChip accountId={c.OwnerId} displayName={c.OwnerName} />,
        },
        {
          label: "Status",
          value: (
            <StatusBadge
              label={c.Status}
              tone={STATUS_TONE[c.Status]}
              withDot
            />
          ),
          required: true,
          editable: true,
        },
        {
          label: "Priority",
          value: (
            <StatusBadge
              label={c.Priority}
              tone={PRIORITY_TONE[c.Priority] ?? "neutral"}
            />
          ),
          editable: true,
        },
        { label: "Origin", value: c.Origin },
        { label: "Reason", value: c.Reason ?? null },
        {
          label: "Subject",
          value: c.Subject,
          required: true,
          editable: true,
        },
        {
          label: "Description",
          value: (
            <span style={{ whiteSpace: "pre-wrap" }}>
              {c.Description}
            </span>
          ),
          editable: true,
        },
      ],
    },
    {
      title: "Contact Information",
      fields: [
        {
          label: "Contact Name",
          value: c.ContactName ?? null,
        },
        { label: "Contact Email", value: c.ContactEmail ?? null },
        {
          label: "Account Name",
          value: c.AccountName ?? null,
        },
      ],
    },
    {
      title: "System Information",
      fields: [
        { label: "Case Id", value: <Mono>{c.Id}</Mono> },
        { label: "Created Date", value: formatDate(c.CreatedDate) },
        { label: "Last Modified Date", value: formatDate(c.LastModifiedDate) },
        { label: "Is Closed", value: c.IsClosed ? "Yes" : "No" },
      ],
    },
  ];
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: salesforceFont.familyMono }}>{children}</span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ---- Right rail: contact summary -------------------------------------------

function ContactRail({ caseRecord }: { caseRecord: SalesforceCase }) {
  if (!caseRecord.ContactName && !caseRecord.AccountName) {
    return null;
  }

  const contactRows: RelatedRow[] = caseRecord.ContactName
    ? [
        {
          id: caseRecord.ContactId ?? "contact-row",
          cells: [
            <span
              key="name"
              style={{ color: salesforceColors.textLink }}
            >
              {caseRecord.ContactName}
            </span>,
            <span
              key="email"
              style={{ color: salesforceColors.textBody }}
            >
              {caseRecord.ContactEmail ?? "—"}
            </span>,
          ],
        },
      ]
    : [];

  return (
    <RelatedList
      entity="Contact"
      pluralLabel="Contacts (1)"
      totalCount={contactRows.length}
      columns={["Name", "Email"]}
      rows={contactRows}
    />
  );
}

// ---- Right rail: API trace -------------------------------------------------

/**
 * Non-standard rail card. Real Salesforce doesn't surface this — but for
 * a translation/demo workspace it's useful to give the SE a one-glance
 * view of WHERE this Case lives in the API surface, so a customer can
 * see the URL their Elementum automation would target. Documented in the
 * README as a demo-only affordance.
 */
function ApiTraceRail({ caseRecord }: { caseRecord: SalesforceCase }) {
  const recordPath = `/services/data/${API_VERSION}/sobjects/Case/${caseRecord.Id}`;
  return (
    <section
      className="rounded-[4px] border bg-white p-4"
      style={{
        borderColor: salesforceColors.border,
        fontFamily: salesforceFont.family,
      }}
    >
      <h3
        className="mb-2 text-[13px] font-bold uppercase tracking-wide"
        style={{ color: salesforceColors.textHeading }}
      >
        API Reference
      </h3>
      <dl className="flex flex-col gap-2 text-[12px]">
        <Row label="sObject">Case</Row>
        <Row label="Record URL">
          <code
            style={{
              fontFamily: salesforceFont.familyMono,
              color: salesforceColors.textBody,
              wordBreak: "break-all",
            }}
          >
            {recordPath}
          </code>
        </Row>
        <Row label="SOQL">
          <code
            style={{
              fontFamily: salesforceFont.familyMono,
              color: salesforceColors.textBody,
            }}
          >
            SELECT Id, Subject, Status FROM Case WHERE Id = &apos;
            {caseRecord.Id}&apos;
          </code>
        </Row>
      </dl>
      <p
        className="mt-2 text-[11px]"
        style={{ color: salesforceColors.textWeak }}
      >
        Demo-only rail — real Salesforce record pages don&apos;t surface this.
        Helpful for SEs explaining what an Elementum api_task targets.
      </p>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <dt
        className="text-[11px]"
        style={{ color: salesforceColors.textWeak }}
      >
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

// Re-export the section helper so the tab client can reuse it.
export { buildDetailSections, DetailsGrid };
