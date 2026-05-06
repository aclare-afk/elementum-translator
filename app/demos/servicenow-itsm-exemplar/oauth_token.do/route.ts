// POST /demos/servicenow-itsm-exemplar/oauth_token.do
//
// Mock ServiceNow OAuth 2.0 token endpoint. Lets an SE demo the auth dance
// live during a customer pitch instead of narrating "in a real instance,
// you'd POST to /oauth_token.do with grant_type=password..." — they can
// see the form-encoded request and the bearer come back in the response.
//
// Matches PLATFORMS/servicenow.md § AUTH:
//   - Form-urlencoded request body (real ServiceNow rejects JSON here)
//   - Supported grants: password, client_credentials, refresh_token,
//     authorization_code, urn:ietf:params:oauth:grant-type:jwt-bearer
//   - Response envelope: { access_token, refresh_token, expires_in, scope,
//     token_type: "Bearer" }
//   - 401 on invalid_client, 400 on missing/unsupported grant
//
// Auth note: the mock generates fresh tokens on every call. The existing
// /api/now/table/incident endpoints DON'T validate the bearer (they accept
// any auth header). So the OAuth endpoint is a standalone "show the auth
// flow works" affordance — it doesn't gate the rest of the API.

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  genToken,
  oauthError,
  parseOAuthBody,
  validateClientId,
  validateGrantType,
} from "../../../../lib/oauth";

const SUPPORTED_GRANTS = [
  "password",
  "client_credentials",
  "refresh_token",
  "authorization_code",
  "urn:ietf:params:oauth:grant-type:jwt-bearer",
] as const;

export async function POST(req: NextRequest) {
  const body = await parseOAuthBody(req);

  const grantErr = validateGrantType(body, SUPPORTED_GRANTS);
  if (grantErr) return grantErr;

  const clientErr = validateClientId(body);
  if (clientErr) return clientErr;

  // For password grant, validate username is present. Real ServiceNow
  // requires both username AND password — the mock only checks username
  // is non-empty so demos don't need to template a real password.
  if (body.grant_type === "password") {
    if (!body.username || body.username.trim() === "") {
      return oauthError(
        400,
        "invalid_grant",
        "password grant requires username",
      );
    }
  }

  // For refresh_token grant, validate refresh_token is present. The mock
  // doesn't actually verify it's a previously-issued token — any non-empty
  // string passes. Real ServiceNow tracks refresh tokens in oauth_token table.
  if (body.grant_type === "refresh_token") {
    if (!body.refresh_token || body.refresh_token.trim() === "") {
      return oauthError(
        400,
        "invalid_grant",
        "refresh_token grant requires refresh_token",
      );
    }
  }

  // Issue tokens. ServiceNow's response shape is well-documented:
  // https://docs.servicenow.com/bundle/washingtondc-platform-security/page/administer/security/concept/c_OAuthApplications.html
  return NextResponse.json({
    access_token: genToken(32),
    refresh_token: genToken(32),
    scope: body.scope ?? "useraccount",
    token_type: "Bearer",
    expires_in: 1800, // 30 minutes — ServiceNow default
  });
}
