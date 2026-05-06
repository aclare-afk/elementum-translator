// POST /demos/salesforce-case-smoke/services/oauth2/token
//
// Mock Salesforce OAuth 2.0 token endpoint. Real production Salesforce
// auth flows POST here with form-urlencoded credentials and get back the
// distinctive Salesforce token envelope (access_token + instance_url +
// id + signature + issued_at).
//
// Matches PLATFORMS/salesforce.md § AUTH:
//   - URL: /services/oauth2/token
//   - Supported grants: password, refresh_token, authorization_code,
//     client_credentials, urn:ietf:params:oauth:grant-type:jwt-bearer
//   - Response envelope: { access_token, refresh_token, instance_url, id,
//     token_type: "Bearer", issued_at, signature, scope }
//   - 400 on missing/unsupported grant, 401 on missing client_id
//
// The signature field is a base64-encoded HMAC-SHA256 of the rest of the
// response in real Salesforce; the mock generates a random base64 string
// of the same shape. The demo doesn't validate it; customers asking
// "what is signature?" should get the real explanation.

import { NextRequest, NextResponse } from "next/server";
import {
  genSalesforceAccessToken,
  genSalesforceSignature,
  genToken,
  nowMillisString,
  oauthError,
  parseOAuthBody,
  validateClientId,
  validateGrantType,
} from "../../../../../../lib/oauth";

const SUPPORTED_GRANTS = [
  "password",
  "refresh_token",
  "authorization_code",
  "client_credentials",
  "urn:ietf:params:oauth:grant-type:jwt-bearer",
] as const;

const ORG_ID_PREFIX = "00D5g00000ABCDE"; // matches the AccountId prefix used in seed data

export async function POST(req: NextRequest) {
  const body = await parseOAuthBody(req);

  const grantErr = validateGrantType(body, SUPPORTED_GRANTS);
  if (grantErr) return grantErr;

  const clientErr = validateClientId(body);
  if (clientErr) return clientErr;

  // password grant requires username; refresh_token grant requires refresh_token.
  if (body.grant_type === "password" && !body.username) {
    return oauthError(
      400,
      "invalid_grant",
      "password grant requires username",
    );
  }
  if (body.grant_type === "refresh_token" && !body.refresh_token) {
    return oauthError(
      400,
      "invalid_grant",
      "refresh_token grant requires refresh_token",
    );
  }

  // Build the Salesforce-shaped response. Field names + shapes match the
  // real /services/oauth2/token response byte-for-byte.
  // Reference: https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_endpoints.htm
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost";
  const baseUrl = `${proto}://${host}`;

  const userId = "0055g00000Q1AAA2AAJ"; // Sam Rivera — matches seed OwnerId
  const accessToken = genSalesforceAccessToken(ORG_ID_PREFIX);
  const refreshToken =
    body.grant_type === "client_credentials"
      ? undefined
      : `5Aep${genToken(64)}`;

  const response: Record<string, unknown> = {
    access_token: accessToken,
    instance_url: `${baseUrl}/demos/salesforce-case-smoke`,
    id: `${baseUrl}/id/${ORG_ID_PREFIX}AAH/${userId}`,
    token_type: "Bearer",
    issued_at: nowMillisString(),
    signature: genSalesforceSignature(),
    scope: body.scope ?? "api refresh_token openid",
  };
  if (refreshToken) {
    response.refresh_token = refreshToken;
  }

  return NextResponse.json(response);
}
