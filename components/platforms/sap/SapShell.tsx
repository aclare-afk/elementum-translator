// SAP GUI transaction shell: header strip + menu bar + standard toolbar +
// transaction code input + content area + status bar.
// Source: PLATFORMS/sap.md § UI PATTERNS > SAP GUI — transaction shell.
// Every SAP GUI mock layout.tsx wraps its page with this. Each SAP transaction
// (ME5A, ME51N, ME21N, ME53N, etc.) uses the exact same chrome, only the
// content area differs.
//
// The header/menu/toolbar are stateless and purely visual — nothing wires up
// real SAP actions. The transaction code input is an uncontrolled text box
// with an Execute (checkmark) button; demos can pass `onExecuteTxn` if they
// want typing `ME5A` + Enter to navigate.

"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  DoorOpen,
  X,
  Save,
  Printer,
  Search,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Check,
  HelpCircle,
  Info,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { DemoBanner } from "./DemoBanner";
import { sapColors, sapFont, sapLayout } from "./design-tokens";

type SapSystemInfo = {
  systemId?: string; // e.g., "PRD"
  client?: string; // e.g., "100"
  language?: string; // e.g., "EN"
  user?: string; // SAP user ID, usually ALL-CAPS (e.g., "JDAVIS")
};

type StatusMessage = {
  kind: "info" | "warning" | "error";
  text: string;
};

type SapShellProps = {
  /**
   * The current transaction code (e.g., "ME5A"). Shown in the transaction
   * code input on load. The title below uses `transactionTitle` if provided.
   */
  transactionCode?: string;
  transactionTitle?: string; // e.g., "List Display of Purchase Requisitions"
  onExecuteTxn?: (code: string) => void;
  system?: SapSystemInfo;
  status?: StatusMessage;
  /** Transaction-specific menu items inserted between Goto and System. */
  menuExtras?: string[];
  children: ReactNode;
};

export function SapShell({
  transactionCode = "",
  transactionTitle,
  onExecuteTxn,
  system = {},
  status,
  menuExtras = [],
  children,
}: SapShellProps) {
  const [txn, setTxn] = useState(transactionCode);
  const {
    systemId = "PRD",
    client = "100",
    language = "EN",
    user = "JDAVIS",
  } = system;

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: sapColors.page,
        color: sapColors.textPrimary,
        fontFamily: sapFont.family,
        fontSize: sapFont.sizeBody,
      }}
    >
      <DemoBanner />

      {/* 1. Header strip — SAP wordmark / user / client / lang / time / SID */}
      <header
        className="flex items-center justify-between px-3"
        style={{
          height: sapLayout.headerHeight,
          background: sapColors.brandBlue,
          color: sapColors.textOnDark,
          fontSize: sapFont.sizeLabel,
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold tracking-wide">SAP</span>
          {transactionTitle && (
            <span className="text-[11px] opacity-90">{transactionTitle}</span>
          )}
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] opacity-90">
          <span>{user}</span>
          <span>•</span>
          <span>
            {systemId} / {client} / {language}
          </span>
        </div>
      </header>

      {/* 2. Menu bar — Menu / Edit / Goto / ... / System / Help */}
      <nav
        className="flex items-center gap-0 border-b px-2"
        style={{
          height: sapLayout.menuBarHeight,
          background: sapColors.surfaceAlt,
          borderColor: sapColors.divider,
          fontSize: sapFont.sizeLabel,
        }}
      >
        {["Menu", "Edit", "Goto", ...menuExtras, "System", "Help"].map((m) => (
          <button
            key={m}
            className="px-2 py-0.5 hover:bg-black/5"
            style={{ color: sapColors.textPrimary }}
          >
            {m}
          </button>
        ))}
      </nav>

      {/* 3. Standard toolbar */}
      <div
        className="flex items-center gap-1 border-b px-2"
        style={{
          height: sapLayout.toolbarHeight,
          background: sapColors.brandBlueDark,
          borderColor: sapColors.divider,
        }}
      >
        {/* Transaction code input — left side */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onExecuteTxn?.(txn.trim().toUpperCase());
          }}
          className="flex items-center gap-1"
        >
          <input
            value={txn}
            onChange={(e) => setTxn(e.target.value)}
            aria-label="Transaction code"
            className="rounded-sm border px-2 py-0.5 uppercase"
            style={{
              width: sapLayout.txnInputWidth,
              fontFamily: sapFont.familyMono,
              fontSize: sapFont.sizeTxn,
              background: sapColors.surface,
              borderColor: sapColors.divider,
              color: sapColors.textPrimary,
            }}
            spellCheck={false}
          />
          <button
            type="submit"
            aria-label="Execute (Enter)"
            title="Execute (Enter)"
            className="flex h-5 w-5 items-center justify-center rounded-sm"
            style={{
              background: sapColors.surface,
              color: sapColors.statusReleased,
              border: `1px solid ${sapColors.divider}`,
            }}
          >
            <Check size={12} strokeWidth={3} />
          </button>
        </form>

        <span
          className="mx-2 h-4 w-px"
          style={{ background: "rgba(255,255,255,0.25)" }}
        />

        {/* Icon-only buttons: Back / Exit / Cancel / Save / Print / Find / paging */}
        <ToolbarIcon label="Back (F3)" icon={<ArrowLeft size={14} />} />
        <ToolbarIcon label="Exit (Shift+F3)" icon={<DoorOpen size={14} />} />
        <ToolbarIcon label="Cancel (F12)" icon={<X size={14} />} />

        <span
          className="mx-2 h-4 w-px"
          style={{ background: "rgba(255,255,255,0.25)" }}
        />

        <ToolbarIcon label="Save (Ctrl+S)" icon={<Save size={14} />} />
        <ToolbarIcon label="Print (Ctrl+P)" icon={<Printer size={14} />} />
        <ToolbarIcon label="Find (Ctrl+F)" icon={<Search size={14} />} />

        <span
          className="mx-2 h-4 w-px"
          style={{ background: "rgba(255,255,255,0.25)" }}
        />

        <ToolbarIcon label="First page" icon={<ChevronsLeft size={14} />} />
        <ToolbarIcon label="Previous page" icon={<ChevronLeft size={14} />} />
        <ToolbarIcon label="Next page" icon={<ChevronRight size={14} />} />
        <ToolbarIcon label="Last page" icon={<ChevronsRight size={14} />} />

        <span className="ml-auto">
          <ToolbarIcon label="Help (F1)" icon={<HelpCircle size={14} />} />
        </span>
      </div>

      {/* 4. Content area */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* 5. Status bar */}
      <footer
        className="flex items-center gap-2 border-t px-2"
        style={{
          height: sapLayout.statusBarHeight,
          background: sapColors.surfaceAlt,
          borderColor: sapColors.divider,
          fontSize: sapFont.sizeLabel,
          color: sapColors.textMuted,
        }}
      >
        {status ? (
          <StatusLine {...status} />
        ) : (
          <span className="font-mono text-[10px]">
            {systemId} ({client}) {transactionCode || ""}
          </span>
        )}
      </footer>
    </div>
  );
}

function ToolbarIcon({
  label,
  icon,
}: {
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      className="flex h-5 w-5 items-center justify-center rounded-sm hover:bg-white/10"
      style={{ color: sapColors.textOnDark }}
    >
      {icon}
    </button>
  );
}

function StatusLine({ kind, text }: StatusMessage) {
  const { color, Icon } =
    kind === "error"
      ? { color: sapColors.statusBlocked, Icon: XCircle }
      : kind === "warning"
      ? { color: sapColors.statusPending, Icon: AlertTriangle }
      : { color: sapColors.statusInProcess, Icon: Info };
  return (
    <span className="flex items-center gap-1.5">
      <Icon size={12} style={{ color }} />
      <span style={{ color: sapColors.textPrimary }}>{text}</span>
    </span>
  );
}
