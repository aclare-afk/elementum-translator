// POST /demos/amazon-punchout-smoke/auth/o2/token
//
// Mock Amazon Login with Amazon (LwA) token endpoint. Real Amazon Business
// integrations exchange refresh tokens here for short-lived access tokens
// used to call Amazon's SP-API and Business APIs. The path /auth/o2/token
// matches the canonical LwA endpoint suffix.
//
// Matches PLATFORMS/amazon-business.md § AUTH:
//   - Supported grants: refresh_token, authorization_code
//   - Response envelope: { access_token, refresh_token, token_type: "bearer", expires_in }
//   - Note: Amazon's token_type is lowercase "bearer", NOT "Bearer" — this
//     is an idiosyncrasy of LwA worth preserving for fidelity

import { NextRequest, NextResponse } from "next/server";
import {
  genToken,
  oauthError,
  parseOAuthBody,
  validateClientId,
  validateGrantType,
} from "../../../../../../lib/oauth";

const SUPPORTED_GRANTS = [
  "refresh_token",
  "authorization_code",
] as const;

export async function POST(req: NextRequest) {
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

  // Amazon LwA tokens. Reference:
  // https://developer.amazon.com/docs/login-with-amazon/access-token.html
  // Real LwA access tokens start with "Atza|" and refresh tokens with "Atzr|"
  const accessToken = `Atza|${genToken(64)}`;
  const refreshToken = `Atzr|${genToken(64)}`;

  return NextResponse.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "bearer", // lowercase per LwA spec
    expires_in: 3600,
  });
}
