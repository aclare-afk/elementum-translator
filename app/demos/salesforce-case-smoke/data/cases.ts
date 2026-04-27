// Seed Cases for the salesforce-case-smoke mock.
//
// Six cases covering every default Status (New / Working / Escalated /
// Closed) and every Priority + Origin so the SE has variety to point at on
// screen. Names use obviously-fake "Acme Corp / Globex / Initech" framings
// per § HYGIENE > Names + display labels — no real Fortune 500 names.
//
// IDs follow real Salesforce conventions:
//   - Case.Id          — 18-char case-safe, `500` key prefix
//   - Account.Id       — 18-char, `001` key prefix
//   - Contact.Id       — 18-char, `003` key prefix
//   - User.Id          — 18-char, `005` key prefix
//   - CaseNumber       — auto-numbered 8-digit display string
//
// Created/Modified dates are stable strings (NOT Date.now()) so screenshots
// are reproducible across renders.
//
// Fidelity anchor: PLATFORMS/salesforce.md § COMMON SE SCENARIOS > Service
// Console + § HYGIENE > Identifiers/Names.

import type { SalesforceCase } from "./types";

export const seedCases: SalesforceCase[] = [
  {
    Id: "5005g00000K9aP1AAJ",
    CaseNumber: "00001045",
    Subject: "POS terminals offline at Acme retail store #41",
    Description:
      "Five point-of-sale terminals at the Schaumburg, IL location have been offline since 8:30 AM local. Customers being turned away. Network team confirms the LAN is up; suspect store-side firewall or AppLayer config drift. Need eyes on this immediately.",
    Status: "Escalated",
    Priority: "High",
    Origin: "Phone",
    Reason: "Performance",
    AccountId: "0015g00000ABCDE1AAH",
    AccountName: "Acme Corp",
    ContactId: "0035g00000XYZAB1AAH",
    ContactName: "Patricia Nguyen",
    ContactEmail: "patricia.nguyen@acmecorp.demo",
    OwnerId: "0055g00000Q1AAA2AAJ",
    OwnerName: "Sam Rivera",
    IsClosed: false,
    CreatedDate: "2026-04-23T13:32:11.000+0000",
    LastModifiedDate: "2026-04-23T14:08:45.000+0000",
  },
  {
    Id: "5005g00000K9aP2AAJ",
    CaseNumber: "00001044",
    Subject: "Cannot access Salesforce reports after profile change",
    Description:
      "User reports they can no longer view the Pipeline Trend report after their profile was updated yesterday. Error: 'Insufficient Privileges.' Need to verify Permission Set assignments and Report Folder sharing.",
    Status: "Working",
    Priority: "Medium",
    Origin: "Email",
    Reason: "Other",
    AccountId: "0015g00000ABCDE2AAH",
    AccountName: "Globex Holdings",
    ContactId: "0035g00000XYZAB2AAH",
    ContactName: "Marcus Chen",
    ContactEmail: "mchen@globex.demo",
    OwnerId: "0055g00000Q1AAB1AAJ",
    OwnerName: "Lily Okafor",
    IsClosed: false,
    CreatedDate: "2026-04-22T20:14:02.000+0000",
    LastModifiedDate: "2026-04-23T09:11:30.000+0000",
  },
  {
    Id: "5005g00000K9aP3AAJ",
    CaseNumber: "00001043",
    Subject: "Barcode scanner not pairing on warehouse Honeywell PDA",
    Description:
      "Warehouse #3 Honeywell CT45 unit will not pair with new SKU range 7700-series scanners after firmware update. Other PDAs in the same fleet pair fine. Suspect device-specific bluetooth profile drift.",
    Status: "Working",
    Priority: "Medium",
    Origin: "Web",
    Reason: "Equipment Complexity",
    AccountId: "0015g00000ABCDE3AAH",
    AccountName: "Initech Logistics",
    ContactId: "0035g00000XYZAB3AAH",
    ContactName: "Henry Schultz",
    ContactEmail: "h.schultz@initech.demo",
    OwnerId: "0055g00000Q1AAC1AAJ",
    OwnerName: "Devon Park",
    IsClosed: false,
    CreatedDate: "2026-04-21T16:48:55.000+0000",
    LastModifiedDate: "2026-04-22T11:42:09.000+0000",
  },
  {
    Id: "5005g00000K9aP4AAJ",
    CaseNumber: "00001042",
    Subject: "Email-to-Case bounce: Outlook auto-reply loop",
    Description:
      "Inbound Email-to-Case from chris.holt@umbrella.demo created Case 00001042 then triggered five additional Cases in the next four minutes. Outlook auto-reply has been bouncing the case-creation acknowledgement back. Need to add a domain to the bounce-handling allowlist.",
    Status: "New",
    Priority: "Low",
    Origin: "Email",
    Reason: "Other",
    AccountId: "0015g00000ABCDE4AAH",
    AccountName: "Umbrella Inc",
    ContactId: "0035g00000XYZAB4AAH",
    ContactName: "Chris Holt",
    ContactEmail: "chris.holt@umbrella.demo",
    OwnerId: "0055g00000Q1AAB1AAJ",
    OwnerName: "Lily Okafor",
    IsClosed: false,
    CreatedDate: "2026-04-23T15:02:11.000+0000",
    LastModifiedDate: "2026-04-23T15:02:11.000+0000",
  },
  {
    Id: "5005g00000K9aP5AAJ",
    CaseNumber: "00001038",
    Subject: "Quote document missing line item discounts",
    Description:
      "Quote PDF generated from Opportunity 'Acme — Phase II Renewal' shows the gross subtotal but omits the negotiated 12% discount applied at the line level. Confirmed the discount IS stored on the line; the Quote template is missing the calc.",
    Status: "Closed",
    Priority: "Medium",
    Origin: "Chat",
    Reason: "Feedback",
    AccountId: "0015g00000ABCDE1AAH",
    AccountName: "Acme Corp",
    ContactId: "0035g00000XYZAB1AAH",
    ContactName: "Patricia Nguyen",
    ContactEmail: "patricia.nguyen@acmecorp.demo",
    OwnerId: "0055g00000Q1AAA2AAJ",
    OwnerName: "Sam Rivera",
    IsClosed: true,
    CreatedDate: "2026-04-15T10:25:00.000+0000",
    LastModifiedDate: "2026-04-19T14:50:22.000+0000",
  },
  {
    Id: "5005g00000K9aP6AAJ",
    CaseNumber: "00001036",
    Subject: "MFA enrollment loop on iOS Salesforce app",
    Description:
      "User on iOS Salesforce app version 248.2 is being repeatedly prompted to enroll in MFA after each app launch, even after completing enrollment via Salesforce Authenticator. Working with Trailblazer Community thread; suspected client cache issue.",
    Status: "Closed",
    Priority: "Low",
    Origin: "Phone",
    Reason: "Equipment Complexity",
    AccountId: "0015g00000ABCDE2AAH",
    AccountName: "Globex Holdings",
    ContactId: "0035g00000XYZAB2AAH",
    ContactName: "Marcus Chen",
    ContactEmail: "mchen@globex.demo",
    OwnerId: "0055g00000Q1AAC1AAJ",
    OwnerName: "Devon Park",
    IsClosed: true,
    CreatedDate: "2026-04-12T08:14:18.000+0000",
    LastModifiedDate: "2026-04-14T17:30:41.000+0000",
  },
];
