// RecordKey — a clickable/hoverable link for a Salesforce record reference.
//
// Salesforce UIs don't typically show the raw 15/18-char ID in the main text
// flow — they show the record Name as a link. On hover, tooltips or copy
// affordances reveal the ID. This component renders the Name in link style
// and optionally shows the 18-char ID in small weak text below for mocks
// where the SE wants to explicitly call out the ID shape.
//
// Don't invent your own IDs. Use real-looking 18-char strings following the
// per-object key prefix (001... for Account, 003... for Contact, etc.) per
// PLATFORMS/salesforce.md § HYGIENE > Identifiers.

import { salesforceColors, salesforceFont } from "./design-tokens";

type RecordKeyProps = {
  /** The record's display Name field. Rendered as the primary link text. */
  name: string;
  /** 15- or 18-char Salesforce record ID. Rendered small and weak below Name when `showId`. */
  id: string;
  /** Show the ID on a second line. Defaults to false — IDs normally live in tooltips. */
  showId?: boolean;
  /** Optional click handler — consumers can route to /lightning/r/{sObject}/{id}/view. */
  onClick?: () => void;
};

export function RecordKey({ name, id, showId = false, onClick }: RecordKeyProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex flex-col items-start text-left hover:underline"
      style={{ fontFamily: salesforceFont.family }}
      title={id}
    >
      <span
        className="text-[13px]"
        style={{ color: salesforceColors.textLink }}
      >
        {name}
      </span>
      {showId && (
        <span
          className="text-[11px]"
          style={{
            color: salesforceColors.textWeak,
            fontFamily: salesforceFont.familyMono,
          }}
        >
          {id}
        </span>
      )}
    </button>
  );
}
