// GET /rest/servicedeskapi/request/{issueIdOrKey}
//
// Real JSM accepts either the numeric id (`30101`) or the issue key
// (`ITH-412`) as the path param. The mock does the same.
//
// Fidelity anchor: PLATFORMS/jira.md § API SURFACE > JSM examples.

import { NextRequest, NextResponse } from "next/server";
import {
  getRequestByKey,
  getRequestById,
  shapeRequestForServiceDeskApi,
} from "../../../../../_lib/store";
import { serviceDesk } from "../../../../../data/requests";

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ issueKeyOrId: string }> },
) {
  const { issueKeyOrId } = await params;

  // Key lookup first — keys are always of the form `ITH-<n>` so we can tell
  // them from numeric ids cheaply. Fallback to id lookup.
  const record = /^[A-Z]+-\d+$/.test(issueKeyOrId)
    ? getRequestByKey(issueKeyOrId)
    : getRequestById(issueKeyOrId) ?? getRequestByKey(issueKeyOrId);

  if (!record) {
    return NextResponse.json(
      {
        errorMessages: [
          "Issue does not exist or you do not have permission to see it.",
        ],
        errors: {},
      },
      { status: 404 },
    );
  }

  const shaped = shapeRequestForServiceDeskApi(
    record,
    baseUrl(req),
    String(serviceDesk.id),
  );
  return NextResponse.json(shaped, { status: 200 });
}
