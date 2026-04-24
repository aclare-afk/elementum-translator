// Client-side table wrapper for the incidents list view.
// Lives here (not in _lib) so it's colocated with the page that uses it.
// The page.tsx fetches data on the server and passes plain-data rows to this
// component, which owns the column render functions — functions can't cross
// the server→client component boundary, but the client component can define
// them locally and pass them to ListViewShell (also a client component).

"use client";

import {
  ListViewShell,
  RefLink,
  PriorityBadge,
  snowPriority,
  snowIncidentState,
  snowColors,
  type ListColumn,
  type ListBreadcrumb,
} from "@/components/platforms/servicenow";

export type IncidentRow = {
  sys_id: string;
  number: string;
  short_description: string;
  priority: string;
  state: string;
  opened_at: string;
  _assignedToName: string;
  _assignmentGroupName: string;
  _callerName: string;
};

type Props = {
  rows: IncidentRow[];
  breadcrumbs: ListBreadcrumb[];
};

export function IncidentsTable({ rows, breadcrumbs }: Props) {
  const columns: ListColumn<IncidentRow>[] = [
    {
      key: "number",
      label: "Number",
      width: "120px",
      render: (r) => (
        <RefLink href={`/demos/servicenow-itsm-exemplar/incidents/${r.sys_id}`}>
          {r.number}
        </RefLink>
      ),
    },
    {
      key: "short_description",
      label: "Short description",
      render: (r) => <span>{r.short_description}</span>,
    },
    {
      key: "priority",
      label: "Priority",
      width: "140px",
      render: (r) => {
        const p = snowPriority[r.priority as keyof typeof snowPriority];
        return p ? (
          <PriorityBadge code={r.priority} label={p.label} color={p.color} />
        ) : (
          r.priority
        );
      },
    },
    {
      key: "state",
      label: "State",
      width: "120px",
      render: (r) => (
        <span>
          {snowIncidentState[r.state as keyof typeof snowIncidentState] ??
            r.state}
        </span>
      ),
    },
    {
      key: "assignment_group",
      label: "Assignment group",
      width: "160px",
      render: (r) =>
        r._assignmentGroupName ? (
          <span>{r._assignmentGroupName}</span>
        ) : (
          <span style={{ color: snowColors.textMuted }}>—</span>
        ),
    },
    {
      key: "assigned_to",
      label: "Assigned to",
      width: "160px",
      render: (r) =>
        r._assignedToName ? (
          <span>{r._assignedToName}</span>
        ) : (
          <span style={{ color: snowColors.textMuted }}>(unassigned)</span>
        ),
    },
    {
      key: "opened_at",
      label: "Opened",
      width: "160px",
      render: (r) => (
        <span className="font-mono text-[12px]">{r.opened_at}</span>
      ),
    },
  ];

  return (
    <ListViewShell<IncidentRow>
      tableLabel="Incidents"
      tableName="incident"
      breadcrumbs={breadcrumbs}
      columns={columns}
      rows={rows}
      rowKey={(r) => r.sys_id}
      rowHref={(r) => `/demos/servicenow-itsm-exemplar/incidents/${r.sys_id}`}
    />
  );
}
