// Seed workers for the Workday PTO smoke mock.
//
// Five workers covering a realistic mix of demo personas. Same fictional
// universe as the Salesforce/Jira mocks (Patricia Nguyen, Marcus Chen,
// Henry Schultz reappear) so cross-platform demos read coherently.
//
// Hygiene rules from PLATFORMS/workday.md § HYGIENE:
//   - WID (Workday ID): 32-char lowercase hex, no dashes
//   - Employee_ID: customer-defined; using EMP-NNNNN pattern
//   - Tenant slug: lowercase alphanumeric/underscore, never a real customer
//   - Email: <first>.<last>@<tenant>.example
//   - No real photos, no real birth dates

export type Worker = {
  /** Workday ID — 32-char hex. The "internal" identifier; what REST URLs use. */
  wid: string;
  /** External Employee_ID — what HR/managers see and reference. */
  employeeId: string;
  /** Display name (e.g., "Patricia Nguyen"). */
  displayName: string;
  /** Email — used by the dynamic-submitter pattern as the agent-passed identity. */
  email: string;
  /** Position title shown next to the worker name. */
  positionTitle: string;
  /** Manager's WID (or empty for the org-tree root). */
  managerWid: string;
  /** Cost center slug. */
  costCenter: string;
  /** Supervisory org slug. */
  supervisoryOrg: string;
  /** Hire date (ISO date, no time). Drives accrual reset logic in real Workday. */
  hireDate: string;
};

export const seedWorkers: Worker[] = [
  {
    wid: "a3c8e201f4b7c92345678abcdef01122",
    employeeId: "EMP-00012",
    displayName: "Alex Reeves",
    email: "alex.reeves@acme.example",
    positionTitle: "Senior Software Engineer",
    managerWid: "9d2e4c12a0b1c23456789abcdef01234",
    costCenter: "CC-ENG-100",
    supervisoryOrg: "Engineering — Platform",
    hireDate: "2023-08-14",
  },
  {
    wid: "9d2e4c12a0b1c23456789abcdef01234",
    employeeId: "EMP-00007",
    displayName: "Patricia Nguyen",
    email: "patricia.nguyen@acme.example",
    positionTitle: "Engineering Manager",
    managerWid: "7c1eab3f7b1010102df1d2a7bdf6a76e",
    costCenter: "CC-ENG-100",
    supervisoryOrg: "Engineering — Platform",
    hireDate: "2021-03-22",
  },
  {
    wid: "7c1eab3f7b1010102df1d2a7bdf6a76e",
    employeeId: "EMP-00003",
    displayName: "Marcus Chen",
    email: "marcus.chen@acme.example",
    positionTitle: "VP of Engineering",
    managerWid: "",
    costCenter: "CC-ENG-100",
    supervisoryOrg: "Engineering",
    hireDate: "2019-09-11",
  },
  {
    wid: "c4f8a2130d11cba7a2f3b4e5d6f71122",
    employeeId: "EMP-00021",
    displayName: "Henry Schultz",
    email: "henry.schultz@acme.example",
    positionTitle: "Customer Success Manager",
    managerWid: "e9b0c4523a45bde67890123456789abc",
    costCenter: "CC-CS-200",
    supervisoryOrg: "Customer Success",
    hireDate: "2024-01-08",
  },
  {
    wid: "e9b0c4523a45bde67890123456789abc",
    employeeId: "EMP-00018",
    displayName: "Lily Okafor",
    email: "lily.okafor@acme.example",
    positionTitle: "Director, Customer Success",
    managerWid: "7c1eab3f7b1010102df1d2a7bdf6a76e",
    costCenter: "CC-CS-200",
    supervisoryOrg: "Customer Success",
    hireDate: "2022-11-04",
  },
];

/** Convenience: the "viewer" — the worker the demo treats as logged in. */
export const defaultViewerWid = seedWorkers[0].wid;
