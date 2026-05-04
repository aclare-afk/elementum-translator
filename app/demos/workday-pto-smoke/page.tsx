// Workday PTO smoke — home page (worklet grid).
//
// Server Component. Renders the iconic Workday "tenant home" surface: a
// grid of clickable worklet tiles. The Time Off tile links to the worklet
// detail page where the agent-created absence requests show up.
//
// Fidelity anchor: PLATFORMS/workday.md § UI PATTERNS > Home page.

import {
  Calendar,
  Wallet,
  Heart,
  Receipt,
  User,
  Inbox,
  Bell,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import {
  WorkletGrid,
  type Worklet,
} from "@/components/platforms/workday";
import { listAbsenceRequests, listBalancesForWorker } from "./_lib/store";
import { defaultViewerWid } from "./data/workers";

export const dynamic = "force-dynamic";

function icon(I: LucideIcon) {
  return <I size={20} aria-hidden />;
}

export default async function WorkdayPtoHomePage() {
  // For the Time Off worklet's sublabel, surface the viewer's vacation
  // balance — gives the home page a small data tease that the worklet
  // detail page is worth clicking into.
  const balances = listBalancesForWorker(defaultViewerWid);
  const vacation = balances.find((b) => b.absenceTypeId === "VACATION");

  // Inbox count derived from the durable store — same shape the layout
  // uses, so the home tile and the top-bar inbox icon agree.
  const all = await listAbsenceRequests();
  const pendingCount = all.filter(
    (r) => r.state === "IN_PROGRESS" || r.state === "SUBMITTED",
  ).length;

  const worklets: Worklet[] = [
    {
      id: "time-off",
      label: "Time Off",
      sublabel: vacation
        ? `${vacation.balance} vacation hours available`
        : "Request vacation, sick, or personal time",
      icon: icon(Calendar),
      href: "/demos/workday-pto-smoke/time-off",
    },
    {
      id: "inbox",
      label: "Inbox",
      sublabel: pendingCount > 0 ? `${pendingCount} action${pendingCount === 1 ? "" : "s"}` : "All caught up",
      icon: icon(Inbox),
      count: pendingCount,
    },
    {
      id: "pay",
      label: "Pay",
      sublabel: "Pay statements, tax forms, direct deposit",
      icon: icon(Wallet),
    },
    {
      id: "benefits",
      label: "Benefits",
      sublabel: "Health, retirement, dependents",
      icon: icon(Heart),
    },
    {
      id: "expenses",
      label: "Expenses",
      sublabel: "Submit and track expense reports",
      icon: icon(Receipt),
    },
    {
      id: "personal",
      label: "Personal Information",
      sublabel: "Contact, address, emergency",
      icon: icon(User),
    },
    {
      id: "career",
      label: "Career",
      sublabel: "Goals, performance, learning",
      icon: icon(Briefcase),
    },
    {
      id: "notifications",
      label: "Notifications",
      sublabel: "System and approval updates",
      icon: icon(Bell),
    },
  ];

  return (
    <div>
      <h1 className="mb-4 text-[20px] font-semibold">Welcome back</h1>
      <WorkletGrid worklets={worklets} />
    </div>
  );
}
