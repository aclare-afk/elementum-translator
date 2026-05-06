// POST /demos/sap-me5a-smoke/sap/oauth/token
//
// Mock SAP S/4HANA OAuth 2.0 token endpoint. Real SAP tenants expose
// OAuth via the gateway path /sap/oauth/token (or via SAP Cloud Identity
// Authentication Service for SAP BTP integrations). Most SAP MM/Procurement
// integrations target /sap/opu/odata/... with bearer auth issued from
// this endpoint.
//
// Matches PLATFORMS/sap.md § AUTH:
//   - Supported grants: client_credentials, password, saml2-bearer, refresh_token
//   - Response envelope: { access_token, token_type, expires_in, scope, refresh_token? }
//   - Bearer flow is the dominant pattern for OData v2 REST APIs

import { NextRequest, NextResponse } from "next/server";
import {
  genToken,
  oauthError,
  parseOAuthBody,
  validateClientId,
  validateGrantType,
} from "../../../../../../lib/oauth";

const SUPPORTED_GRANTS = [
  "client_credentials",
  "password",
  "refresh_token",
  "urn:ietf:params:oauth:grant-type:saml2-bearer",
] as const;

export async function POST(req: NextRequest) {
  const body = await parseOAuthBody(req);

  const grantErr = validateGrantType(body, SUPPORTED_GRANTS);
  if (grantErr) return grantErr;

  const clientErr = validateClientId(body);
  if (clientErr) return clientErr;

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

  // SAP-style response. Tokens are typically opaque base64 strings.
  // Reference: https://help.sap.com/docs/SAP_NETWEAVER_AS_ABAP_752/0
  const response: Record<string, unknown> = {
    access_token: genToken(40),
    token_type: "Bearer",
    expires_in: 3600,
    scope: body.scope ?? "API_PURCHASEREQ_PROCESS_SRV_0001",
  };
  if (
    body.grant_type === "password" ||
    body.grant_type === "refresh_token" ||
    body.grant_type === "urn:ietf:params:oauth:grant-type:saml2-bearer"
  ) {
    response.refresh_token = genToken(40);
  }

  return NextResponse.json(response);
}
