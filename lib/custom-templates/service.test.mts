import assert from "node:assert/strict";
import test from "node:test";

import { hashCustomTemplateToken } from "./repository.ts";
import { CustomTemplateReviewError } from "./reviewer.ts";
import { CustomTemplateService } from "./service.ts";
import { CustomTemplateValidationError } from "./validation.ts";

const mp4Prefix = Uint8Array.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]);

test("finalize returns one matching token and a duplicate never mints another token", async () => {
  const repository = createRepository();
  const storage = createStorage();
  const token = Buffer.alloc(32, 7).toString("base64url");
  let tokenCalls = 0;
  const service = createService({
    repository,
    storage,
    createToken() {
      tokenCalls += 1;
      return token;
    },
  });

  const first = await service.finalizeUpload({ ingestId: "ingest-1", userId: "user-1" });
  const duplicate = await service.finalizeUpload({ ingestId: "ingest-1", userId: "user-1" });

  assert.equal(first.customTemplateToken, token);
  assert.equal(first.ingest.tokenHash, hashCustomTemplateToken(token));
  assert.equal(duplicate.customTemplateToken, undefined);
  assert.equal(duplicate.ingest.tokenHash, hashCustomTemplateToken(token));
  assert.equal(tokenCalls, 1);
});

test("review rejection fails closed and deletes the quarantined object", async () => {
  const repository = createRepository();
  const storage = createStorage();
  const service = createService({
    repository,
    storage,
    review: async () => {
      throw new CustomTemplateReviewError("REVIEW_BLOCKED");
    },
  });

  await assert.rejects(
    service.finalizeUpload({ ingestId: "ingest-1", userId: "user-1" }),
    (error) => error instanceof CustomTemplateReviewError && error.code === "REVIEW_BLOCKED",
  );
  assert.equal(repository.ingest.state, "rejected");
  assert.equal(repository.ingest.reasonCode, "REVIEW_BLOCKED");
  assert.deepEqual(storage.deleted, [repository.ingest.objectKey]);
});

test("imports downloaded bytes into quarantine before review", async () => {
  const repository = createRepository({ sourceKind: "url", state: "transferring" });
  const storage = createStorage();
  const service = createService({
    repository,
    storage,
    download: async () => ({
      bytes: mp4Prefix,
      contentType: "video/mp4; charset=binary",
      finalUrl: new URL("https://cdn.example.test/final.mp4"),
    }),
  });

  const result = await service.importRemote({
    userId: "user-1",
    idempotencyKey: "idempotency-1",
    url: "https://cdn.example.test/video.mp4",
  });

  assert.equal(result.ingest.state, "ready");
  assert.equal(typeof result.customTemplateToken, "string");
  assert.deepEqual(storage.puts, [{
    objectKey: repository.ingest.objectKey,
    contentType: "video/mp4",
    bytes: mp4Prefix,
  }]);
});

test("signature validation failure marks the ingest failed and deletes the object", async () => {
  const repository = createRepository();
  const storage = createStorage();
  storage.getPrefix = async () => Uint8Array.of(1, 2, 3, 4);
  const service = createService({ repository, storage });

  await assert.rejects(
    service.finalizeUpload({ ingestId: "ingest-1", userId: "user-1" }),
    (error) =>
      error instanceof CustomTemplateValidationError && error.code === "INVALID_FORMAT",
  );
  assert.equal(repository.ingest.state, "failed");
  assert.deepEqual(storage.deleted, [repository.ingest.objectKey]);
});

test("maps unknown infrastructure error codes to INGEST_FAILED", async () => {
  const repository = createRepository();
  const storage = createStorage();
  storage.getHead = async () => {
    throw Object.assign(new Error("provider detail"), { code: "AccessDenied" });
  };
  const service = createService({ repository, storage });

  await assert.rejects(
    service.finalizeUpload({ ingestId: "ingest-1", userId: "user-1" }),
    (error) => error?.code === "INGEST_FAILED",
  );
  assert.equal(repository.ingest.reasonCode, "INGEST_FAILED");
  assert.equal(repository.ingest.reasonCode.includes("AccessDenied"), false);
});

test("still deletes the object when persisting the terminal state fails", async () => {
  const repository = createRepository();
  repository.markFailed = async () => {
    throw new Error("database unavailable");
  };
  const storage = createStorage();
  storage.getPrefix = async () => Uint8Array.of(1, 2, 3, 4);
  const service = createService({ repository, storage });

  await assert.rejects(
    service.finalizeUpload({ ingestId: "ingest-1", userId: "user-1" }),
    (error) => error?.code === "INVALID_FORMAT",
  );
  assert.deepEqual(storage.deleted, [repository.ingest.objectKey]);
});

function createService(overrides = {}) {
  return new CustomTemplateService({
    repository: overrides.repository,
    storage: overrides.storage,
    review: overrides.review ?? (async () => ({ durationSeconds: 8, detectedMime: "video/mp4" })),
    download: overrides.download ?? (async () => {
      throw new Error("not used");
    }),
    createToken: overrides.createToken ?? (() => Buffer.alloc(32, 1).toString("base64url")),
    now: () => new Date("2026-07-20T00:00:00.000Z"),
  });
}

function createRepository(overrides = {}) {
  const ingest = {
    id: "ingest-1",
    userId: "user-1",
    idempotencyKey: "idempotency-1",
    sourceKind: overrides.sourceKind ?? "upload",
    objectKey: "custom-template-quarantine/user/ingest-1",
    mimeType: "video/mp4",
    sizeBytes: 8,
    durationSeconds: null,
    state: overrides.state ?? "awaiting_upload",
    tokenHash: null,
    reasonCode: null,
    createdAt: "2026-07-20T00:00:00.000Z",
    approvedAt: null,
    expiresAt: null,
    consumedAt: null,
    deletedAt: null,
  };

  return {
    ingest,
    async createOrGet() { return ingest; },
    async findOwned(id, userId) { return id === ingest.id && userId === ingest.userId ? ingest : null; },
    async findByTokenHash() { return null; },
    async markReviewing() { ingest.state = "reviewing"; return ingest; },
    async markReady(input) {
      if (ingest.state === "reviewing") {
        ingest.state = "ready";
        ingest.durationSeconds = input.durationSeconds;
        ingest.tokenHash = input.tokenHash;
        ingest.expiresAt = input.expiresAt;
      }
      return ingest;
    },
    async markFailed(input) {
      ingest.state = input.state;
      ingest.reasonCode = input.reasonCode;
      return ingest;
    },
    async reserve() { return false; },
    async releaseReservation() { return false; },
    async consume() { return false; },
    async markDeleted() {},
    async listCleanupCandidates() { return []; },
  };
}

function createStorage() {
  return {
    deleted: [],
    puts: [],
    async createUploadUrl() { return { url: "https://upload.test", headers: {} }; },
    async createReadUrl() { return "https://read.test"; },
    async getHead() { return { contentType: "video/mp4", sizeBytes: 8 }; },
    async getPrefix() { return mp4Prefix; },
    async putBytes(input) { this.puts.push(input); },
    async deleteObject(objectKey) { this.deleted.push(objectKey); },
    async getObjectBytes() { return mp4Prefix; },
  };
}
