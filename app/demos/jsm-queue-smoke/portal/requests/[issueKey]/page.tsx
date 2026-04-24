// Customer-facing detail view for a single request.
//
// This is where `_mockViewUrl` from the POST /rest/servicedeskapi/request
// response points. When an Elementum automation templates the mock URL into
// a chat/email reply, the end user clicks through and lands here — so this
// page has to look credible as the "my request" page a real JSM customer
// would see.
//
// Real JSM URL shape for the equivalent page:
//   https://<tenant>.atlassian.net/servicedesk/customer/portal/<portalId>/<issueKey>
// We simplify to /portal/requests/[issueKey] because the mock only hosts one
// service desk.
//
// Fidelity anchor: PLATFORMS/jira.md § UI PATTERNS > JSM Customer Portal.

import { notFound } from "next/navigation";
import {
  PortalShell,
} from "@/components/platforms/jira-service-management";
import {
  jiraColors,
  jiraFont,
  StatusPill,
  IssueKey,
  AccountChip,
} from "@/components/platforms/jira-shared";
import { getRequestByKey } from "../../../_lib/store";
import { serviceDesk, requestTypes } from "../../../data/requests";

export const dynamic = "force-dynamic";

export default async function PortalRequestDetailPage({
  params,
}: {
  params: Promise<{ issueKey: string }>;
}) {
  const { issueKey } = await params;
  const req = await getRequestByKey(issueKey);
  if (!req) notFound();

  const requestType = requestTypes.find((rt) => rt.id === req.requestTypeId);

  return (
    <PortalShell
      serviceDeskName={serviceDesk.name}
      tagline={serviceDesk.portalTagline}
      customerName={req.reporter?.displayName ?? "Portal Customer"}
    >
      <div style={{ fontFamily: jiraFont.family }}>
        <div className="mb-1 text-[12px]" style={{ color: jiraColors.textSecondary }}>
          <a
            href="/demos/jsm-queue-smoke/portal"
            className="hover:underline"
            style={{ color: jiraColors.brandBlue }}
          >
            {serviceDesk.name}
          </a>
          {" / "}
          {requestType?.name ?? "Request"}
          {" / "}
          <IssueKey issueKey={req.key} />
        </div>

        <h1
          className="mb-2 text-[24px] font-semibold"
          style={{ color: jiraColors.textPrimary }}
        >
          {req.summary}
        </h1>

        <div className="mb-6 flex items-center gap-2">
          <StatusPill
            name={req.status.name}
            category={req.status.category}
          />
          <span
            className="text-[12px]"
            style={{ color: jiraColors.textSecondary }}
          >
            Created {req.createdText}
          </span>
        </div>

        {/* Description ---------------------------------------------------- */}
        <section
          className="mb-6 rounded border bg-white p-4"
          style={{ borderColor: jiraColors.divider }}
        >
          <h2
            className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: jiraColors.textSecondary }}
          >
            Description
          </h2>
          <p
            className="whitespace-pre-line text-[14px] leading-relaxed"
            style={{ color: jiraColors.textPrimary }}
          >
            {req.description || (
              <span style={{ color: jiraColors.textSecondary }}>
                No description provided.
              </span>
            )}
          </p>
        </section>

        {/* Details -------------------------------------------------------- */}
        <section
          className="mb-6 rounded border bg-white p-4"
          style={{ borderColor: jiraColors.divider }}
        >
          <h2
            className="mb-3 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: jiraColors.textSecondary }}
          >
            Details
          </h2>
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
            <dt style={{ color: jiraColors.textSecondary }}>Reporter</dt>
            <dd>
              {req.reporter && (
                <AccountChip
                  accountId={req.reporter.accountId}
                  displayName={req.reporter.displayName}
                  size={22}
                />
              )}
            </dd>
            <dt style={{ color: jiraColors.textSecondary }}>Assignee</dt>
            <dd>
              {req.assignee ? (
                <AccountChip
                  accountId={req.assignee.accountId}
                  displayName={req.assignee.displayName}
                  size={22}
                />
              ) : (
                <span style={{ color: jiraColors.textSecondary }}>
                  Unassigned
                </span>
              )}
            </dd>
            <dt style={{ color: jiraColors.textSecondary }}>Request type</dt>
            <dd style={{ color: jiraColors.textPrimary }}>
              {requestType?.icon} {requestType?.name ?? req.requestTypeId}
            </dd>
            <dt style={{ color: jiraColors.textSecondary }}>Priority</dt>
            <dd style={{ color: jiraColors.textPrimary }}>{req.priority}</dd>
          </dl>
        </section>

        {/* Activity ------------------------------------------------------- */}
        <section>
          <h2
            className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: jiraColors.textSecondary }}
          >
            Activity
          </h2>
          {req.comments.length === 0 ? (
            <p
              className="rounded border bg-white p-3 text-[13px]"
              style={{
                borderColor: jiraColors.divider,
                color: jiraColors.textSecondary,
              }}
            >
              No activity yet. An agent will respond shortly.
            </p>
          ) : (
            <ul className="space-y-3">
              {req.comments
                .filter((c) => !c.internal)
                .map((c, idx) => (
                  <li
                    key={idx}
                    className="rounded border bg-white p-3"
                    style={{ borderColor: jiraColors.divider }}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <AccountChip
                        accountId={c.accountId}
                        displayName={c.displayName}
                        size={20}
                      />
                      <span
                        className="text-[11px]"
                        style={{ color: jiraColors.textSecondary }}
                      >
                        {c.at}
                      </span>
                    </div>
                    <p
                      className="text-[13px]"
                      style={{ color: jiraColors.textPrimary }}
                    >
                      {c.body}
                    </p>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
