// POST /demos/jsm-queue-smoke/oauth/token
//
// Mock Atlassian OAuth 2.0 token endpoint scoped for JSM. Same Atlassian
// 3LO flow as Jira Software (both products live behind id.atlassian.com)
// but with JSM-specific scopes returned. Kept as a separate endpoint so
// each demo's URL story is self-contained (you can curl the JSM-flavored
// token endpoint without going through the Jira Software demo).
//
// Matches PLATFORMS/jira.md § AUTH > JSM section:
//   - Supported grants: authorization_code, refresh_token, client_credentials
//   - Default scope includes JSM-specific permissions (manage:servicedesk-customer,
//     read:servicedesk-request, write:servicedesk-request)

import { NextRequest, NextResponse } from "next/server";
import {
  genToken,
  oauthError,
  parseOAuthBody,
  validateClientId,
  validateGrantType,
} from "../../../../../lib/oauth";

const SUPPORTED_GRANTS = [
  "authorization_code",
  "refresh_token",
  "client_credentials",
] as const;

export async function POST(req: NextRequest) {
  const body = await parseOAuthBody(req);

  const grantErr = validateGrantType(body, SUPPORTED_GRANTS);
  if (grantErr) return grantErr;

  const clientErr = validateClientId(body);
  if (clientErr) return clientErr;

  if (body.grant_type === "authorization_code" && !body.code) {
    return oauthError(
      400,
      "invalid_grant",
      "authorization_code grant requires code",
    );
  }
  if (body.grant_type === "refresh_token" && !body.refresh_token) {
    return oauthError(
      400,
      "invalid_grant",
      "refresh_token grant requires refresh_token",
    );
  }

  const response: Record<string, unknown> = {
    access_token: genToken(48),
    expires_in: 3600,
    token_type: "Bearer",
    scope:
      body.scope ??
      "read:servicedesk-request write:servicedesk-request manage:servicedesk-customer offline_access",
  };
  if (body.grant_type !== "client_credentials") {
    response.refresh_token = genToken(48);
  }

  return NextResponse.json(response);
}
