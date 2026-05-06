// POST /demos/jira-software-smoke/oauth/token
//
// Mock Atlassian OAuth 2.0 (3LO) token endpoint. Real Atlassian Cloud
// auth flows POST to https://auth.atlassian.com/oauth/token after the
// user grants consent at https://auth.atlassian.com/authorize. The mock
// keeps the same path suffix (/oauth/token) so the URL pattern reads
// correctly when an SE shows it on screen.
//
// Matches PLATFORMS/jira.md § AUTH:
//   - Supported grants: authorization_code, refresh_token, client_credentials
//   - Response envelope: { access_token, expires_in, token_type, scope, refresh_token? }
//   - JSON request body is also accepted (Atlassian docs show JSON examples)
//   - 400 on missing/unsupported grant, 401 on missing client_id

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

  // Atlassian access tokens are long opaque strings. Reference:
  // https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/
  const response: Record<string, unknown> = {
    access_token: genToken(48),
    expires_in: 3600, // 1 hour — Atlassian default
    token_type: "Bearer",
    scope:
      body.scope ??
      "read:jira-work read:jira-user write:jira-work offline_access",
  };
  if (body.grant_type !== "client_credentials") {
    response.refresh_token = genToken(48);
  }

  return NextResponse.json(response);
}
