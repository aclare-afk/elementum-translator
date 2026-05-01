// Amazon Business buyer-system seed requisitions.
//
// Dates are computed RELATIVE TO NOW at module load so the demo always looks
// current — no hardcoded timestamps drifting into the past or future. Seeds
// pick `submittedAt` values 1–6 days ago to populate the procurement portal
// with a realistic "recently active" list. Re-evaluated on Vercel cold starts.
//
// Wire format is standard ISO 8601 with `Z` timezone — see
// `lib/dates.ts#formatIso`.

import { daysAgo, formatIso } from "../../../../lib/dates";

const requisitions = [
  {
    id: "0010488213",
    sessionId: "ab-punchout-sess-9c82d4f1a3b6",
    buyerSystem: "Elementum",
    submittedAt: formatIso(daysAgo(6, undefined, 14, 22)),
    status: "Approved",
    submitter: {
      name: "Priya Khanna",
      email: "priya.khanna@acme.example",
      department: "IT Operations",
    },
    items: [
      {
        asin: "B0FAKE0007",
        title: "Logitech MX Master 3S Wireless Mouse, Graphite",
        quantity: 4,
        unitPrice: 89.99,
        currency: "USD",
        lineTotal: 359.96,
      },
      {
        asin: "B0FAKE0011",
        title: "Anker 65W USB-C GaN Charger (Type-C)",
        quantity: 4,
        unitPrice: 39.99,
        currency: "USD",
        lineTotal: 159.96,
      },
    ],
    total: 519.92,
    currency: "USD",
    itemCount: 8,
    buyerSystemUrl:
      "/demos/amazon-punchout-smoke/buyer-system/requisitions/0010488213",
  },
  {
    id: "0010492057",
    sessionId: "ab-punchout-sess-1f8a4d3c7e2b",
    buyerSystem: "Elementum",
    submittedAt: formatIso(daysAgo(4, undefined, 9, 47)),
    status: "Pending Approval",
    submitter: {
      name: "Marcus Vandermeer",
      email: "marcus.v@acme.example",
      department: "Facilities",
    },
    items: [
      {
        asin: "B0FAKE0002",
        title:
          "AmazonBasics Multipurpose Copy Paper, 20 lb, Letter, 500 Sheets (10-Ream Case)",
        quantity: 6,
        unitPrice: 47.5,
        currency: "USD",
        lineTotal: 285.0,
      },
      {
        asin: "B0FAKE0004",
        title:
          "Sharpie Permanent Markers, Fine Point, Assorted Colors, 24-Count",
        quantity: 8,
        unitPrice: 22.99,
        currency: "USD",
        lineTotal: 183.92,
      },
      {
        asin: "B0FAKE0008",
        title: "Keurig K-Cup Pods Variety Pack, 72-Count",
        quantity: 3,
        unitPrice: 54.99,
        currency: "USD",
        lineTotal: 164.97,
      },
    ],
    total: 633.89,
    currency: "USD",
    itemCount: 17,
    buyerSystemUrl:
      "/demos/amazon-punchout-smoke/buyer-system/requisitions/0010492057",
  },
  {
    id: "0010495812",
    sessionId: "ab-punchout-sess-6b3e8a2f4d91",
    buyerSystem: "Elementum",
    submittedAt: formatIso(daysAgo(1, undefined, 16, 5)),
    status: "Ordered",
    submitter: {
      name: "Jordan Liu",
      email: "jordan.liu@acme.example",
      department: "Lab Operations",
    },
    items: [
      {
        asin: "B0FAKE0006",
        title: "Kimwipes Delicate Task Wipers, Lightweight, 280-Pack",
        quantity: 12,
        unitPrice: 9.49,
        currency: "USD",
        lineTotal: 113.88,
      },
    ],
    total: 113.88,
    currency: "USD",
    itemCount: 12,
    buyerSystemUrl:
      "/demos/amazon-punchout-smoke/buyer-system/requisitions/0010495812",
  },
];

export default requisitions;
