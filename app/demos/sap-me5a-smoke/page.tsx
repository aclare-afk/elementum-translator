// SAP ME5A smoke mock — List Display of Purchase Requisitions.
//
// Smoke-level: a single transaction page that exercises SapShell +
// SelectionScreen + AlvGrid + StatusDot against 6 seed PRs. The point is to
// render the SAP GUI chrome on Vercel so the SE can screenshot the result.
//
// The selection-screen inputs are real state (PR number range + requester +
// plant + status checkboxes) and filter the seed list locally. Double-click a
// row to land on a placeholder detail page (ME53N-equivalent) — no routing
// past that, since this is a smoke.
//
// Fidelity anchor: PLATFORMS/sap.md § COMMON SE SCENARIOS > "[REAL] Purchase
// Requisition list + detail via ME5A". All shapes/labels pulled from that
// file.

"use client";

import { useMemo, useState } from "react";
import {
  SapShell,
  SelectionScreen,
  AlvGrid,
  StatusDot,
  sapPrStatus,
  type AlvColumn,
  type SelectionField,
  type SelectionCheckbox,
} from "@/components/platforms/sap";
import { seedPRs, type PurchaseRequisition } from "./data/prs";
import type { SapPrStatus } from "./data/types";

export default function SapMe5aSmokePage() {
  // Selection-screen state
  const [prFrom, setPrFrom] = useState("");
  const [prTo, setPrTo] = useState("");
  const [plant, setPlant] = useState("");
  const [requester, setRequester] = useState("");
  const [statusFilters, setStatusFilters] = useState<Record<SapPrStatus, boolean>>({
    OPEN: true,
    RELEASED: true,
    IN_PROCESS: true,
    BLOCKED: true,
    CLOSED: false, // ME5A default: hide closed
  });

  // Last-message status for the GUI status bar.
  const [statusMsg, setStatusMsg] = useState<
    { kind: "info" | "warning" | "error"; text: string } | undefined
  >(undefined);

  // Apply filters to the seed list — this mimics what ME5A does after F8.
  const rows = useMemo(() => {
    return seedPRs.filter((pr) => {
      if (!statusFilters[pr.status]) return false;
      if (prFrom && pr.prNumber < prFrom) return false;
      if (prTo && pr.prNumber > prTo) return false;
      if (plant && !pr.plant.toLowerCase().includes(plant.toLowerCase()))
        return false;
      if (
        requester &&
        !pr.requester.toLowerCase().includes(requester.toLowerCase())
      )
        return false;
      return true;
    });
  }, [prFrom, prTo, plant, requester, statusFilters]);

  const activeStatusCount =
    Object.values(statusFilters).filter(Boolean).length;

  // Selection screen fields
  const fields: SelectionField[] = [
    {
      kind: "range",
      label: "PR Number",
      from: prFrom,
      to: prTo,
      onFromChange: setPrFrom,
      onToChange: setPrTo,
    },
    {
      kind: "single",
      label: "Plant",
      value: plant,
      onChange: setPlant,
    },
    {
      kind: "single",
      label: "Requester",
      value: requester,
      onChange: setRequester,
    },
    {
      kind: "multi",
      label: "Purchasing Group",
      count: 0,
    },
  ];

  const statusCheckboxes: SelectionCheckbox[] = (
    Object.keys(sapPrStatus) as SapPrStatus[]
  ).map((code) => ({
    label: sapPrStatus[code].label,
    checked: statusFilters[code],
    onChange: (v) => setStatusFilters((s) => ({ ...s, [code]: v })),
  }));

  // ALV grid columns — note `mono: false` for Status since it renders a dot.
  const columns: AlvColumn<PurchaseRequisition>[] = [
    { key: "prNumber", label: "PR No.", render: (r) => r.prNumber, width: "110px" },
    { key: "item", label: "Item", render: (r) => r.item, width: "55px" },
    { key: "material", label: "Material", render: (r) => r.material, width: "170px" },
    {
      key: "description",
      label: "Short Text",
      render: (r) => r.description,
      width: "280px",
    },
    {
      key: "quantity",
      label: "Qty",
      render: (r) => r.quantity.toString(),
      width: "55px",
      align: "right",
    },
    { key: "unit", label: "Unit", render: (r) => r.unit, width: "55px" },
    {
      key: "netPrice",
      label: "Net Price",
      render: (r) =>
        r.netPrice.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      width: "90px",
      align: "right",
    },
    { key: "currency", label: "Crcy", render: (r) => r.currency, width: "50px" },
    {
      key: "deliveryDate",
      label: "Deliv. Date",
      render: (r) => r.deliveryDate,
      width: "95px",
    },
    { key: "plant", label: "Plant", render: (r) => r.plant, width: "60px" },
    {
      key: "requester",
      label: "Requester",
      render: (r) => r.requester,
      width: "90px",
    },
    {
      key: "status",
      label: "Status",
      width: "130px",
      mono: false,
      render: (r) => (
        <StatusDot
          label={sapPrStatus[r.status].label}
          color={sapPrStatus[r.status].color}
        />
      ),
    },
  ];

  return (
    <SapShell
      transactionCode="ME5A"
      transactionTitle="List Display of Purchase Requisitions"
      menuExtras={["Environment", "List"]}
      system={{
        systemId: "PRD",
        client: "100",
        language: "EN",
        user: "JDAVIS",
      }}
      status={statusMsg}
      onExecuteTxn={(code) => {
        // In a real SAP GUI, typing another txn code + Enter jumps there. We
        // don't route, we just show a status message so the button feels live.
        if (code && code !== "ME5A") {
          setStatusMsg({
            kind: "info",
            text: `Transaction ${code} is not implemented in this smoke mock.`,
          });
        } else {
          setStatusMsg(undefined);
        }
      }}
    >
      <SelectionScreen
        title="Dynamic selections — purchase requisitions"
        fields={fields}
        statusFilters={statusCheckboxes}
        onExecute={() =>
          setStatusMsg({
            kind: "info",
            text: `${rows.length} requisitions selected · ${activeStatusCount} status flags active`,
          })
        }
        onReset={() => {
          setPrFrom("");
          setPrTo("");
          setPlant("");
          setRequester("");
          setStatusFilters({
            OPEN: true,
            RELEASED: true,
            IN_PROCESS: true,
            BLOCKED: true,
            CLOSED: false,
          });
          setStatusMsg(undefined);
        }}
      />

      <AlvGrid
        title="Purchase Requisitions"
        summary={`${rows.length} entries · Variant /STANDARD`}
        columns={columns}
        rows={rows}
        rowKey={(r) => `${r.prNumber}-${r.item}`}
        onOpen={(r) =>
          setStatusMsg({
            kind: "info",
            text: `ME53N would open here for PR ${r.prNumber} · ${r.description}`,
          })
        }
      />
    </SapShell>
  );
}
