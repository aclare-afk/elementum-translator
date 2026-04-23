// Single incident form view.
// Uses FormShell from the shared ServiceNow chrome.

import { notFound } from "next/navigation";
import {
  FormShell,
  PriorityBadge,
  RefLink,
  snowPriority,
  snowIncidentState,
  snowColors,
} from "@/components/platforms/servicenow";
import { getIncident, getUser, getGroup } from "../../_lib/db";

type Params = Promise<{ sys_id: string }>;

export default async function IncidentForm({ params }: { params: Params }) {
  const { sys_id } = await params;
  const inc = getIncident(sys_id);
  if (!inc) notFound();

  const assignedTo = inc.assigned_to ? getUser(inc.assigned_to) : undefined;
  const assignmentGroup = inc.assignment_group
    ? getGroup(inc.assignment_group)
    : undefined;
  const caller = inc.caller_id ? getUser(inc.caller_id) : undefined;

  const priorityMeta = snowPriority[inc.priority as keyof typeof snowPriority];
  const stateLabel =
    snowIncidentState[inc.state as keyof typeof snowIncidentState] ?? inc.state;

  const Muted = ({ children }: { children: React.ReactNode }) => (
    <span style={{ color: snowColors.textMuted }}>{children}</span>
  );

  return (
    <FormShell
      recordNumber={inc.number}
      title={inc.short_description}
      actions={[
        { label: "Save" },
        { label: "Update", primary: true },
        { label: "Resolve Incident" },
        { label: "Delete" },
      ]}
      sections={[
        {
          title: "Incident",
          fields: [
            { label: "Number", value: <code className="font-mono">{inc.number}</code> },
            { label: "Caller", value: caller ? <RefLink href="#">{caller.name}</RefLink> : <Muted>—</Muted> },
            { label: "Category", value: inc.category || <Muted>—</Muted> },
            { label: "Subcategory", value: inc.subcategory || <Muted>—</Muted> },
            { label: "Short description", value: inc.short_description },
            {
              label: "Description",
              value: (
                <div className="whitespace-pre-wrap text-[13px]">{inc.description}</div>
              ),
            },
          ],
        },
        {
          title: "Classification & Assignment",
          fields: [
            {
              label: "Priority",
              value: priorityMeta ? (
                <PriorityBadge code={inc.priority} label={priorityMeta.label} color={priorityMeta.color} />
              ) : (
                inc.priority
              ),
            },
            { label: "Impact", value: inc.impact },
            { label: "Urgency", value: inc.urgency },
            { label: "State", value: stateLabel },
            {
              label: "Assignment group",
              value: assignmentGroup ? (
                <RefLink href="#">{assignmentGroup.name}</RefLink>
              ) : (
                <Muted>—</Muted>
              ),
            },
            {
              label: "Assigned to",
              value: assignedTo ? (
                <RefLink href="#">{assignedTo.name}</RefLink>
              ) : (
                <Muted>(unassigned)</Muted>
              ),
            },
          ],
        },
        {
          title: "System",
          fields: [
            { label: "sys_id", value: <code className="font-mono text-[11px]">{inc.sys_id}</code> },
            { label: "Opened at", value: <code className="font-mono text-[12px]">{inc.opened_at}</code> },
            { label: "Created on", value: <code className="font-mono text-[12px]">{inc.sys_created_on}</code> },
            { label: "Updated on", value: <code className="font-mono text-[12px]">{inc.sys_updated_on}</code> },
            { label: "Created by", value: inc.sys_created_by },
            { label: "Active", value: inc.active === "true" ? "Yes" : "No" },
          ],
        },
      ]}
      related={[
        {
          label: "Notes",
          count: 0,
          content: (
            <div className="text-[12px]" style={{ color: snowColors.textMuted }}>
              No notes added yet.
            </div>
          ),
        },
        {
          label: "Tasks",
          count: 0,
          content: (
            <div className="text-[12px]" style={{ color: snowColors.textMuted }}>
              No child tasks.
            </div>
          ),
        },
        {
          label: "Approvals",
          count: 0,
          content: (
            <div className="text-[12px]" style={{ color: snowColors.textMuted }}>
              No approvals on this record.
            </div>
          ),
        },
      ]}
      activity={[
        {
          who: inc.sys_created_by,
          when: inc.sys_created_on,
          kind: "system" as const,
          body: <span>Incident created.</span>,
        },
        ...(inc.sys_updated_on !== inc.sys_created_on
          ? [
              {
                who: "system",
                when: inc.sys_updated_on,
                kind: "field" as const,
                body: <span>Record updated.</span>,
              },
            ]
          : []),
      ]}
    />
  );
}
