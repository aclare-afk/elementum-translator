// Seed service requests for the JSM queue smoke mock.
//
// Hygiene rules from PLATFORMS/jira.md § HYGIENE & § JSM DOMAIN:
//  - Request (issue) keys: ITH-<n>. Service desk id is a small integer.
//  - Status category drives the pill color (new/indeterminate/done/warning).
//  - SLA remaining is in ms; negative = breached, paused flag suppresses state.
//  - Approvers are real accounts. Approvals are single-step — no branching,
//    no multi-step sequences.
//  - Request type id is a small integer on the portal side.
//
// Project: ITH (IT Help service desk). Queue: "All open incidents + requests".
// 6 seeded requests span healthy / at-risk / breached / paused / completed
// SLA states so the smoke shows every pill color.
//
// Matches PLATFORMS/jira.md § UI PATTERNS > JSM > Queue & Request detail.

import type {
  QueueRow,
  Approver,
} from "@/components/platforms/jira-service-management";

/** Service desk metadata — matches PLATFORMS/jira.md JSM examples. */
export const serviceDesk = {
  id: 7,
  projectKey: "ITH",
  name: "IT Help",
  portalTagline: "We'll get you unblocked.",
} as const;

/** Request types shown on the customer portal landing page. */
export const requestTypes = [
  {
    id: "25",
    name: "Get IT help",
    description: "Ask for help with a laptop, software, or access issue.",
    icon: "💻",
  },
  {
    id: "26",
    name: "Request new hardware",
    description: "Order a laptop, monitor, headset, or other equipment.",
    icon: "🖥️",
  },
  {
    id: "27",
    name: "Request access to a system",
    description: "Ask for access to SaaS tools, VPN, or internal databases.",
    icon: "🔑",
  },
  {
    id: "28",
    name: "Report an outage",
    description: "Something widely used isn't working. Routed as an incident.",
    icon: "🚨",
  },
] as const;

/**
 * Full detail for one seeded request — QueueRow for the table, plus extra
 * fields the detail page needs (description, comments, optional approval).
 */
export type RequestSeed = QueueRow & {
  requestTypeId: string;
  description: string;
  organizationName?: string;
  /** Present when the request is in an approval step. */
  approval?: {
    question: string;
    approvers: Approver[];
    finalDecision: "pending" | "approved" | "declined";
    /** accountId of the current viewer; set on requests where the signed-in
     * agent is also an approver, so the smoke can show Approve/Decline. */
    viewerAccountId?: string;
  };
  comments: Array<{
    accountId: string;
    displayName: string;
    at: string;
    body: string;
    internal?: boolean;
  }>;
};

// Common accounts. accountIds are 24-char opaque strings per HYGIENE.
const jane = {
  accountId: "5b10a2844c20165700ede501",
  displayName: "Jane Davis",
};
const marcus = {
  accountId: "5b10a2844c20165700ede512",
  displayName: "Marcus Lopez",
};
const priya = {
  accountId: "5b10a2844c20165700ede523",
  displayName: "Priya Shah",
};
const alex = {
  accountId: "5b10a2844c20165700ede534",
  displayName: "Alex Chen",
};
const sam = {
  accountId: "5b10a2844c20165700ede545",
  displayName: "Sam Taylor",
};
// The signed-in agent for this smoke — used as viewerAccountId on the one
// pending-approval request so the smoke renders Approve/Decline buttons.
export const viewerAgent = {
  accountId: "5b10a2844c20165700ede556",
  displayName: "Taylor Kim",
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const seedRequests: RequestSeed[] = [
  // ── Healthy SLA, simple in-progress incident ─────────────────────────────
  {
    id: "30101",
    key: "ITH-412",
    requestTypeId: "25",
    summary: "Laptop won't connect to the office Wi-Fi after OS update",
    description:
      "Hi — after installing the macOS update yesterday my laptop refuses to join Acme-Corp Wi-Fi. It sees the network but hangs at 'authenticating'. Other machines are fine. I can still tether via phone.",
    status: { name: "In Progress", category: "indeterminate" },
    priority: "Medium",
    reporter: jane,
    assignee: priya,
    organizationName: "Acme Sales",
    slaResponseRemainingMs: 2 * HOUR,
    slaResponseTargetMs: 4 * HOUR,
    slaResponseCompleted: true, // first response already sent
    slaResolutionRemainingMs: 6 * HOUR + 30 * 60 * 1000,
    slaResolutionTargetMs: 8 * HOUR,
    createdText: "3h ago",
    comments: [
      {
        ...priya,
        at: "2h ago",
        body: "Hi Jane — can you try forgetting the network and re-joining with your @acme.com email? Let me know what you see at the password prompt.",
      },
      {
        ...jane,
        at: "1h ago",
        body: "Tried that, same issue. It never gets past 'authenticating'.",
      },
    ],
  },

  // ── Pending approval (viewer is an approver) ─────────────────────────────
  {
    id: "30102",
    key: "ITH-417",
    requestTypeId: "27",
    summary: "Access to production analytics warehouse (Snowflake)",
    description:
      "I need read access to the PROD_ANALYTICS database so I can build the Q2 revenue dashboard. Justification: I'm the new analytics lead on the finance team.",
    status: { name: "Waiting for approval", category: "indeterminate" },
    priority: "High",
    reporter: marcus,
    assignee: undefined,
    organizationName: "Acme Finance",
    slaResponseCompleted: true,
    slaResponseRemainingMs: 0,
    slaResponseTargetMs: 4 * HOUR,
    slaResolutionPaused: true,
    slaResolutionRemainingMs: 14 * HOUR,
    slaResolutionTargetMs: 24 * HOUR,
    createdText: "yesterday",
    approval: {
      question:
        "Approve Marcus Lopez's access to PROD_ANALYTICS (Snowflake, read-only)?",
      finalDecision: "pending",
      viewerAccountId: viewerAgent.accountId,
      approvers: [
        {
          accountId: viewerAgent.accountId,
          displayName: viewerAgent.displayName,
          decision: "pending",
        },
        {
          accountId: sam.accountId,
          displayName: sam.displayName,
          decision: "approved",
          decidedAt: "yesterday",
        },
      ],
    },
    comments: [],
  },

  // ── At-risk SLA, open incident ───────────────────────────────────────────
  {
    id: "30103",
    key: "ITH-420",
    requestTypeId: "28",
    summary: "Zoom is down for the whole Boston office",
    description:
      "Nobody in the Boston office can start or join Zoom meetings since about 9:10 AM local. Zoom's own status page shows 'investigating'.",
    status: { name: "In Progress", category: "indeterminate" },
    priority: "Highest",
    reporter: alex,
    assignee: priya,
    slaResponseCompleted: true,
    slaResponseRemainingMs: 0,
    slaResponseTargetMs: 1 * HOUR,
    slaResolutionRemainingMs: 30 * 60 * 1000, // 30m left of 2h → <20% → at risk
    slaResolutionTargetMs: 2 * HOUR,
    createdText: "1h ago",
    comments: [
      {
        ...priya,
        at: "45m ago",
        body: "Confirmed with Zoom support — global degradation on US-East. They're working it. Will update every 15m.",
      },
    ],
  },

  // ── Breached SLA ─────────────────────────────────────────────────────────
  {
    id: "30104",
    key: "ITH-398",
    requestTypeId: "26",
    summary: "Replacement keyboard for desk 4B-112",
    description:
      "My keyboard's spacebar stopped responding. I've been using a loaner from the drawer but the Q key on that one is also flaky. Any chance of a replacement?",
    status: { name: "Waiting for parts", category: "indeterminate" },
    priority: "Low",
    reporter: sam,
    assignee: marcus,
    slaResponseCompleted: true,
    slaResponseRemainingMs: 0,
    slaResponseTargetMs: 8 * HOUR,
    slaResolutionRemainingMs: -2 * DAY - 4 * HOUR, // breached
    slaResolutionTargetMs: 3 * DAY,
    createdText: "5d ago",
    comments: [
      {
        ...marcus,
        at: "2d ago",
        body: "Ordered two replacement K380s — they're stuck at customs. Will follow up with procurement today.",
        internal: true,
      },
    ],
  },

  // ── Waiting for customer (paused SLA) ────────────────────────────────────
  {
    id: "30105",
    key: "ITH-415",
    requestTypeId: "25",
    summary: "Email rules stopped working after migration to new domain",
    description:
      "My filter rules that route Jira notifications to a subfolder aren't firing since we moved to @acmecorp.com. Rules look identical.",
    // "Waiting for customer" lives in the indeterminate category in real
    // Jira — there's no "warning" status category. The SLA chip handles the
    // amber styling separately when paused.
    status: { name: "Waiting for customer", category: "indeterminate" },
    priority: "Medium",
    reporter: jane,
    assignee: marcus,
    slaResponseCompleted: true,
    slaResponseRemainingMs: 0,
    slaResponseTargetMs: 4 * HOUR,
    slaResolutionPaused: true,
    slaResolutionRemainingMs: 18 * HOUR,
    slaResolutionTargetMs: 24 * HOUR,
    createdText: "2d ago",
    comments: [
      {
        ...marcus,
        at: "1d ago",
        body: "Could you export your current rules to an .rgs file and attach it here? I want to compare against the post-migration defaults.",
      },
    ],
  },

  // ── Done / resolved ──────────────────────────────────────────────────────
  {
    id: "30106",
    key: "ITH-390",
    requestTypeId: "27",
    summary: "Grant access to Salesforce sandbox for onboarding",
    description:
      "I'm a new AE starting Monday, and onboarding told me to request Salesforce sandbox access from IT.",
    status: { name: "Resolved", category: "done" },
    priority: "Medium",
    reporter: alex,
    assignee: priya,
    slaResponseCompleted: true,
    slaResponseRemainingMs: 0,
    slaResponseTargetMs: 4 * HOUR,
    slaResolutionCompleted: true,
    slaResolutionRemainingMs: 0,
    slaResolutionTargetMs: 24 * HOUR,
    createdText: "8d ago",
    comments: [
      {
        ...priya,
        at: "7d ago",
        body: "Access granted, welcome aboard! Let me know if the provisioning email doesn't arrive within the hour.",
      },
    ],
  },
];

/** Queue metadata — mirrors /rest/servicedeskapi/servicedesk/{id}/queue. */
export const queueMeta = {
  id: 1,
  name: "All open incidents + requests",
  description: "Everything not yet resolved, sorted by SLA urgency.",
} as const;
