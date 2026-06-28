import assert from "node:assert/strict";
import test from "node:test";

import { getHeaderAuthStatus } from "./auth-status.ts";

test("shows signed-out status when no user is present", () => {
  assert.deepEqual(getHeaderAuthStatus(null), {
    accountLabel: null,
    isSignedIn: false,
    statusLabel: "Signed out",
  });
});

test("shows signed-in status with the user's email", () => {
  assert.deepEqual(
    getHeaderAuthStatus({
      email: "creator@example.com",
      id: "user_123",
      name: "Creator",
    }),
    {
      accountLabel: "creator@example.com",
      isSignedIn: true,
      statusLabel: "Signed in",
    },
  );
});

test("falls back to the user's name when email is missing", () => {
  assert.deepEqual(
    getHeaderAuthStatus({
      id: "user_123",
      name: "Creator",
    }),
    {
      accountLabel: "Creator",
      isSignedIn: true,
      statusLabel: "Signed in",
    },
  );
});
