// Shared status type for the ME5A smoke mock. Matches the `sapPrStatus` map
// keys exported by the SAP chrome tokens.
export type SapPrStatus =
  | "OPEN"
  | "RELEASED"
  | "IN_PROCESS"
  | "BLOCKED"
  | "CLOSED";
