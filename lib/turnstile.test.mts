import assert from "node:assert/strict";
import test from "node:test";

import {
  getKnownTurnstileErrorCodes,
  getTurnstileRegisterErrorCode,
  getTurnstileSiteKey,
  TurnstileConfigError,
  TurnstileUnavailableError,
  TurnstileVerificationError,
  verifyTurnstileToken,
} from "./turnstile.ts";

test("maps an expired or duplicate token to a retryable code", () => {
  assert.equal(
    getTurnstileRegisterErrorCode(
      new TurnstileVerificationError("failed", ["timeout-or-duplicate"]),
    ),
    "turnstile_expired",
  );
});

test("maps required, unavailable, and missing configuration separately", () => {
  assert.equal(
    getTurnstileRegisterErrorCode(
      new TurnstileVerificationError("missing", ["missing-input-response"]),
    ),
    "turnstile_required",
  );
  assert.equal(
    getTurnstileRegisterErrorCode(new TurnstileUnavailableError("unavailable")),
    "turnstile_unavailable",
  );
  assert.equal(
    getTurnstileRegisterErrorCode(
      new TurnstileVerificationError("upstream failed", ["internal-error"]),
    ),
    "turnstile_unavailable",
  );
  assert.equal(
    getTurnstileRegisterErrorCode(new TurnstileConfigError("missing config")),
    "turnstile_not_configured",
  );
});

test("exposes only documented Cloudflare codes for safe server logs", () => {
  assert.deepEqual(
    getKnownTurnstileErrorCodes(
      new TurnstileVerificationError("failed", [
        "invalid-input-response",
        "unexpected-detail-with-token",
        "timeout-or-duplicate",
      ]),
    ),
    ["invalid-input-response", "timeout-or-duplicate"],
  );
});

test("trims the public Turnstile site key", () => {
  assert.equal(getTurnstileSiteKey({ NEXT_PUBLIC_TURNSTILE_SITE_KEY: " site-key " }), "site-key");
});

test("requires a server-side Turnstile secret key", async () => {
  await assert.rejects(
    () => verifyTurnstileToken({ token: "token", env: {} }),
    TurnstileConfigError,
  );
});

test("rejects missing Turnstile tokens before making a request", async () => {
  await assert.rejects(
    () => verifyTurnstileToken({ token: "", env: { TURNSTILE_SECRET_KEY: "secret" } }),
    TurnstileVerificationError,
  );
});

test("accepts successful Turnstile verification responses", async () => {
  const result = await verifyTurnstileToken({
    token: "token",
    env: { TURNSTILE_SECRET_KEY: "secret" },
    fetchImpl: async () => new Response(JSON.stringify({ success: true })),
  });

  assert.equal(result.success, true);
});

test("reports transport and upstream failures as unavailable", async () => {
  const input = {
    token: "token",
    env: { TURNSTILE_SECRET_KEY: "secret" },
  } as const;

  await assert.rejects(
    () =>
      verifyTurnstileToken({
        ...input,
        fetchImpl: async () => {
          throw new TypeError("network down");
        },
      }),
    TurnstileUnavailableError,
  );
  await assert.rejects(
    () =>
      verifyTurnstileToken({
        ...input,
        fetchImpl: async () => new Response(null, { status: 502 }),
      }),
    TurnstileUnavailableError,
  );
  await assert.rejects(
    () =>
      verifyTurnstileToken({
        ...input,
        fetchImpl: async () => new Response("not-json"),
      }),
    TurnstileUnavailableError,
  );
});

test("exposes Turnstile validation error codes", async () => {
  await assert.rejects(
    () =>
      verifyTurnstileToken({
        token: "token",
        env: { TURNSTILE_SECRET_KEY: "secret" },
        fetchImpl: async () =>
          new Response(JSON.stringify({ success: false, "error-codes": ["timeout-or-duplicate"] })),
      }),
    (error) => {
      assert.ok(error instanceof TurnstileVerificationError);
      assert.deepEqual(error.errorCodes, ["timeout-or-duplicate"]);
      return true;
    },
  );
});
