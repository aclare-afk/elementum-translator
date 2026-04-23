// Incidents list view.
// Uses ListViewShell from the shared ServiceNow chrome. Filters come from
// query-string params to match the way real ServiceNow navigator modules are
// just list views with a baked-in breadcrumb filter.

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
import {
  listIncidents,
  getUser,
  getGroup,
  type StoredIncident,
} from "../_lib/db";

type Row = StoredIncident & {
  _assignedToName: string;
  _assignmentGroupName: string;
  _callerName: string;
};

type SearchParams = Promise<{
  state?: string;
  priority?: string;
  mine?: string;
}>;

export default async function IncidentsList({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  let rows = listIncidents();

  const breadcrumbs: ListBreadcrumb[] = [];

  if (params.state === "open") {
    rows = rows.filter((i) => i.active === "true" && i.state !== "6" && i.state !== "7");
    breadcrumbs.push({ label: "Active = true > State != Resolved/Closed" });
  }
  if (params.priority) {
    rows = rows.filter((i) => i.priority === params.priority);
    const p = snowPriority[params.priority as keyof typeof snowPriority];
    breadcrumbs.push({ label: `Priority = ${p?.label ?? params.priority}` });
  }
  if (params.mine) {
    // "Mine" in this mock = admin's sys_id.
    rows = rows.filter(
      (i) => i.assigned_to === "681b365ec0a80164000fb0b05854a0cd",
    );
    breadcrumbs.push({ label: "Assigned to = me" });
  }

  const hydrated: Row[] = rows.map((i) => ({
    ...i,
    _assignedToName: i.assigned_to ? getUser(i.assigned_to)?.name ?? "(unknown)" : "",
    _assignmentGroupName: i.assignment_group ? getGroup(i.assignment_group)?.name ?? "" : "",
    _callerName: i.caller_id ? getUser(i.caller_id)?.name ?? "" : "",
  }));

  const columns: ListColumn<Row>[] = [
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
        return p ? <PriorityBadge code={r.priority} label={p.label} color={p.color} /> : r.priority;
      },
    },
    {
      key: "state",
      label: "State",
      width: "120px",
      render: (r) => (
        <span>
          {snowIncidentState[r.state as keyof typeof snowIncidentState] ?? r.state}
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
      render: (r) => <span className="font-mono text-[12px]">{r.opened_at}</span>,
    },
  ];

  return (
    <ListViewShell<Row>
      tableLabel="Incidents"
      tableName="incident"
      breadcrumbs={breadcrumbs}
      columns={columns}
      rows={hydrated}
      rowKey={(r) => r.sys_id}
      rowHref={(r) => `/demos/servicenow-itsm-exemplar/incidents/${r.sys_id}`}
    />
  );
}
