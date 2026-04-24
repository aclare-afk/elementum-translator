// Incidents list view (server component).
// Does data fetching against the in-memory store, then passes serializable
// rows + breadcrumbs down to the client-side IncidentsTable. The render
// functions live in the client component because functions can't cross the
// server→client boundary.
// Filters come from query-string params to match the way real ServiceNow
// navigator modules are just list views with a baked-in breadcrumb filter.

import {
  listIncidents,
  getUser,
  getGroup,
} from "../_lib/db";
import { snowPriority } from "@/components/platforms/servicenow";
import type { ListBreadcrumb } from "@/components/platforms/servicenow";
import { IncidentsTable, type IncidentRow } from "./_IncidentsTable";

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

  let incidents = listIncidents();

  const breadcrumbs: ListBreadcrumb[] = [];

  if (params.state === "open") {
    incidents = incidents.filter(
      (i) => i.active === "true" && i.state !== "6" && i.state !== "7",
    );
    breadcrumbs.push({ label: "Active = true > State != Resolved/Closed" });
  }
  if (params.priority) {
    incidents = incidents.filter((i) => i.priority === params.priority);
    const p = snowPriority[params.priority as keyof typeof snowPriority];
    breadcrumbs.push({
      label: `Priority = ${p?.label ?? params.priority}`,
    });
  }
  if (params.mine) {
    // "Mine" in this mock = admin's sys_id.
    incidents = incidents.filter(
      (i) => i.assigned_to === "681b365ec0a80164000fb0b05854a0cd",
    );
    breadcrumbs.push({ label: "Assigned to = me" });
  }

  const rows: IncidentRow[] = incidents.map((i) => ({
    sys_id: i.sys_id,
    number: i.number,
    short_description: i.short_description,
    priority: i.priority,
    state: i.state,
    opened_at: i.opened_at,
    _assignedToName: i.assigned_to
      ? getUser(i.assigned_to)?.name ?? "(unknown)"
      : "",
    _assignmentGroupName: i.assignment_group
      ? getGroup(i.assignment_group)?.name ?? ""
      : "",
    _callerName: i.caller_id ? getUser(i.caller_id)?.name ?? "" : "",
  }));

  return <IncidentsTable rows={rows} breadcrumbs={breadcrumbs} />;
}
