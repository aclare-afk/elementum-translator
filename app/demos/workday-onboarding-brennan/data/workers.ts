// Seed workers for the Brennan onboarding demo mock.
//
// Eight workers covering the Brennan Health System pitch scenario. Sarah
// Chen is the new-hire RN we onboard during the demo (hire date = next
// Monday). Three "demoable" workers (Sarah, Marcus Patel MD, Linda Okafor)
// give the SE three realistic role flavors to choose from at runtime.
// Their managers + the COO complete the supervisory tree so worker-profile
// lookups return a real reporting chain. Alexander Clare is kept as the
// SE seed so his Elementum email still resolves through the dynamic-
// submitter pattern.
//
// The "fictional Brennan" universe — names, employee IDs, cost centers,
// supervisory orgs — does not match any real customer. Compliance
// reminder: no real birth dates, no real photos, no real SSNs.
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
  /** Display name (e.g., "Sarah Chen"). */
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
    // The new-hire RN. Default viewer so the chrome reflects her on the
    // home page when no agent has acted yet. Hire date is next Monday —
    // drives the "Day 1 access provisioning" narrative in the demo.
    wid: "5a72b1c8e4f0d39145a6b7c8d9e0f1a2",
    employeeId: "EMP-10042",
    displayName: "Sarah Chen",
    email: "sarah.chen@brennan.example",
    positionTitle: "Registered Nurse",
    managerWid: "b3c4d5e6f708192a3b4c5d6e7f80abc1",
    costCenter: "CC-NURS-MEDSURG",
    supervisoryOrg: "Nursing — Med-Surg 4-East",
    hireDate: "2026-05-11",
  },
  {
    // Sarah's direct manager. Charge Nurse on the same unit.
    wid: "b3c4d5e6f708192a3b4c5d6e7f80abc1",
    employeeId: "EMP-04217",
    displayName: "Karen Morrison",
    email: "karen.morrison@brennan.example",
    positionTitle: "Charge Nurse",
    managerWid: "c1a2b3c4d5e6f708192a3b4c5d6e7f81",
    costCenter: "CC-NURS-MEDSURG",
    supervisoryOrg: "Nursing — Med-Surg 4-East",
    hireDate: "2018-04-23",
  },
  {
    // The COO — top of the supervisory tree. Mentioned in the pitch brief
    // ("joint working session with the COO inside two weeks"). Empty
    // managerWid — she's the org root for the demo's reporting chain.
    wid: "c1a2b3c4d5e6f708192a3b4c5d6e7f81",
    employeeId: "EMP-00001",
    displayName: "Margaret Sullivan",
    email: "margaret.sullivan@brennan.example",
    positionTitle: "Chief Operating Officer",
    managerWid: "",
    costCenter: "CC-EXEC-OPS",
    supervisoryOrg: "Hospital Operations",
    hireDate: "2014-09-15",
  },
  {
    // Hospitalist physician — second demoable worker. Different role
    // family from Sarah so the access bundle decision differs (badge
    // access for ICU, EMR Hospitalist role, on-call rotation, M365 E3
    // Clinical).
    wid: "d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7",
    employeeId: "EMP-02981",
    displayName: "Marcus Patel, MD",
    email: "marcus.patel@brennan.example",
    positionTitle: "Hospitalist",
    managerWid: "f1e2d3c4b5a6978899aabbccddeeff00",
    costCenter: "CC-MED-HOSP",
    supervisoryOrg: "Medicine — Hospitalist",
    hireDate: "2021-08-02",
  },
  {
    // Patient Access Coordinator — third demoable worker. Back-office /
    // admissions, completely different access bundle from clinical roles
    // (admin badge, ServiceNow Patient Access group, M365 Standard).
    wid: "e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8",
    employeeId: "EMP-08144",
    displayName: "Linda Okafor",
    email: "linda.okafor@brennan.example",
    positionTitle: "Patient Access Coordinator",
    managerWid: "a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
    costCenter: "CC-PATACCESS",
    supervisoryOrg: "Patient Access — Admissions",
    hireDate: "2023-01-09",
  },
  {
    // Marcus Patel's manager. Chief of Medicine.
    wid: "f1e2d3c4b5a6978899aabbccddeeff00",
    employeeId: "EMP-00102",
    displayName: "Dr. James Holloway",
    email: "james.holloway@brennan.example",
    positionTitle: "Chief of Medicine",
    managerWid: "c1a2b3c4d5e6f708192a3b4c5d6e7f81",
    costCenter: "CC-MED-EXEC",
    supervisoryOrg: "Medicine",
    hireDate: "2017-02-14",
  },
  {
    // Linda's manager. Patient Access Manager.
    wid: "a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3",
    employeeId: "EMP-03856",
    displayName: "Brenda Walsh",
    email: "brenda.walsh@brennan.example",
    positionTitle: "Patient Access Manager",
    managerWid: "c1a2b3c4d5e6f708192a3b4c5d6e7f81",
    costCenter: "CC-PATACCESS",
    supervisoryOrg: "Patient Access",
    hireDate: "2019-06-18",
  },
  {
    // The Elementum SE running these demos. Email matches the calling
    // user so the dynamic-submitter chain resolves directly. Reports to
    // the COO for org-tree purposes.
    wid: "ac1a3e201f4b7c92345678abcdef0112",
    employeeId: "EMP-99001",
    displayName: "Alexander Clare",
    email: "aclare@elementum.com",
    positionTitle: "Sales Engineer",
    managerWid: "c1a2b3c4d5e6f708192a3b4c5d6e7f81",
    costCenter: "CC-SE-EXT",
    supervisoryOrg: "External — Vendor Liaison",
    hireDate: "2024-06-03",
  },
];

/** Convenience: the "viewer" — the worker the demo treats as logged in. */
export const defaultViewerWid = seedWorkers[0].wid;
