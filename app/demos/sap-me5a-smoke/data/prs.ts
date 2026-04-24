// Seed Purchase Requisitions for the SAP ME5A smoke mock.
//
// Hygiene rules from PLATFORMS/sap.md § HYGIENE:
//  - PR number: 10-digit, left-padded, e.g. "0010001234"
//  - Material number: external (alphanumeric up to 40) or internal 18-digit
//    numeric. Using short alpha codes here for readability in demos.
//  - Vendor number: 10-digit, left-padded.
//  - Company code: 4 chars, all caps. Plant: 4 chars. Purchasing Group: 3 chars.
//  - Dates: DD.MM.YYYY display format.
//  - SAP user IDs: ALL-CAPS (JDAVIS, MLOPEZ, ...).
//
// None of these numbers should resemble real SAP customer data. Use obviously
// fake but shape-correct identifiers.

import type { SapPrStatus } from "./types";

export type PurchaseRequisition = {
  prNumber: string; // 10-digit
  item: string; // 5-digit item line
  material: string;
  description: string;
  quantity: number;
  unit: string; // EA, BOX, CASE, PAC
  deliveryDate: string; // DD.MM.YYYY
  plant: string; // 4-char
  purchasingGroup: string; // 3-char
  requester: string; // ALL-CAPS user id
  netPrice: number;
  currency: "USD" | "EUR" | "GBP";
  status: SapPrStatus;
  createdOn: string; // DD.MM.YYYY
};

export const seedPRs: PurchaseRequisition[] = [
  {
    prNumber: "0010001234",
    item: "00010",
    material: "TONER-HP-58A",
    description: "HP 58A Black Toner Cartridge",
    quantity: 12,
    unit: "EA",
    deliveryDate: "02.05.2026",
    plant: "US01",
    purchasingGroup: "IT1",
    requester: "JDAVIS",
    netPrice: 89.99,
    currency: "USD",
    status: "RELEASED",
    createdOn: "19.04.2026",
  },
  {
    prNumber: "0010001235",
    item: "00010",
    material: "LAB-GLOVES-NITRILE",
    description: "Nitrile Exam Gloves, Powder-Free, Size M",
    quantity: 40,
    unit: "BOX",
    deliveryDate: "25.04.2026",
    plant: "US01",
    purchasingGroup: "LAB",
    requester: "MLOPEZ",
    netPrice: 18.5,
    currency: "USD",
    status: "OPEN",
    createdOn: "21.04.2026",
  },
  {
    prNumber: "0010001236",
    item: "00010",
    material: "OFFICE-PAPER-LETTER",
    description: "Multipurpose Copy Paper, Letter, 20lb, 5000 sheets",
    quantity: 8,
    unit: "CASE",
    deliveryDate: "30.04.2026",
    plant: "US02",
    purchasingGroup: "FAC",
    requester: "RBAKER",
    netPrice: 54.0,
    currency: "USD",
    status: "IN_PROCESS",
    createdOn: "22.04.2026",
  },
  {
    prNumber: "0010001237",
    item: "00010",
    material: "COFFEE-KCUP-220",
    description: "Coffee K-Cups, Assorted, 220-count",
    quantity: 6,
    unit: "PAC",
    deliveryDate: "27.04.2026",
    plant: "US01",
    purchasingGroup: "FAC",
    requester: "JDAVIS",
    netPrice: 78.99,
    currency: "USD",
    status: "OPEN",
    createdOn: "23.04.2026",
  },
  {
    prNumber: "0010001238",
    item: "00010",
    material: "LAPTOP-DELL-5540",
    description: "Dell Latitude 5540 Laptop, i7/16GB/512GB",
    quantity: 2,
    unit: "EA",
    deliveryDate: "15.05.2026",
    plant: "US01",
    purchasingGroup: "IT1",
    requester: "SCHEN",
    netPrice: 1849.0,
    currency: "USD",
    status: "BLOCKED",
    createdOn: "18.04.2026",
  },
  {
    prNumber: "0010001239",
    item: "00010",
    material: "SAFETY-GOGGLES-ANSI",
    description: "Safety Goggles, ANSI Z87.1, Anti-Fog",
    quantity: 24,
    unit: "EA",
    deliveryDate: "28.04.2026",
    plant: "US02",
    purchasingGroup: "LAB",
    requester: "MLOPEZ",
    netPrice: 14.25,
    currency: "USD",
    status: "CLOSED",
    createdOn: "10.04.2026",
  },
];
