import assert from "node:assert/strict";
import test from "node:test";

import {
  hashCustomTemplateToken,
  isCleanupCandidate,
  isOwnedUsableIngest,
} from "./repository.ts";

test("hashes tokens deterministically without storing the plaintext token", () => {
  assert.equal(hashCustomTemplateToken("token-a"), hashCustomTemplateToken("token-a"));
  assert.notEqual(hashCustomTemplateToken("token-a"), hashCustomTemplateToken("token-b"));
  assert.equal(hashCustomTemplateToken("token-a").includes("token-a"), false);
});

test("accepts only ready, owned, unexpired, unconsumed ingests", () => {
  const now = new Date("2026-07-20T00:00:00.000Z");
  const usableIngest = {
    userId: "u1",
    state: "ready" as const,
    expiresAt: "2026-07-21T00:00:00.000Z",
    consumedAt: null,
  };

  assert.equal(isOwnedUsableIngest(usableIngest, "u1", now), true);
  assert.equal(isOwnedUsableIngest({ ...usableIngest, userId: "u2" }, "u1", now), false);
  assert.equal(isOwnedUsableIngest({ ...usableIngest, state: "reserved" }, "u1", now), false);
  assert.equal(
    isOwnedUsableIngest({ ...usableIngest, expiresAt: now.toISOString() }, "u1", now),
    false,
  );
  assert.equal(
    isOwnedUsableIngest({ ...usableIngest, consumedAt: now.toISOString() }, "u1", now),
    false,
  );
});

test("cleans abandoned transfers after one hour without changing approved expiry rules", () => {
  const now = new Date("2026-07-20T02:00:00.000Z");
  const base = {
    state: "awaiting_upload" as const,
    createdAt: "2026-07-20T01:00:00.000Z",
    expiresAt: null,
    deletedAt: null,
  };

  assert.equal(isCleanupCandidate(base, now), true);
  assert.equal(
    isCleanupCandidate({ ...base, state: "transferring", createdAt: "2026-07-20T01:00:00.001Z" }, now),
    false,
  );
  assert.equal(
    isCleanupCandidate({ ...base, state: "ready", expiresAt: "2026-07-20T02:00:00.000Z" }, now),
    true,
  );
  assert.equal(
    isCleanupCandidate({ ...base, state: "reserved", expiresAt: "2026-07-20T02:00:00.001Z" }, now),
    false,
  );
  assert.equal(isCleanupCandidate({ ...base, state: "rejected", createdAt: now.toISOString() }, now), true);
  assert.equal(isCleanupCandidate({ ...base, state: "failed", deletedAt: now.toISOString() }, now), false);
});
