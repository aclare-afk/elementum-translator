// GET / POST /absenceManagement/v1/workers/{workerId}/absenceRequests
//
// Matches PLATFORMS/workday.md § API SURFACE > API Gateway:
//   - Response envelope is { "data": [...], "total": N } for list
//   - Single-resource POST returns the created resource directly
//   - 201 Created on POST, 200 OK on GET
//   - JSON only; auth header is read but not enforced in the mock
//
// The {workerId} path segment can be a WID (32-char hex), an Employee_ID
// (EMP-NNNNN), or an email (the agent-passed dynamic-submitter identity).
// Real Workday only accepts the WID; the mock relaxes this so the agent can
// hand off `submitterEmail` directly without a worker lookup.
//
// Auth note: a real tenant requires an OAuth bearer token. This mock accepts
// any Authorization header (or none) so SEs can demo without setting up
// creds. To demo the auth flow itself, wire a pre-request check here.

import { NextRequest, NextResponse } from "next/server";
import {
  applyAbsenceFilter,
  createAbsenceRequest,
  getAbsenceType,
  getWorker,
  getWorkerByEmail,
  listAbsenceRequestsForWorker,
  listWorkers,
  paginate,
  type StoredAbsenceRequest,
} from "../../../../../../_lib/store";

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

/**
 * Resolve a worker WID from a path segment that might be a WID, an
 * Employee_ID, or an email. The dynamic-submitter pattern often hands the
 * agent an email — we accept it here so the agent doesn't have to do an
 * extra lookup.
 *
 * Returns the WID if found, otherwise undefined.
 */
function resolveWorkerWid(workerKey: string): string | undefined {
  if (!workerKey) return undefined;
  const trimmed = workerKey.trim();
  // Email path
  if (trimmed.includes("@")) {
    return getWorkerByEmail(trimmed)?.wid;
  }
  // 32-char hex → assume it's already a WID. Validate by direct lookup.
  if (/^[a-f0-9]{32}$/i.test(trimmed)) {
    return getWorker(trimmed)?.wid;
  }
  // Otherwise treat as Employee_ID; scan workers for a match.
  const lc = trimmed.toLowerCase();
  return listWorkers().find((w) => w.employeeId.toLowerCase() === lc)?.wid;
}

function mockViewUrl(req: NextRequest, displayId: string): string {
  return `${baseUrl(req)}/demos/workday-onboarding-brennan/time-off/${displayId}`;
}

/**
 * Shape a stored absence request into the Workday REST response shape.
 * Includes a `descriptor` field (Workday's convention for human-readable
 * labels) and a `_mockViewUrl` non-standard pointer for demo convenience.
 */
function shape(
  r: StoredAbsenceRequest,
  req: NextRequest,
): Record<string, unknown> {
  const worker = getWorker(r.workerWid);
  const type = getAbsenceType(r.absenceTypeId);
  return {
    id: r.wid,
    descriptor: r.absenceRequestId,
    absenceRequestId: r.absenceRequestId,
    worker: worker
      ? {
          id: worker.wid,
          descriptor: worker.displayName,
          employeeId: worker.employeeId,
          email: worker.email,
        }
      : { id: r.workerWid, descriptor: "Unknown Worker" },
    absenceType: type
      ? { id: type.id, descriptor: type.label, unit: type.unit }
      : { id: r.absenceTypeId, descriptor: r.absenceTypeId },
    from: r.from,
    to: r.to,
    hoursPerDay: r.hoursPerDay,
    totalHours: r.totalHours,
    state: r.state,
    comment: r.comment ?? "",
    submittedAt: r.submittedAt,
    lastModifiedAt: r.lastModifiedAt,
    _mockViewUrl: mockViewUrl(req, r.absenceRequestId),
  };
}

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json({ error: code, message }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workerId: string }> },
) {
  const { workerId } = await params;
  const wid = resolveWorkerWid(workerId);
  if (!wid) {
    return errorResponse(
      404,
      "WORKER_NOT_FOUND",
      `No worker matched ${workerId}`,
    );
  }

  const url = new URL(req.url);
  // Pagination — Workday's defaults are limit=100, offset=0, max=100.
  const intParam = (key: string, dflt: number, max?: number): number => {
    const raw = url.searchParams.get(key);
    if (raw === null || raw === "") return dflt;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) return dflt;
    return max ? Math.min(n, max) : n;
  };
  const limit = intParam("limit", 100, 100);
  const offset = intParam("offset", 0);

  const all = await listAbsenceRequestsForWorker(wid);
  const filtered = applyAbsenceFilter(all, url.searchParams);
  const paged = paginate(filtered, limit, offset);

  return NextResponse.json({
    data: paged.map((r) => shape(r, req)),
    total: filtered.length,
  });
}

// Defensive value handling per SKILL.md § "Search/filter endpoints —
// defensive value handling". Same shape we use on the SAP and ServiceNow
// mocks: when the agent doesn't actually populate a chip, Elementum's chip
// system substitutes the chip's parameter NAME as the literal value. Strip
// those values so they don't get persisted.
const BODY_CHIP_LITERALS = new Set([
  "worker",
  "workerid",
  "worker_id",
  "absencetype",
  "absence_type",
  "from",
  "to",
  "hoursperday",
  "hours_per_day",
  "comment",
  "submitteremail",
  "submitter_email",
  "submittername",
  "submitter_name",
]);

function cleanString(key: string, raw: string): string | undefined {
  const lc = raw.trim().toLowerCase();
  if (lc === "" || lc === "null" || lc === "undefined") return undefined;
  if (lc === key.toLowerCase()) return undefined;
  if (BODY_CHIP_LITERALS.has(lc)) return undefined;
  return raw;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workerId: string }> },
) {
  const { workerId } = await params;

  // Body parse
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return errorResponse(400, "INVALID_BODY", "Request body must be JSON");
  }

  // Resolve the worker. Path takes priority, body.worker / body.email is a
  // fallback for callers that template the worker into the body instead.
  let workerWid =
    resolveWorkerWid(workerId) ??
    (typeof body.worker === "string"
      ? resolveWorkerWid(body.worker)
      : undefined) ??
    (typeof body.workerId === "string"
      ? resolveWorkerWid(body.workerId)
      : undefined) ??
    (typeof body.email === "string"
      ? resolveWorkerWid(body.email)
      : undefined) ??
    (typeof body.submitterEmail === "string"
      ? resolveWorkerWid(body.submitterEmail)
      : undefined);

  // Last resort: if the agent passed nothing usable, fall back to the seed
  // viewer so the mock stays demo-friendly. Real Workday would 404 here.
  if (!workerWid) {
    workerWid = resolveWorkerWid("alex.reeves@brennan.example");
  }
  if (!workerWid) {
    return errorResponse(
      400,
      "WORKER_REQUIRED",
      "Could not resolve a worker for this request",
    );
  }

  // Pull the absence type. Body field name is flexible: absenceType, type,
  // absenceTypeId — same defensive shape as the other mocks.
  const rawType =
    pickString(body, ["absenceType", "absenceTypeId", "type"]) ?? "VACATION";
  const cleanedType = cleanString("absenceType", rawType);
  const absenceTypeId = (cleanedType ?? "VACATION").toUpperCase();
  if (!getAbsenceType(absenceTypeId)) {
    return errorResponse(
      400,
      "INVALID_ABSENCE_TYPE",
      `${absenceTypeId} is not a configured absence type`,
    );
  }

  const fromRaw = pickString(body, ["from", "startDate", "start"]);
  const toRaw = pickString(body, ["to", "endDate", "end"]);
  const from = cleanString("from", fromRaw ?? "") ?? "";
  const to = cleanString("to", toRaw ?? "") ?? from;
  if (!from || !isYmd(from)) {
    return errorResponse(
      400,
      "INVALID_FROM",
      "from must be YYYY-MM-DD",
    );
  }
  const finalTo = to && isYmd(to) ? to : from;

  const hoursPerDayRaw = pickNumber(body, ["hoursPerDay", "hours_per_day"]);
  const hoursPerDay = Number.isFinite(hoursPerDayRaw) ? hoursPerDayRaw : 8;

  const commentRaw = pickString(body, ["comment", "reason"]);
  const comment = commentRaw ? cleanString("comment", commentRaw) : undefined;

  const created = await createAbsenceRequest({
    workerWid,
    absenceTypeId,
    from,
    to: finalTo,
    hoursPerDay,
    comment,
  });

  return NextResponse.json(shape(created, req), { status: 201 });
}

// ---- helpers --------------------------------------------------------------

function pickString(
  body: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = body[k];
    if (typeof v === "string") return v;
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

function pickNumber(
  body: Record<string, unknown>,
  keys: string[],
): number {
  for (const k of keys) {
    const v = body[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return NaN;
}

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
