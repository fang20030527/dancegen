import assert from "node:assert/strict";
import test from "node:test";

import {
  getTurnstileSiteKey,
  TurnstileConfigError,
  TurnstileVerificationError,
  verifyTurnstileToken,
} from "./turnstile.ts";

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
