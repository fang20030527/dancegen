import assert from "node:assert/strict";
import test from "node:test";

import {
  customTemplateJsonResponse,
  mapCustomTemplateError,
  hasValidCronAuthorization,
  requireCustomTemplateCreator,
  requireCustomTemplateUser,
} from "./route-guards.ts";
import {
  cleanupCustomTemplates,
  deleteOwnedCustomTemplate,
  finalizeCustomTemplateUpload,
  getOwnedCustomTemplateState,
  toCustomTemplatePublicState,
} from "./route-operations.ts";
import {
  customTemplateImportSchema,
  customTemplatePrepareSchema,
  getCustomTemplateRequestErrorCode,
} from "./route-schemas.ts";

test("maps stable custom-template failures without leaking details", () => {
  assert.deepEqual(mapCustomTemplateError({ code: "REVIEW_BLOCKED" }), {
    status: 403,
    body: {
      code: "REVIEW_BLOCKED",
      message: "This video could not be used because it does not meet our content policy.",
    },
  });
  assert.equal(mapCustomTemplateError({ code: "UNSAFE_URL" }).status, 400);
});

test("checks the feature flag before authentication or entitlement lookup", async () => {
  let laterChecks = 0;
  const result = await requireCustomTemplateCreator(
    new Request("https://danceclip.test/api/templates/custom/import"),
    {
      featureEnabled: () => false,
      getUserId: async () => { laterChecks += 1; return "user-1"; },
      hasCreatorAccess: async () => { laterChecks += 1; return true; },
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.ok ? null : result.error.body.code, "FEATURE_DISABLED");
  assert.equal(laterChecks, 0);
});

test("feature-off owners can manage existing ingests without a Creator check", async () => {
  let creatorChecks = 0;
  const result = await requireCustomTemplateUser(
    new Request("https://danceclip.test/api/templates/custom/00000000-0000-4000-8000-000000000001"),
    {
      getUserId: async () => "user-1",
      hasCreatorAccess: async () => { creatorChecks += 1; return false; },
      featureEnabled: () => false,
    },
  );

  assert.deepEqual(result, { ok: true, userId: "user-1" });
  assert.equal(creatorChecks, 0);
});

test("lapsed members can still manage their owned ingests", async () => {
  let creatorChecks = 0;
  const result = await requireCustomTemplateUser(
    new Request("https://danceclip.test/api/templates/custom/00000000-0000-4000-8000-000000000001"),
    {
      getUserId: async () => "user-1",
      hasCreatorAccess: async () => { creatorChecks += 1; return false; },
      featureEnabled: () => true,
    },
  );

  assert.deepEqual(result, { ok: true, userId: "user-1" });
  assert.equal(creatorChecks, 0);
});

test("signed-out users cannot manage existing ingests", async () => {
  const result = await requireCustomTemplateUser(
    new Request("https://danceclip.test/api/templates/custom/00000000-0000-4000-8000-000000000001"),
    { getUserId: async () => null },
  );

  assert.equal(result.ok, false);
  assert.equal(result.ok ? null : result.error.body.code, "GOOGLE_AUTH_REQUIRED");
});

test("public state excludes ownership, object keys, idempotency keys, and token hashes", () => {
  assert.deepEqual(toCustomTemplatePublicState(createIngest()), {
    id: "00000000-0000-4000-8000-000000000001",
    state: "ready",
    mimeType: "video/mp4",
    sizeBytes: 8,
    durationSeconds: 8,
    expiresAt: "2026-07-21T00:00:00.000Z",
    reasonCode: null,
  });
});

test("finalize rejects a mismatched idempotency key before invoking review", async () => {
  let finalizeCalls = 0;

  await assert.rejects(
    finalizeCustomTemplateUpload(
      {
        ingestId: "00000000-0000-4000-8000-000000000001",
        userId: "user-1",
        idempotencyKey: "different-key",
      },
      createDependencies({
        service: {
          async finalizeUpload() { finalizeCalls += 1; throw new Error("must not run"); },
        },
      }),
    ),
    (error) => error?.code === "IDEMPOTENCY_CONFLICT",
  );
  assert.equal(finalizeCalls, 0);
});

test("owned ready status gets a five-minute preview without returning a token", async () => {
  const signedLifetimes = [];
  const state = await getOwnedCustomTemplateState(
    {
      ingestId: "00000000-0000-4000-8000-000000000001",
      userId: "user-1",
    },
    createDependencies({
      storage: {
        async createReadUrl(_objectKey, expiresInSeconds) {
          signedLifetimes.push(expiresInSeconds);
          return "https://private-preview.test/signed";
        },
      },
    }),
  );

  assert.deepEqual(signedLifetimes, [300]);
  assert.equal(state.previewUrl, "https://private-preview.test/signed");
  assert.equal(state.customTemplateToken, undefined);
});

test("deletion removes the private object before marking the owned ingest deleted", async () => {
  const calls = [];
  const ingest = createIngest();
  const repository = createRepository(ingest);
  repository.markDeleted = async () => {
    calls.push("mark");
    ingest.state = "deleted";
    ingest.deletedAt = "2026-07-20T00:00:00.000Z";
  };

  const result = await deleteOwnedCustomTemplate(
    { ingestId: ingest.id, userId: ingest.userId },
    createDependencies({
      repository,
      storage: {
        async deleteObject() { calls.push("delete"); },
      },
    }),
  );

  assert.deepEqual(calls, ["delete", "mark"]);
  assert.equal(result.state, "deleted");
});

test("cleanup is bounded to 100 candidates and continues after individual failures", async () => {
  const repository = createRepository(createIngest());
  let requestedLimit = 0;
  repository.listCleanupCandidates = async (_now, limit) => {
    requestedLimit = limit;
    return [
      createIngest({ id: "00000000-0000-4000-8000-000000000001", objectKey: "private/ingest-1" }),
      createIngest({ id: "00000000-0000-4000-8000-000000000002", objectKey: "private/ingest-2" }),
    ];
  };

  const result = await cleanupCustomTemplates(createDependencies({
    repository,
    storage: {
      async deleteObject(objectKey) {
        if (objectKey.endsWith("ingest-1")) throw new Error("temporary storage error");
      },
    },
  }));

  assert.equal(requestedLimit, 100);
  assert.deepEqual(result, { deleted: 1, failed: 1 });
});

test("route schemas require rights confirmation and reject unknown input", () => {
  assert.equal(customTemplatePrepareSchema.safeParse({
    fileName: "dance.mp4",
    contentType: "video/mp4",
    sizeBytes: 8,
    rightsConfirmed: false,
    idempotencyKey: "request-123456",
  }).success, false);

  assert.equal(customTemplateImportSchema.safeParse({
    url: "https://cdn.example.test/dance.mp4",
    rightsConfirmed: true,
    idempotencyKey: "request-123456",
    objectKey: "private/attacker-controlled",
  }).success, false);
});

test("cron authorization requires the exact configured bearer secret", () => {
  assert.equal(hasValidCronAuthorization(new Headers({ authorization: "Bearer cron-secret" }), "cron-secret"), true);
  assert.equal(hasValidCronAuthorization(new Headers({ authorization: "Bearer wrong" }), "cron-secret"), false);
  assert.equal(hasValidCronAuthorization(new Headers(), undefined), false);
});

test("schema failures preserve stable format, size, and URL error categories", () => {
  const tooLarge = customTemplatePrepareSchema.safeParse({
    fileName: "dance.mp4",
    contentType: "video/mp4",
    sizeBytes: 52_428_801,
    rightsConfirmed: true,
    idempotencyKey: "request-123456",
  });
  assert.equal(tooLarge.success, false);
  if (!tooLarge.success) {
    assert.equal(getCustomTemplateRequestErrorCode(tooLarge.error), "FILE_TOO_LARGE");
  }

  const unsafeUrl = customTemplateImportSchema.safeParse({
    url: "not-a-url",
    rightsConfirmed: true,
    idempotencyKey: "request-123456",
  });
  assert.equal(unsafeUrl.success, false);
  if (!unsafeUrl.success) {
    assert.equal(getCustomTemplateRequestErrorCode(unsafeUrl.error), "UNSAFE_URL");
  }
});

test("custom-template responses prevent caching signed URLs and plaintext tokens", () => {
  const response = customTemplateJsonResponse({ customTemplateToken: "one-time-secret" });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

function createIngest(overrides = {}) {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    userId: "user-1",
    idempotencyKey: "idempotency-1",
    sourceKind: "upload",
    objectKey: "custom-template-quarantine/user/ingest-1",
    mimeType: "video/mp4",
    sizeBytes: 8,
    durationSeconds: 8,
    state: "ready",
    tokenHash: "secret-hash",
    reasonCode: null,
    createdAt: "2026-07-20T00:00:00.000Z",
    approvedAt: "2026-07-20T00:00:00.000Z",
    expiresAt: "2026-07-21T00:00:00.000Z",
    consumedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function createRepository(ingest) {
  return {
    async createOrGet() { return ingest; },
    async findOwned(id, userId) {
      return id === ingest.id && userId === ingest.userId ? ingest : null;
    },
    async findByTokenHash() { return null; },
    async markReviewing() { return ingest; },
    async markReady() { return ingest; },
    async markFailed() { return ingest; },
    async reserve() { return false; },
    async releaseReservation() { return false; },
    async consume() { return false; },
    async markDeleted() {},
    async listCleanupCandidates() { return []; },
  };
}

function createDependencies(overrides = {}) {
  const ingest = createIngest();
  const storage = {
    async createUploadUrl() { return { url: "https://upload.test", headers: {} }; },
    async createReadUrl() { return "https://preview.test"; },
    async getHead() { return { contentType: "video/mp4", sizeBytes: 8 }; },
    async getPrefix() { return Uint8Array.of(0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70); },
    async putBytes() {},
    async deleteObject() {},
    async getObjectBytes() { return Uint8Array.of(); },
    ...overrides.storage,
  };
  const service = {
    async prepareUpload() { throw new Error("not used"); },
    async finalizeUpload() { return { ingest }; },
    async importRemote() { return { ingest }; },
    ...overrides.service,
  };

  return {
    repository: overrides.repository ?? createRepository(ingest),
    storage,
    service,
    now: () => new Date("2026-07-20T00:00:00.000Z"),
  };
}
