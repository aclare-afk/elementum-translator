// ServiceNow ITSM seed incidents.
//
// Dates are computed RELATIVE TO NOW at module load so the demo always looks
// current — no hardcoded timestamps drifting into the past or future. Each
// seed picks an `opened_at` that's a few hours / days ago and an
// `sys_updated_on` slightly after it (to model the "updated since open"
// behavior). When this module is re-evaluated on a Vercel cold start, the
// seeds re-render with timestamps anchored to the new cold-start time.
//
// Wire format matches the real ServiceNow Table API: `YYYY-MM-DD HH:mm:ss`
// in UTC, no timezone marker, no `T` separator. See
// `lib/dates.ts#formatServiceNow`.
//
// Hygiene rules (PLATFORMS/servicenow.md § HYGIENE):
//   - sys_id: 32-char lowercase hex, no dashes
//   - Incident numbers: `INC` + 7 zero-padded digits
//   - Priority codes: 1=Critical, 2=High, 3=Moderate, 4=Low, 5=Planning
//   - State codes: 1=New, 2=In Progress, 3=On Hold, 6=Resolved, 7=Closed,
//     8=Canceled
//   - active: "true" / "false" (string)

import {
  daysAgo,
  hoursAgo,
  formatServiceNow,
} from "../../../../lib/dates";

// Single anchor for the whole module so `sys_created_on` and
// `sys_updated_on` line up consistently within a record.
const fmt = formatServiceNow;

const incidents = [
  {
    sys_id: "46b66a40a9fe1981013806a3bd9d1a0e",
    number: "INC0010001",
    short_description: "Email server down — users unable to send or receive",
    description:
      "Starting at 08:00 UTC, users reporting timeouts when connecting to the internal email relay. Monitoring shows the primary MX unreachable. Impact is company-wide.",
    priority: "1",
    urgency: "1",
    impact: "1",
    state: "2",
    category: "inquiry",
    subcategory: "email",
    assignment_group: "0a52d3dcd7011200f2d224837e610302",
    assigned_to: "6816f79cc0a8016401c5a33be04be441",
    caller_id: "a3c8e201f4b7c92345678abcdef01122",
    opened_at: fmt(daysAgo(2, undefined, 8, 12)),
    sys_created_on: fmt(daysAgo(2, undefined, 8, 12)),
    sys_updated_on: fmt(daysAgo(2, undefined, 9, 4)),
    sys_created_by: "dana.acme",
    active: "true",
  },
  {
    sys_id: "c4f8a2130d11cba7a2f3b4e5d6f71122",
    number: "INC0010002",
    short_description: "VPN connection intermittent for field team",
    description:
      "Multiple field users report that their VPN drops every 15–20 minutes. Started after the overnight maintenance window.",
    priority: "2",
    urgency: "2",
    impact: "2",
    state: "1",
    category: "network",
    subcategory: "vpn",
    assignment_group: "287ee0eda9fe198100ead061f1be3417",
    assigned_to: "",
    caller_id: "7c1eab3f7b1010102df1d2a7bdf6a76e",
    opened_at: fmt(daysAgo(1, undefined, 7, 45)),
    sys_created_on: fmt(daysAgo(1, undefined, 7, 45)),
    sys_updated_on: fmt(daysAgo(1, undefined, 7, 45)),
    sys_created_by: "bob.sample",
    active: "true",
  },
  {
    sys_id: "e9b0c4523a45bde67890123456789abc",
    number: "INC0010003",
    short_description: "Printer on 4th floor showing offline",
    description:
      "Finance team printer (PRN-04-12) intermittently drops offline. Waiting on replacement toner arrival before further troubleshooting.",
    priority: "3",
    urgency: "3",
    impact: "3",
    state: "3",
    category: "hardware",
    subcategory: "printer",
    assignment_group: "0a52d3dcd7011200f2d224837e610302",
    assigned_to: "9d2e4c12a0b1c23456789abcdef01234",
    caller_id: "7c1eab3f7b1010102df1d2a7bdf6a76e",
    opened_at: fmt(daysAgo(3, undefined, 14, 2)),
    sys_created_on: fmt(daysAgo(3, undefined, 14, 2)),
    sys_updated_on: fmt(daysAgo(2, undefined, 10, 30)),
    sys_created_by: "bob.sample",
    active: "true",
  },
  {
    sys_id: "f2a4b6c83e15dce78901234567890abd",
    number: "INC0010004",
    short_description: "Payroll job failed — cannot run bi-weekly cycle",
    description:
      "The scheduled payroll run at 03:00 UTC aborted with a database connection timeout. Payroll team is blocked; cutoff is 17:00 UTC.",
    priority: "1",
    urgency: "1",
    impact: "1",
    state: "1",
    category: "software",
    subcategory: "payroll",
    assignment_group: "4a0e3e1dd7301200b3d4b1f5a96190b1",
    assigned_to: "",
    caller_id: "a3c8e201f4b7c92345678abcdef01122",
    opened_at: fmt(hoursAgo(6)),
    sys_created_on: fmt(hoursAgo(6)),
    sys_updated_on: fmt(hoursAgo(6)),
    sys_created_by: "dana.acme",
    active: "true",
  },
  {
    sys_id: "3d7c9b4521a23e4567890abcdef01122",
    number: "INC0010005",
    short_description: "Password reset for contractor account",
    description:
      "Routine password reset for contractor onboarding. Resolved via self-service portal.",
    priority: "4",
    urgency: "4",
    impact: "3",
    state: "6",
    category: "inquiry",
    subcategory: "password",
    assignment_group: "0a52d3dcd7011200f2d224837e610302",
    assigned_to: "9d2e4c12a0b1c23456789abcdef01234",
    caller_id: "7c1eab3f7b1010102df1d2a7bdf6a76e",
    opened_at: fmt(daysAgo(5, undefined, 11, 18)),
    sys_created_on: fmt(daysAgo(5, undefined, 11, 18)),
    sys_updated_on: fmt(daysAgo(5, undefined, 12, 5)),
    sys_created_by: "bob.sample",
    active: "false",
  },
];

export default incidents;
