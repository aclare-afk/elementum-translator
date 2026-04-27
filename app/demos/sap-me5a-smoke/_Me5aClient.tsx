// Client-side ME5A list view. Receives serialized PRs from the server
// component `page.tsx`, owns the selection-screen state (PR number range,
// plant, requester, status checkboxes) and the ALV grid filtering. Split
// out of page.tsx because page.tsx is now a Server Component that reads
// from _lib/store.ts, and event handlers can't cross the server/client
// boundary.
//
// Pairs with the canonical PR detail page at /me53n/<prNumber>. Double-
// clicking a row routes there via Next.js client navigation — same URL
// that `_mockViewUrl` from the create API points at.
//
// Fidelity anchor: PLATFORMS/sap.md § UI PATTERNS > SAP GUI > ME5A report
// pattern.

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { type PurchaseRequisition } from "./data/prs";
import type { SapPrStatus } from "./data/types";

type Me5aClientProps = {
  rows: PurchaseRequisition[];
};

export function Me5aClient({ rows: allRows }: Me5aClientProps) {
  const router = useRouter();

  // Selection-screen state ------------------------------------------------
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

  // Apply filters to the list — this mimics what ME5A does after F8.
  const rows = useMemo(() => {
    return allRows.filter((pr) => {
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
  }, [allRows, prFrom, prTo, plant, requester, statusFilters]);

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

  // ALV grid columns. `mono: false` for Status renders a colored dot.
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
        // In a real SAP GUI, typing another txn code + Enter jumps there.
        // We only route ME53N + ME5A; everything else surfaces a status
        // message so the button still feels live.
        if (!code || code === "ME5A") {
          setStatusMsg(undefined);
          return;
        }
        if (code === "ME53N") {
          // ME53N without a key — hint the SE that this is double-click on
          // a row in real life.
          setStatusMsg({
            kind: "info",
            text:
              "Open a PR by double-clicking a row — that's the ME5A → ME53N drill-in.",
          });
          return;
        }
        setStatusMsg({
          kind: "info",
          text: `Transaction ${code} is not implemented in this smoke mock.`,
        });
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
        onOpen={(r) => {
          // Double-click → ME53N. Same URL that `_mockViewUrl` from the
          // create API points at, so the SE can verify both paths land on
          // the same screen.
          router.push(`/demos/sap-me5a-smoke/me53n/${r.prNumber}`);
        }}
      />
    </SapShell>
  );
}
