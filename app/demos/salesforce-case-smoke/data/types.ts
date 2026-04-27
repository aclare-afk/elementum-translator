// Types for the salesforce-case-smoke mock.
//
// Field names mirror Salesforce sObject API names exactly so the chrome,
// store, and route handlers all use the same vocabulary the customer's
// integrators would.
//
// Fidelity anchor: PLATFORMS/salesforce.md § HYGIENE > API names + § COMMON
// SE SCENARIOS > Service Console.

import type { SalesforceCaseStatus } from "@/components/platforms/salesforce-shared";

export type CasePriority = "Low" | "Medium" | "High";

/**
 * Standard Salesforce Case "Origin" picklist. The defaults shipped on a new
 * org. Customers add custom values (Slack, In-App, Partner Portal, etc.) but
 * the smoke sticks to the OOTB set.
 */
export type CaseOrigin = "Phone" | "Email" | "Web" | "Chat";

/**
 * Standard Salesforce Case "Reason" picklist defaults — used in Service Cloud
 * orgs for routing + reporting. Customers re-skin this heavily; mocks stick
 * to the defaults to look honest.
 */
export type CaseReason =
  | "Installation"
  | "Equipment Complexity"
  | "Performance"
  | "Breakdown"
  | "Equipment Design"
  | "Feedback"
  | "Other";

/** Re-export so other files inside the mock have a single import surface. */
export type { SalesforceCaseStatus };

/**
 * Standard Salesforce Case sObject shape, slimmed to the fields a Service
 * Cloud demo actually shows on a list view + record page.
 *
 * What's modeled vs. real Salesforce:
 *   - All API field names match real Salesforce exactly (Subject, Description,
 *     CaseNumber, etc. — pascalCase per real conventions).
 *   - `Id` is an 18-char case-safe Salesforce ID with the `500` key prefix.
 *     Mocks always emit 18-char so integrations parsing IDs as fixed-length
 *     strings don't choke.
 *   - `CaseNumber` is the auto-numbered display string (8 digits, leading-
 *     zero padded — `00001000` style).
 *   - `AccountId`, `ContactId`, `OwnerId` are stored as IDs alongside their
 *     display names (denormalized via the `Account.Name`, `Contact.Name`,
 *     `Owner.Name` parallel fields). Real Salesforce returns these as
 *     nested objects when you query with relationship traversal — for the
 *     mock we keep both flat ID + flat name to avoid envelope complexity.
 *   - `IsClosed` is a real Salesforce field (auto-set when status moves to
 *     a "Closed" status category). We keep it explicit for honesty.
 *   - `CreatedDate` / `LastModifiedDate` are ISO-8601 with millisecond
 *     precision per Salesforce wire format.
 */
export type SalesforceCase = {
  /** 18-char ID; `500` prefix per § HYGIENE > Key prefixes. */
  Id: string;
  /** Display number, e.g., "00001000". Auto-numbered in real Salesforce. */
  CaseNumber: string;
  Subject: string;
  Description: string;
  Status: SalesforceCaseStatus;
  Priority: CasePriority;
  Origin: CaseOrigin;
  /** Optional. Many Cases land without a Reason populated. */
  Reason?: CaseReason;
  /** Optional. Web-to-Case and Email-to-Case Cases often lack an Account. */
  AccountId?: string;
  AccountName?: string;
  ContactId?: string;
  ContactName?: string;
  ContactEmail?: string;
  /** Owner is required in real Salesforce. We always populate it. */
  OwnerId: string;
  OwnerName: string;
  /** Mirrors Salesforce's auto-derived field. True iff Status === "Closed". */
  IsClosed: boolean;
  /** ISO 8601 with milliseconds, e.g., "2026-04-22T09:45:30.000+0000". */
  CreatedDate: string;
  LastModifiedDate: string;
};
