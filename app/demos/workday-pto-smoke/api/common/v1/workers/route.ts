// GET /common/v1/workers
//
// Workers directory list. Real Workday's `/common/v1/workers` returns the
// tenant's full worker roster paginated; the mock seeds 5 demo personas.
//
// Filter params:
//   - email   — exact-match (case-insensitive) on primaryWorkEmail
//   - search  — substring match against displayName / employeeId / email
//
// Response envelope: { "data": [...], "total": N }

import { NextRequest, NextResponse } from "next/server";
import { listWorkers } from "../../../../_lib/store";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const intParam = (key: string, dflt: number, max?: number): number => {
    const raw = url.searchParams.get(key);
    if (raw === null || raw === "") return dflt;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return dflt;
    return max ? Math.min(n, max) : n;
  };
  const limit = intParam("limit", 100, 100);
  const offset = intParam("offset", 0);

  // Defensive value handling — same shape as the other mocks.
  const empty = (v: string | null) => {
    if (v === null) return true;
    const lc = v.trim().toLowerCase();
    return (
      lc === "" ||
      lc === "null" ||
      lc === "undefined" ||
      lc === "email" ||
      lc === "search"
    );
  };
  const emailRaw = url.searchParams.get("email");
  const emailKey = empty(emailRaw) ? null : emailRaw!.trim().toLowerCase();
  const searchRaw = url.searchParams.get("search");
  const searchKey = empty(searchRaw) ? null : searchRaw!.trim().toLowerCase();

  const all = listWorkers();
  const filtered = all.filter((w) => {
    if (emailKey && w.email.toLowerCase() !== emailKey) return false;
    if (searchKey) {
      const haystack =
        `${w.displayName} ${w.employeeId} ${w.email}`.toLowerCase();
      if (!haystack.includes(searchKey)) return false;
    }
    return true;
  });
  const paged = filtered.slice(offset, offset + limit);

  const data = paged.map((w) => ({
    id: w.wid,
    descriptor: w.displayName,
    employeeId: w.employeeId,
    email: w.email,
    primaryWorkEmail: w.email,
    name: { formatted: w.displayName },
    primaryJob: {
      title: w.positionTitle,
      supervisoryOrganization: { descriptor: w.supervisoryOrg },
      costCenter: { id: w.costCenter, descriptor: w.costCenter },
    },
    hireDate: w.hireDate,
  }));

  return NextResponse.json({ data, total: filtered.length });
}
