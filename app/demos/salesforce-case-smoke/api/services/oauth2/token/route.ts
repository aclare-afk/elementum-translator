// Salesforce OAuth 2.0 token endpoint mock.
//
// Real path on a Salesforce org: `https://<my-domain>.my.salesforce.com/services/oauth2/token`
// Mock path:                    `/demos/salesforce-case-smoke/api/services/oauth2/token`
//
// Elementum's `api_task` typically runs a JWT Bearer or Client Credentials
// flow against this endpoint to mint a short-lived access token, then
// passes the token to subsequent sObject calls. The mock honors the same
// shape so SE-built api_tasks succeed end-to-end without code branches.
//
// What's implemented:
//   - POST with `grant_type=client_credentials` (form-encoded body) — returns
//     a fake bearer + the deployment URL as `instance_url`.
//   - POST with `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` —
//     same response. The `assertion` JWT is NOT validated.
//   - POST with `grant_type=password` — also accepted; deprecated in real
//     Salesforce but still present in legacy mocks.
//   - Any other grant_type — 400 with `{error, error_description}` matching
//     the Salesforce error envelope for OAuth.
//
// What's NOT validated (deliberate, per write-API SKILL.md guidance):
//   - The `client_id` / `client_secret` / `assertion` / `username` /
//     `password` values. Lenient acceptance keeps demos alive when SEs
//     forget to copy a secret.
//
// Fidelity anchor: PLATFORMS/salesforce.md § AUTH > OAuth 2.0 flows
// supported.

import { NextRequest, NextResponse } from "next/server";

/** Stable mock access token. Must look like a real Salesforce session id —
 *  long, opaque, contains `!` (real tokens are formatted `00D...!ARQAQ...`).
 *  We don't validate it back on subsequent API calls (the catch-all accepts
 *  any bearer), but it has to be syntactically plausible so chat replies
 *  that print it look right. */
const MOCK_ACCESS_TOKEN =
  "00D5g00000ABCDE!ARQAQHmL7Mockaccesstokenforsalesforcecasesmoke.dEMOTOKEN1234567890";

/** Stable mock org id. Real org ids are 18-char and start with `00D`. */
const MOCK_ORG_ID = "00D5g00000ABCDEAAU";

/** The mock User Id this token authenticates as. Stable, always returns
 *  the same identity per § AUTH > Access tokens. */
const MOCK_USER_ID = "0055g00000QAPI001AAJ";

/** Default token TTL. Real Salesforce defaults to 2h; the mock claims the
 *  same so the integration's refresh logic kicks in at the right cadence
 *  during long demos. */
const TOKEN_TTL_SECONDS = 7200;

const ACCEPTED_GRANT_TYPES = new Set([
  "client_credentials",
  "urn:ietf:params:oauth:grant-type:jwt-bearer",
  "password",
  "refresh_token",
  "authorization_code",
]);

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "localhost";
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  // Real Salesforce accepts both `application/x-www-form-urlencoded` and
  // (newer) `application/json` on this endpoint. We accept either, with
  // form taking precedence per the OAuth spec.
  const contentType = req.headers.get("content-type") ?? "";
  let params: URLSearchParams;
  if (contentType.includes("application/json")) {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      params = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) {
        if (typeof v === "string") params.set(k, v);
      }
    } catch {
      return errorResponse(
        "invalid_request",
        "Request body must be valid form-encoded data or JSON.",
      );
    }
  } else {
    const raw = await req.text();
    params = new URLSearchParams(raw);
  }

  const grantType = params.get("grant_type") ?? "";
  if (!grantType) {
    return errorResponse(
      "invalid_request",
      "grant_type is required.",
    );
  }
  if (!ACCEPTED_GRANT_TYPES.has(grantType)) {
    return errorResponse(
      "unsupported_grant_type",
      `grant_type '${grantType}' is not supported.`,
    );
  }

  // Mint the token. Real Salesforce returns these exact keys; integrations
  // pull `access_token` + `instance_url` and ignore the rest.
  const root = baseUrl(req);
  const issued = Math.floor(Date.now() / 1000);
  return NextResponse.json({
    access_token: MOCK_ACCESS_TOKEN,
    // `instance_url` is the host all subsequent API calls should use. We
    // point it back at the mock so the api_task that just authenticated
    // hits this same deployment for sObject calls. Real Salesforce
    // returns a `<domain>.my.salesforce.com` host here.
    instance_url: root,
    // `id` is the Identity URL — used to look up the authenticated user's
    // profile via /services/oauth2/userinfo. Mocked but not implemented.
    id: `${root}/id/${MOCK_ORG_ID}/${MOCK_USER_ID}`,
    token_type: "Bearer",
    issued_at: String(issued * 1000),
    // Real Salesforce signs every token response. We include a fake
    // signature so naive integration code that asserts `signature` is
    // present doesn't blow up.
    signature: "mock_signature_for_demo_purposes_only_aGVsbG8=",
    // Scope is echoed when the request specified one; otherwise we return
    // the broad default the smoke covers.
    scope: params.get("scope") ?? "api refresh_token",
    // TTL for refresh logic. Real responses ship this in seconds.
    expires_in: TOKEN_TTL_SECONDS,
  });
}

/**
 * Real Salesforce errors on /services/oauth2/token use the OAuth 2.0
 * spec envelope, NOT the JSON-array sObject envelope. This is the only
 * place in the entire Salesforce API surface where a 400 looks like
 * `{error, error_description}` instead of `[{message, errorCode}]`.
 */
function errorResponse(error: string, description: string) {
  return NextResponse.json(
    {
      error,
      error_description: description,
    },
    { status: 400 },
  );
}
