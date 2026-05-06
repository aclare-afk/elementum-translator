// Shared OAuth helpers for the platform mock token endpoints.
//
// Why these exist: each platform mock has its own /oauth_token.do (or
// equivalent) endpoint that returns a realistic-shaped token response. The
// helpers in this file generate tokens that LOOK like the real thing —
// random base64ish strings, not literal "fake_token_123" — so when an SE
// curls the endpoint during a demo, the response is indistinguishable in
// shape and feel from a real platform tenant.
//
// Per Alexander's demo philosophy: the mocks should behave like the real
// platform, not like a toy. That extends to auth — real OAuth servers
// enforce form-urlencoded request bodies and return RFC 6749 error
// envelopes on bad grants. We do the same.
//
// Tokens are NOT persisted in KV. They're issued fresh on every call.
// The existing platform API endpoints don't validate bearers (they accept
// any auth header), so token persistence isn't required for the round-trip
// to work — the OAuth endpoint is a standalone "look, the auth dance
// works" demo affordance.

import { NextRequest, NextResponse } from "next/server";

// ---- Token generation ------------------------------------------------------

/**
 * Generate a random token string. Real platforms use various shapes:
 *   - ServiceNow: opaque ~32-char base64-ish
 *   - Salesforce: long signed string with `00D...!` prefix and `.` separators
 *   - Workday: opaque base64-ish
 *   - Atlassian: long opaque string starting with letters
 *
 * For the mock we generate URL-safe base64 of N random bytes. Caller picks
 * the byte count; default 32 bytes yields a 43-char string before any
 * platform-specific prefix.
 */
export function genToken(bytes = 32): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  return crypto
    .randomBytes(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Salesforce-shaped access token: starts with the org ID prefix, then `!`,
 * then a long opaque body. Looks like:
 *   "00D5g00000ABCDE!AQEAQA1234..."
 *
 * Real Salesforce tokens are signed assertions against the org; the mock
 * just generates a random tail that passes a glance test.
 */
export function genSalesforceAccessToken(orgIdPrefix = "00D5g00000ABCDE"): string {
  return `${orgIdPrefix}!${genToken(48)}`;
}

/**
 * Salesforce signature: HMAC-SHA256 of the rest of the response, base64-
 * encoded. We don't compute a real one (the demo doesn't validate it) —
 * just generate something that LOOKS right.
 */
export function genSalesforceSignature(): string {
  return genToken(32) + "=";
}

/** Stable issued-at timestamp (Unix milliseconds, as string). */
export function nowMillisString(): string {
  return String(Date.now());
}

// ---- Request body parsing --------------------------------------------------

/**
 * Real OAuth token endpoints expect application/x-www-form-urlencoded.
 * Some loosely-implemented integrations send JSON; the mock accepts both
 * to avoid blocking demos where the SE has wired Elementum to send JSON.
 *
 * Returns a flat key/value map. Empty/missing fields are absent from the
 * result; downstream callers should validate required fields explicitly.
 */
export async function parseOAuthBody(
  req: NextRequest,
): Promise<Record<string, string>> {
  const contentType = (
    req.headers.get("content-type") ?? "application/x-www-form-urlencoded"
  ).toLowerCase();

  // Form-encoded — the canonical OAuth shape
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const out: Record<string, string> = {};
    params.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }

  // JSON — accepted as a courtesy
  if (contentType.includes("application/json")) {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(body)) {
        if (v !== null && v !== undefined) {
          out[k] = String(v);
        }
      }
      return out;
    } catch {
      return {};
    }
  }

  return {};
}

// ---- Standard OAuth error responses ----------------------------------------

/**
 * Build an RFC 6749-compliant OAuth error response.
 * https://www.rfc-editor.org/rfc/rfc6749#section-5.2
 *
 * Common error codes:
 *   - invalid_request
 *   - invalid_client
 *   - invalid_grant
 *   - unsupported_grant_type
 *   - invalid_scope
 */
export function oauthError(
  status: number,
  error: string,
  description: string,
): NextResponse {
  return NextResponse.json(
    { error, error_description: description },
    { status },
  );
}

// ---- Grant-type validation -------------------------------------------------

/**
 * Validate that the request supplied a known grant_type. Returns null on
 * success or a populated error response on failure. Each platform passes
 * its own list of supported grants — most accept the same set (password,
 * client_credentials, refresh_token, authorization_code), but a few are
 * pickier (Workday is mostly refresh_token; SAP's bearer flow varies).
 */
export function validateGrantType(
  body: Record<string, string>,
  supported: ReadonlyArray<string>,
): NextResponse | null {
  const grantType = body.grant_type;
  if (!grantType) {
    return oauthError(
      400,
      "invalid_request",
      "Missing required parameter: grant_type",
    );
  }
  if (!supported.includes(grantType)) {
    return oauthError(
      400,
      "unsupported_grant_type",
      `grant_type '${grantType}' is not supported on this endpoint. Supported: ${supported.join(", ")}`,
    );
  }
  return null;
}

/**
 * Validate that client_id is present (most platforms require it). This is
 * permissive — we don't actually authenticate the client, we just refuse
 * obviously-empty calls so the demo can show a "missing creds" error
 * shape if asked.
 */
export function validateClientId(
  body: Record<string, string>,
): NextResponse | null {
  if (!body.client_id || body.client_id.trim() === "") {
    return oauthError(
      401,
      "invalid_client",
      "Missing required parameter: client_id",
    );
  }
  return null;
}
