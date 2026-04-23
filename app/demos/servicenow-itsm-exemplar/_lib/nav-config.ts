// Navigator config for this mock. Drives the left rail.
import type { SidebarApplication } from "@/components/platforms/servicenow";

const base = "/demos/servicenow-itsm-exemplar";

export const navConfig: SidebarApplication[] = [
  {
    label: "Self-Service",
    defaultOpen: false,
    modules: [
      { label: "Homepage", href: base },
      { label: "Dashboards", href: base },
      { label: "Service Catalog", href: base },
    ],
  },
  {
    label: "Incident",
    defaultOpen: true,
    modules: [
      { label: "Create New", href: `${base}/incidents?new=1` },
      { label: "All", href: `${base}/incidents` },
      { label: "Open", href: `${base}/incidents?state=open` },
      { label: "Assigned to me", href: `${base}/incidents?mine=1` },
      { label: "Critical", href: `${base}/incidents?priority=1` },
    ],
  },
  {
    label: "Change",
    modules: [
      { label: "All", href: base },
      { label: "Open", href: base },
    ],
  },
  {
    label: "Problem",
    modules: [
      { label: "All", href: base },
      { label: "Open", href: base },
    ],
  },
  {
    label: "Configuration",
    modules: [
      { label: "CMDB", href: base },
      { label: "Servers", href: base },
    ],
  },
];
