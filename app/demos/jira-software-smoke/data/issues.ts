// Seed issues for the Jira Software smoke mock.
//
// Hygiene rules from PLATFORMS/jira.md § HYGIENE:
//  - Issue keys: <PROJECT_KEY>-<number>, project key 2–10 uppercase chars.
//  - Status "category" (new/indeterminate/done) drives column color, not the
//    status "name" — customers rename statuses freely.
//  - Priority names are canonical: Highest / High / Medium / Low / Lowest.
//  - Story points live on customfield_10016 in real Jira; here it's a plain
//    number on the issue.
//  - Epics are themselves issues (issueType "Epic") with a color that all
//    children render as a left-border tint on the board.
//
// Project here: WEB (Acme Web Platform), Scrum board, active sprint "Sprint 42".
// All 8 issues belong to Sprint 42 so the board has real content in every
// column.
//
// Matches PLATFORMS/jira.md § UI PATTERNS > Jira Software > Board.

import type { BoardIssue } from "@/components/platforms/jira-software";
import type { JiraStatusCategory } from "@/components/platforms/jira-shared";

/**
 * A seeded board column. The `category` is what drives the pill color — the
 * `name` is what the customer admin has renamed the status to in workflow
 * config.
 */
export type BoardColumnSeed = {
  id: string;
  name: string;
  category: JiraStatusCategory;
  wipLimit?: number;
};

export const boardColumns: BoardColumnSeed[] = [
  { id: "col-todo", name: "To Do", category: "new" },
  { id: "col-inprogress", name: "In Progress", category: "indeterminate", wipLimit: 4 },
  { id: "col-review", name: "In Review", category: "indeterminate", wipLimit: 3 },
  { id: "col-done", name: "Done", category: "done" },
];

/**
 * Seed epics (referenced by issues through `epicColor`). Real Jira epics have
 * their own issueType + key; for the board view we only need the color per
 * child card.
 */
export const epics = {
  checkout: { key: "WEB-12", name: "Checkout redesign", color: "#6554C0" }, // purple
  perf:     { key: "WEB-8",  name: "Perf hardening",    color: "#00B8D9" }, // teal
  growth:   { key: "WEB-20", name: "Growth experiments", color: "#36B37E" }, // green
} as const;

/**
 * Which column a seed issue belongs in. We key by column id, not status name,
 * so renaming in one place doesn't cascade.
 */
export type BoardSeedIssue = BoardIssue & {
  columnId: string;
  /** Human-readable status label shown on the detail page. */
  statusName: string;
  /** Full description ADF would be richer; smoke uses a plain paragraph. */
  description: string;
  reporter: { accountId: string; displayName: string };
  createdText: string;
  updatedText: string;
  epicKey?: string;
};

// 8 issues, distributed across the 4 columns so every column has real content.
// accountIds are 24-char opaque strings per PLATFORMS/jira.md § HYGIENE.
export const seedIssues: BoardSeedIssue[] = [
  // ── To Do ────────────────────────────────────────────────────────────────
  {
    id: "10101",
    key: "WEB-145",
    columnId: "col-todo",
    statusName: "To Do",
    summary: "Add Apple Pay to checkout payment selector",
    description:
      "Finance wants Apple Pay enabled for US customers. Needs the new Stripe payment intent flow plus domain verification for the production host.",
    issueType: "Story",
    priority: "High",
    storyPoints: 5,
    epicColor: epics.checkout.color,
    epicKey: epics.checkout.key,
    assignee: {
      accountId: "5b10a2844c20165700ede21g",
      displayName: "Priya Shah",
    },
    reporter: {
      accountId: "5b10a2844c20165700ede301",
      displayName: "Jane Davis",
    },
    createdText: "2d ago",
    updatedText: "5h ago",
  },
  {
    id: "10102",
    key: "WEB-149",
    columnId: "col-todo",
    statusName: "To Do",
    summary: "Fix layout shift on product detail hero image",
    description:
      "Lighthouse is flagging a 0.18 CLS on /products/*. The hero image is loading without intrinsic dimensions — add width/height and a blurred placeholder.",
    issueType: "Bug",
    priority: "Medium",
    storyPoints: 2,
    epicColor: epics.perf.color,
    epicKey: epics.perf.key,
    assignee: undefined,
    reporter: {
      accountId: "5b10a2844c20165700ede301",
      displayName: "Jane Davis",
    },
    createdText: "1d ago",
    updatedText: "1d ago",
  },

  // ── In Progress (cap 4) ──────────────────────────────────────────────────
  {
    id: "10103",
    key: "WEB-142",
    columnId: "col-inprogress",
    statusName: "In Progress",
    summary: "Migrate checkout form validation to Zod",
    description:
      "Replace the hand-rolled validators in <CheckoutForm /> with a shared Zod schema so the server can reuse it. Ship behind the `checkout-v2` flag.",
    issueType: "Task",
    priority: "High",
    storyPoints: 3,
    epicColor: epics.checkout.color,
    epicKey: epics.checkout.key,
    assignee: {
      accountId: "5b10a2844c20165700ede312",
      displayName: "Marcus Lopez",
    },
    reporter: {
      accountId: "5b10a2844c20165700ede301",
      displayName: "Jane Davis",
    },
    createdText: "4d ago",
    updatedText: "2h ago",
  },
  {
    id: "10104",
    key: "WEB-150",
    columnId: "col-inprogress",
    statusName: "In Progress",
    summary: "Investigate p99 latency regression on /api/cart",
    description:
      "Datadog shows p99 up from 180ms to 620ms since Tuesday's deploy. Suspect the new analytics middleware; bisect the deploys and confirm.",
    issueType: "Bug",
    priority: "Highest",
    storyPoints: 5,
    epicColor: epics.perf.color,
    epicKey: epics.perf.key,
    assignee: {
      accountId: "5b10a2844c20165700ede321",
      displayName: "Priya Shah",
    },
    reporter: {
      accountId: "5b10a2844c20165700ede312",
      displayName: "Marcus Lopez",
    },
    createdText: "6h ago",
    updatedText: "20m ago",
  },
  {
    id: "10105",
    key: "WEB-144",
    columnId: "col-inprogress",
    statusName: "In Progress",
    summary: "A/B test copy for hero CTA",
    description:
      "Run a 50/50 test between 'Start free trial' and 'Get started free'. Gate by country (US/CA/UK) and target ≥80% power over two weeks.",
    issueType: "Story",
    priority: "Medium",
    storyPoints: 3,
    epicColor: epics.growth.color,
    epicKey: epics.growth.key,
    assignee: {
      accountId: "5b10a2844c20165700ede4ab",
      displayName: "Alex Chen",
    },
    reporter: {
      accountId: "5b10a2844c20165700ede4cd",
      displayName: "Sam Taylor",
    },
    createdText: "3d ago",
    updatedText: "1h ago",
  },

  // ── In Review (cap 3) ────────────────────────────────────────────────────
  {
    id: "10106",
    key: "WEB-138",
    columnId: "col-review",
    statusName: "In Review",
    summary: "Add Stripe tax calculation to checkout totals",
    description:
      "Pulls tax via Stripe Tax for US + CA addresses. Falls back to zero tax outside those regions with a banner. Ready for QA.",
    issueType: "Story",
    priority: "High",
    storyPoints: 5,
    epicColor: epics.checkout.color,
    epicKey: epics.checkout.key,
    assignee: {
      accountId: "5b10a2844c20165700ede312",
      displayName: "Marcus Lopez",
    },
    reporter: {
      accountId: "5b10a2844c20165700ede301",
      displayName: "Jane Davis",
    },
    createdText: "5d ago",
    updatedText: "3h ago",
  },
  {
    id: "10107",
    key: "WEB-141",
    columnId: "col-review",
    statusName: "In Review",
    summary: "Remove deprecated /v1 cart endpoint",
    description:
      "Analytics shows zero clients still hitting /v1/cart as of last week. Delete the route + handler + fixture tests.",
    issueType: "Task",
    priority: "Low",
    storyPoints: 1,
    assignee: {
      accountId: "5b10a2844c20165700ede4ab",
      displayName: "Alex Chen",
    },
    reporter: {
      accountId: "5b10a2844c20165700ede312",
      displayName: "Marcus Lopez",
    },
    createdText: "3d ago",
    updatedText: "4h ago",
  },

  // ── Done ─────────────────────────────────────────────────────────────────
  {
    id: "10108",
    key: "WEB-133",
    columnId: "col-done",
    statusName: "Done",
    summary: "Ship guest checkout flow",
    description:
      "Guest checkout is live behind the `guest-checkout` flag at 100%. Conversion up 3.1% in the two-week hold-out.",
    issueType: "Story",
    priority: "High",
    storyPoints: 8,
    epicColor: epics.checkout.color,
    epicKey: epics.checkout.key,
    assignee: {
      accountId: "5b10a2844c20165700ede321",
      displayName: "Priya Shah",
    },
    reporter: {
      accountId: "5b10a2844c20165700ede301",
      displayName: "Jane Davis",
    },
    createdText: "8d ago",
    updatedText: "yesterday",
  },
];
