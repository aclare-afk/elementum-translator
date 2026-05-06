// POST /demos/workday-pto-smoke/ccx/oauth2/{tenant}/token
//
// Mock Workday OAuth 2.0 token endpoint. Real Workday tenants expose this
// at https://<pod>/ccx/oauth2/<tenant>/token. The {tenant} segment is
// part of the URL because Workday tokens are scoped to a single tenant —
// you can't use a token from `acme_dpt1` against `globex` even if the
// pod is the same.
//
// Matches PLATFORMS/workday.md § AUTH:
//   - Refresh-token grant is the dominant flow (long-lived RT issued at
//     API Client setup, exchanged for short-lived AT)
//   - Authorization-code grant supported when a user is in the loop
//   - Response envelope: { access_token, expires_in, token_type: "Bearer" }
//   - Bare-bones — no scope or instance_url like Salesforce

import { NextRequest, NextResponse } from "next/server";
import {
  genToken,
  oauthError,
  parseOAuthBody,
  validateClientId,
  validateGrantType,
} from "../../../../../../../lib/oauth";

const SUPPORTED_GRANTS = [
  "refresh_token",
  "authorization_code",
] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> },
) {
  const { tenant } = await params;

  // Validate tenant slug. Real Workday returns a 404 on unknown tenants;
  // the mock accepts any slug since we don't enforce a tenant registry,
  // but reject empty strings to mirror the real shape on bad input.
  if (!tenant || tenant.trim() === "") {
    return oauthError(
      400,
      "invalid_request",
      "tenant slug is required in the URL path",
    );
  }

  const body = await parseOAuthBody(req);

  const grantErr = validateGrantType(body, SUPPORTED_GRANTS);
  if (grantErr) return grantErr;

  const clientErr = validateClientId(body);
  if (clientErr) return clientErr;

  if (body.grant_type === "refresh_token" && !body.refresh_token) {
    return oauthError(
      400,
      "invalid_grant",
      "refresh_token grant requires refresh_token",
    );
  }
  if (body.grant_type === "authorization_code" && !body.code) {
    return oauthError(
      400,
      "invalid_grant",
      "authorization_code grant requires code",
    );
  }

  // Workday returns just the access token + type + expiry. No scope, no
  // refresh-token rotation in the response (the original RT remains valid).
  // Reference: Workday Community OAuth documentation.
  return NextResponse.json({
    access_token: genToken(40),
    token_type: "Bearer",
    expires_in: 3600,
  });
}
