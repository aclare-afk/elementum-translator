// Case record-page tab strip — client component because tabs need
// `useState` for the active-tab toggle, but the parent server component
// is the one that builds the section list (it has the database lookup).
//
// The standard tab set on a Service Cloud Case page is Details / Related /
// News / Activity / Chatter. We keep Details + Related + Activity + Chatter
// — News is org-licensed and rarely on by default in newer orgs, so it
// would surprise SEs to see it. Only Details has real content; the others
// render a muted placeholder so an SE walking through the demo can see
// the tabs respond, but isn't tempted to drill into hollow rails.
//
// Fidelity anchor: PLATFORMS/salesforce.md § UI PATTERNS > Record page >
// Tabs row.

"use client";

import { useState } from "react";
import {
  Tabs,
  DetailsGrid,
  salesforceColors,
  salesforceFont,
  type DetailSection,
  type TabItem,
} from "@/components/platforms/salesforce-shared";

const TABS: TabItem[] = [
  { id: "details", label: "Details" },
  { id: "related", label: "Related" },
  { id: "activity", label: "Activity" },
  { id: "chatter", label: "Chatter" },
];

type CaseTabsProps = {
  sections: DetailSection[];
};

export function CaseTabs({ sections }: CaseTabsProps) {
  const [activeId, setActiveId] = useState<string>("details");

  return (
    <Tabs items={TABS} activeId={activeId} onChange={setActiveId}>
      {activeId === "details" && <DetailsGrid sections={sections} />}
      {activeId === "related" && (
        <Placeholder
          title="Related"
          message="Related lists (Case Comments, Case History, Emails, Tasks) live on this tab in real Salesforce. Out of scope for the smoke."
        />
      )}
      {activeId === "activity" && (
        <Placeholder
          title="Activity"
          message="Open and logged Tasks, Events, and Emails for this Case. Out of scope for the smoke."
        />
      )}
      {activeId === "chatter" && (
        <Placeholder
          title="Chatter"
          message="Internal feed posts and @-mentions. Out of scope for the smoke."
        />
      )}
    </Tabs>
  );
}

function Placeholder({ title, message }: { title: string; message: string }) {
  return (
    <section
      className="rounded-[4px] border bg-white p-6 text-center"
      style={{
        borderColor: salesforceColors.border,
        fontFamily: salesforceFont.family,
      }}
    >
      <h3
        className="mb-1 text-[13px] font-bold"
        style={{ color: salesforceColors.textHeading }}
      >
        {title}
      </h3>
      <p
        className="text-[12px]"
        style={{ color: salesforceColors.textWeak }}
      >
        {message}
      </p>
    </section>
  );
}
