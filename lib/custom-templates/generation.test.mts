import assert from "node:assert/strict";
import test from "node:test";

import { hashCustomTemplateToken } from "./repository.ts";
import {
  GenerationTemplateError,
  resolveGenerationTemplateSource,
  submitGenerationWithTemplateReservation,
} from "./generation.ts";
import type { CustomTemplateIngest } from "./types.ts";
import type { DanceGenerationTask } from "../dance/types.ts";

const readyIngest: CustomTemplateIngest = {
  id: "ingest-1",
  userId: "member-1",
  idempotencyKey: "import-1",
  sourceKind: "upload",
  objectKey: "custom-template-quarantine/member/ingest-1",
  mimeType: "video/mp4",
  sizeBytes: 4_000_000,
  durationSeconds: 8,
  state: "ready",
  tokenHash: hashCustomTemplateToken("opaque-token"),
  reasonCode: null,
  createdAt: "2026-07-20T00:00:00.000Z",
  approvedAt: "2026-07-20T00:01:00.000Z",
  expiresAt: "2026-07-21T00:01:00.000Z",
  consumedAt: null,
  deletedAt: null,
};

test("resolves a member token to server-owned private object metadata", async () => {
  let receivedHash = "";
  const resolved = await resolveGenerationTemplateSource(
    {
      userId: "member-1",
      templateId: undefined,
      customTemplateToken: "opaque-token",
      modelId: "viggle-v4-preview",
    },
    {
      now: () => new Date("2026-07-20T12:00:00.000Z"),
      hasActiveCreatorSubscription: async () => true,
      findPublicTemplate: () => undefined,
      repository: {
        async findByTokenHash(tokenHash) {
          receivedHash = tokenHash;
          return readyIngest;
        },
      },
    },
  );

  assert.equal(receivedHash, hashCustomTemplateToken("opaque-token"));
  assert.deepEqual(resolved, {
    templateSource: {
      kind: "custom",
      ingestId: "ingest-1",
      objectKey: "custom-template-quarantine/member/ingest-1",
      mimeType: "video/mp4",
    },
    displayTemplateId: "custom-member-video",
    customTemplateIngestId: "ingest-1",
  });
});

test("keeps an available platform template on the existing generation path", async () => {
  const platformTemplate = {
    id: "hip-hop",
    name: "Hip Hop",
    slug: "hip-hop",
    description: "A public dance",
    platformTags: ["hip-hop"],
    risk: "low",
    isPublic: true,
    durationSeconds: 5,
    videoPath: "/templates/hip-hop.mp4",
    providerPayloadVersion: "dancegen-viggle-render-v1",
    modelHints: { motion: "dance", camera: "static", safety: "safe" },
  } as const;

  const resolved = await resolveGenerationTemplateSource(
    {
      userId: "user-1",
      templateId: "hip-hop",
      modelId: "viggle-v4-preview",
    },
    {
      now: () => new Date("2026-07-20T12:00:00.000Z"),
      hasActiveCreatorSubscription: async () => false,
      findPublicTemplate: (templateId) =>
        templateId === platformTemplate.id ? platformTemplate : undefined,
      repository: { async findByTokenHash() { return null; } },
    },
  );

  assert.deepEqual(resolved, {
    templateSource: { kind: "platform", templateId: "hip-hop" },
    displayTemplateId: "hip-hop",
    moderationTemplate: platformTemplate,
  });
});

test("rejects both or neither template selector", async () => {
  const dependencies = resolutionDependencies(readyIngest);

  await assert.rejects(
    resolveGenerationTemplateSource(
      {
        userId: "member-1",
        templateId: "hip-hop",
        customTemplateToken: "opaque-token",
        modelId: "viggle-v4-preview",
      },
      dependencies,
    ),
    hasGenerationCode("TEMPLATE_SELECTION_INVALID"),
  );
  await assert.rejects(
    resolveGenerationTemplateSource(
      {
        userId: "member-1",
        modelId: "viggle-v4-preview",
      },
      dependencies,
    ),
    hasGenerationCode("TEMPLATE_SELECTION_INVALID"),
  );
});

test("rejects custom tokens that are unowned, expired, consumed, or not ready", async () => {
  const input = {
    userId: "member-1",
    customTemplateToken: "opaque-token",
    modelId: "viggle-v4-preview",
  } as const;

  await assert.rejects(
    resolveGenerationTemplateSource(input, resolutionDependencies({ ...readyIngest, userId: "member-2" })),
    hasGenerationCode("CUSTOM_TEMPLATE_NOT_AVAILABLE"),
  );
  await assert.rejects(
    resolveGenerationTemplateSource(
      input,
      resolutionDependencies({ ...readyIngest, expiresAt: "2026-07-20T11:59:59.000Z" }),
    ),
    hasGenerationCode("CUSTOM_TEMPLATE_EXPIRED"),
  );
  await assert.rejects(
    resolveGenerationTemplateSource(
      input,
      resolutionDependencies({ ...readyIngest, state: "consumed", consumedAt: "2026-07-20T10:00:00.000Z" }),
    ),
    hasGenerationCode("CUSTOM_TEMPLATE_ALREADY_CONSUMED"),
  );
  await assert.rejects(
    resolveGenerationTemplateSource(
      input,
      resolutionDependencies({ ...readyIngest, state: "reviewing" }),
    ),
    hasGenerationCode("CUSTOM_TEMPLATE_NOT_READY"),
  );
});

test("requires an active Creator membership and Viggle for custom templates", async () => {
  await assert.rejects(
    resolveGenerationTemplateSource(
      {
        userId: "member-1",
        customTemplateToken: "opaque-token",
        modelId: "seedance-2.0-mini-reference-to-video",
      },
      resolutionDependencies(readyIngest),
    ),
    hasGenerationCode("CUSTOM_TEMPLATE_MODEL_REQUIRED"),
  );

  await assert.rejects(
    resolveGenerationTemplateSource(
      {
        userId: "member-1",
        customTemplateToken: "opaque-token",
        modelId: "viggle-v4-preview",
      },
      resolutionDependencies(readyIngest, false),
    ),
    hasGenerationCode("CUSTOM_TEMPLATE_MEMBER_REQUIRED"),
  );
});

test("releases a custom reservation when provider submission fails", async () => {
  let state = "ready";
  let releaseCalls = 0;

  await assert.rejects(
    submitGenerationWithTemplateReservation(
      {
        resolved: {
          templateSource: {
            kind: "custom",
            ingestId: readyIngest.id,
            objectKey: readyIngest.objectKey,
            mimeType: readyIngest.mimeType,
          },
          displayTemplateId: "custom-member-video",
          customTemplateIngestId: readyIngest.id,
        },
        userId: readyIngest.userId,
        submit: async () => {
          throw new Error("provider unavailable");
        },
      },
      {
        async reserve() {
          if (state !== "ready") return false;
          state = "reserved";
          return true;
        },
        async releaseReservation() {
          releaseCalls += 1;
          state = "ready";
          return true;
        },
        async consume() {
          return false;
        },
      },
    ),
    /provider unavailable/,
  );

  assert.equal(state, "ready");
  assert.equal(releaseCalls, 1);
});

test("preserves the provider error when releasing its reservation returns false", async () => {
  const providerError = new Error("provider unavailable");
  const logEntries: unknown[][] = [];

  await assert.rejects(
    submitGenerationWithTemplateReservation(
      {
        resolved: resolvedCustomTemplate(),
        userId: readyIngest.userId,
        submit: async () => { throw providerError; },
      },
      {
        async reserve() { return true; },
        async releaseReservation() { return false; },
        async consume() { return false; },
      },
      { error: (...values) => { logEntries.push(values); } },
    ),
    (error) => error === providerError,
  );

  assert.deepEqual(logEntries, [[
    "Custom template reservation release failed.",
    {
      operation: "release",
      outcome: "returned_false",
      ingestId: readyIngest.id,
    },
  ]]);
  assert.doesNotMatch(JSON.stringify(logEntries), /opaque-token|custom-template-quarantine/);
});

test("preserves the provider error when releasing its reservation throws", async () => {
  const providerError = new Error("provider unavailable");
  const logEntries: unknown[][] = [];

  await assert.rejects(
    submitGenerationWithTemplateReservation(
      {
        resolved: resolvedCustomTemplate(),
        userId: readyIngest.userId,
        submit: async () => { throw providerError; },
      },
      {
        async reserve() { return true; },
        async releaseReservation() {
          throw new Error(`database failed for ${readyIngest.objectKey}`);
        },
        async consume() { return false; },
      },
      { error: (...values) => { logEntries.push(values); } },
    ),
    (error) => error === providerError,
  );

  assert.deepEqual(logEntries, [[
    "Custom template reservation release failed.",
    {
      operation: "release",
      outcome: "threw",
      errorName: "Error",
      ingestId: readyIngest.id,
    },
  ]]);
  assert.doesNotMatch(JSON.stringify(logEntries), /opaque-token|custom-template-quarantine/);
});

test("consumes a reserved custom template with the provider job ID", async () => {
  let state = "ready";
  let consumedProviderTaskId = "";
  const task = generationTask();

  const result = await submitGenerationWithTemplateReservation(
    {
      resolved: resolvedCustomTemplate(),
      userId: readyIngest.userId,
      submit: async () => task,
    },
    {
      async reserve() {
        if (state !== "ready") return false;
        state = "reserved";
        return true;
      },
      async releaseReservation() {
        state = "ready";
        return true;
      },
      async consume(_ingestId, _userId, providerTaskId) {
        if (state !== "reserved") return false;
        consumedProviderTaskId = providerTaskId;
        state = "consumed";
        return true;
      },
    },
  );

  assert.equal(result, task);
  assert.equal(state, "consumed");
  assert.equal(consumedProviderTaskId, "job-provider-1");
});

test("returns an already-started task when consuming its reservation returns false", async () => {
  const task = generationTask();
  let releaseCalls = 0;
  const logEntries: unknown[][] = [];

  const result = await submitGenerationWithTemplateReservation(
    {
      resolved: resolvedCustomTemplate(),
      userId: readyIngest.userId,
      submit: async () => task,
    },
    {
      async reserve() { return true; },
      async releaseReservation() {
        releaseCalls += 1;
        return true;
      },
      async consume() { return false; },
    },
    { error: (...values) => { logEntries.push(values); } },
  );

  assert.equal(result, task);
  assert.equal(releaseCalls, 0);
  assert.deepEqual(logEntries, [[
    "Custom template reservation needs reconciliation.",
    {
      operation: "consume",
      outcome: "returned_false",
      ingestId: readyIngest.id,
      providerTaskId: "job-provider-1",
    },
  ]]);
  assert.doesNotMatch(JSON.stringify(logEntries), /opaque-token|custom-template-quarantine/);
});

test("returns an already-started task when consuming its reservation throws", async () => {
  const task = generationTask();
  let releaseCalls = 0;
  const logEntries: unknown[][] = [];

  const result = await submitGenerationWithTemplateReservation(
    {
      resolved: resolvedCustomTemplate(),
      userId: readyIngest.userId,
      submit: async () => task,
    },
    {
      async reserve() { return true; },
      async releaseReservation() {
        releaseCalls += 1;
        return true;
      },
      async consume() {
        throw new Error(`database failed for ${readyIngest.objectKey}`);
      },
    },
    { error: (...values) => { logEntries.push(values); } },
  );

  assert.equal(result, task);
  assert.equal(releaseCalls, 0);
  assert.deepEqual(logEntries, [[
    "Custom template reservation needs reconciliation.",
    {
      operation: "consume",
      outcome: "threw",
      errorName: "Error",
      ingestId: readyIngest.id,
      providerTaskId: "job-provider-1",
    },
  ]]);
  assert.doesNotMatch(JSON.stringify(logEntries), /opaque-token|custom-template-quarantine/);
});

test("submits platform templates without touching custom reservations", async () => {
  const task = generationTask();
  const failIfCalled = async () => {
    throw new Error("custom repository should not be called");
  };

  const result = await submitGenerationWithTemplateReservation(
    {
      resolved: {
        templateSource: { kind: "platform", templateId: "hip-hop" },
        displayTemplateId: "hip-hop",
      },
      userId: "user-1",
      submit: async () => task,
    },
    {
      reserve: failIfCalled,
      releaseReservation: failIfCalled,
      consume: failIfCalled,
    },
  );

  assert.equal(result, task);
});

test("an atomic reservation prevents concurrent double provider submission", async () => {
  let state = "ready";
  let providerSubmissions = 0;
  const repository = {
    async reserve() {
      if (state !== "ready") return false;
      state = "reserved";
      return true;
    },
    async releaseReservation() {
      state = "ready";
      return true;
    },
    async consume() {
      if (state !== "reserved") return false;
      state = "consumed";
      return true;
    },
  };
  const submitOnce = () =>
    submitGenerationWithTemplateReservation(
      {
        resolved: resolvedCustomTemplate(),
        userId: readyIngest.userId,
        submit: async () => {
          providerSubmissions += 1;
          await new Promise((resolve) => setTimeout(resolve, 5));
          return generationTask();
        },
      },
      repository,
    );

  const results = await Promise.allSettled([submitOnce(), submitOnce()]);

  assert.equal(providerSubmissions, 1);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  const rejection = results.find((result) => result.status === "rejected");
  assert.equal(
    rejection?.status === "rejected" && rejection.reason instanceof GenerationTemplateError
      ? rejection.reason.code
      : undefined,
    "CUSTOM_TEMPLATE_ALREADY_RESERVED",
  );
});

function resolutionDependencies(ingest: CustomTemplateIngest, activeMember = true) {
  return {
    now: () => new Date("2026-07-20T12:00:00.000Z"),
    hasActiveCreatorSubscription: async () => activeMember,
    findPublicTemplate: () => undefined,
    repository: {
      async findByTokenHash() {
        return ingest;
      },
    },
  };
}

function hasGenerationCode(code: GenerationTemplateError["code"]) {
  return (error: unknown) => error instanceof GenerationTemplateError && error.code === code;
}

function resolvedCustomTemplate() {
  return {
    templateSource: {
      kind: "custom",
      ingestId: readyIngest.id,
      objectKey: readyIngest.objectKey,
      mimeType: readyIngest.mimeType,
    },
    displayTemplateId: "custom-member-video",
    customTemplateIngestId: readyIngest.id,
  } as const;
}

function generationTask(): DanceGenerationTask {
  return {
    id: "job-provider-1",
    userId: readyIngest.userId,
    status: "submitted",
    templateId: "custom-member-video",
    customTemplateIngestId: readyIngest.id,
    aspectRatio: "9:16",
    provider: "viggle",
    model: "viggle-v4-preview",
    providerJobId: "job-provider-1",
    payloadVersion: "dancegen-viggle-render-v1",
    hdUnlocked: false,
    createdAt: "2026-07-20T12:00:00.000Z",
    updatedAt: "2026-07-20T12:00:00.000Z",
  };
}
