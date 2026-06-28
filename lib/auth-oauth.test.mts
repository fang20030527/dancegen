import assert from "node:assert/strict";
import test from "node:test";

import { createGoogleOAuthSignInRequest, getSafeAuthCallbackPath } from "./auth-oauth.ts";

test("keeps same-origin redirect paths for Google OAuth callbacks", () => {
  const requestUrl = new URL("http://localhost:3000/api/auth/google?redirectTo=%2Fpricing%3Fplan%3Dcreator%23checkout");

  assert.equal(getSafeAuthCallbackPath(requestUrl), "/pricing?plan=creator#checkout");
});

test("falls back when Google OAuth redirect target is cross-origin", () => {
  const requestUrl = new URL("http://localhost:3000/api/auth/google?redirectTo=https%3A%2F%2Fevil.example%2Fsteal");

  assert.equal(getSafeAuthCallbackPath(requestUrl), "/ai-dance-generator");
});

test("builds the Better Auth social sign-in request for Google", async () => {
  const request = new Request("http://localhost:3000/api/auth/google?redirectTo=/pricing", {
    headers: {
      cookie: "existing=value",
    },
  });

  const signInRequest = createGoogleOAuthSignInRequest(request, "/pricing");

  assert.equal(signInRequest.method, "POST");
  assert.equal(signInRequest.url, "http://localhost:3000/api/auth/sign-in/social");
  assert.equal(signInRequest.headers.get("content-type"), "application/json");
  assert.deepEqual(await signInRequest.json(), {
    provider: "google",
    callbackURL: "/pricing",
  });
});

test("does not forward stale app cookies into Google OAuth start", () => {
  const request = new Request("http://localhost:3000/api/auth/google?redirectTo=/pricing", {
    headers: {
      cookie: "dancegen_demo_session=true; better-auth.session_token=stale",
    },
  });

  const signInRequest = createGoogleOAuthSignInRequest(request, "/pricing");

  assert.equal(signInRequest.headers.get("cookie"), null);
});
