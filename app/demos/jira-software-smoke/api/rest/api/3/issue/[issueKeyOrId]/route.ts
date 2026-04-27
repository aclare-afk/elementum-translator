// GET /rest/api/3/issue/{issueIdOrKey}
//
// Real Jira accepts either the numeric id (`10101`) or the issue key
// (`WEB-145`) as the path param. The mock does the same.
//
// URL path mirrors the real Jira Cloud REST API exactly
// (PLATFORMS/jira.md § Issue — single issue read).
//
// Auth note: real Jira requires Basic + API token, OAuth 2.0 (3LO), Forge
// JWT, or Connect HS256 JWT. The mock accepts any Authorization header (or
// none) so SEs can demo without provisioning creds.

import { NextRequest, NextResponse } from "next/server";
import {
  getIssueByKey,
  getIssueById,
  shapeIssueForRest,
} from "../../../../../../_lib/store";

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

  // Issue keys always look like `<PROJECT>-<n>` (e.g., `WEB-145`). Anything
  // else is treated as a numeric id. If both lookups miss, return 404 with
  // Jira's canonical error envelope.
  const record = /^[A-Z][A-Z0-9_]*-\d+$/.test(issueKeyOrId)
    ? await getIssueByKey(issueKeyOrId)
    : (await getIssueById(issueKeyOrId)) ??
      (await getIssueByKey(issueKeyOrId));

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

  return NextResponse.json(shapeIssueForRest(record, baseUrl(req)), {
    status: 200,
  });
}
