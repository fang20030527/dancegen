import { customTemplateRepository, type CustomTemplateRepository } from "./repository.ts";
import {
  CustomTemplateService,
  type CustomTemplateResult,
  type PreparedCustomTemplateUpload,
} from "./service.ts";
import { customTemplateStorage, type CustomTemplateStorage } from "./storage.ts";
import type {
  CustomTemplateIngest,
  CustomTemplateMime,
  CustomTemplatePublicState,
} from "./types";

const previewExpiresInSeconds = 300 as const;
const cleanupLimit = 100 as const;

export function toCustomTemplatePublicState(
  ingest: CustomTemplateIngest,
  additions: Pick<CustomTemplatePublicState, "customTemplateToken" | "previewUrl"> = {},
): CustomTemplatePublicState {
  return {
    id: ingest.id,
    state: ingest.state,
    mimeType: ingest.mimeType,
    sizeBytes: ingest.sizeBytes,
    durationSeconds: ingest.durationSeconds,
    expiresAt: ingest.expiresAt,
    reasonCode: ingest.reasonCode,
    ...additions,
  };
}

export type CustomTemplateRouteDependencies = {
  repository: CustomTemplateRepository;
  storage: CustomTemplateStorage;
  service: Pick<
    CustomTemplateService,
    "prepareUpload" | "finalizeUpload" | "importRemote"
  >;
  now: () => Date;
};

function routeDependencies(
  overrides: Partial<CustomTemplateRouteDependencies> = {},
): CustomTemplateRouteDependencies {
  const repository = overrides.repository ?? customTemplateRepository;
  const storage = overrides.storage ?? customTemplateStorage;
  return {
    repository,
    storage,
    service: overrides.service ?? new CustomTemplateService({ repository, storage }),
    now: overrides.now ?? (() => new Date()),
  };
}

export async function prepareCustomTemplateUpload(
  input: {
    userId: string;
    idempotencyKey: string;
    contentType: CustomTemplateMime;
    sizeBytes: number;
  },
  overrides: Partial<CustomTemplateRouteDependencies> = {},
): Promise<PreparedCustomTemplateUpload> {
  return routeDependencies(overrides).service.prepareUpload(input);
}

export async function finalizeCustomTemplateUpload(
  input: { ingestId: string; userId: string; idempotencyKey: string },
  overrides: Partial<CustomTemplateRouteDependencies> = {},
): Promise<CustomTemplatePublicState> {
  const dependencies = routeDependencies(overrides);
  const ingest = await requireOwnedIngest(dependencies.repository, input.ingestId, input.userId);
  assertIdempotencyKey(ingest, input.idempotencyKey);
  const result = await dependencies.service.finalizeUpload(input);
  return publicResult(result);
}

export async function importCustomTemplate(
  input: { userId: string; idempotencyKey: string; url: string },
  overrides: Partial<CustomTemplateRouteDependencies> = {},
): Promise<CustomTemplatePublicState> {
  const dependencies = routeDependencies(overrides);
  const result = await dependencies.service.importRemote(input);
  return publicResult(result);
}

export async function getOwnedCustomTemplateState(
  input: { ingestId: string; userId: string },
  overrides: Partial<CustomTemplateRouteDependencies> = {},
): Promise<CustomTemplatePublicState> {
  const dependencies = routeDependencies(overrides);
  const ingest = await requireOwnedIngest(dependencies.repository, input.ingestId, input.userId);

  if (!isReadyForPreview(ingest, dependencies.now())) {
    return toCustomTemplatePublicState(ingest);
  }

  const previewUrl = await dependencies.storage.createReadUrl(
    ingest.objectKey,
    previewExpiresInSeconds,
  );
  return toCustomTemplatePublicState(ingest, { previewUrl });
}

export async function getOwnedCustomTemplatePreview(
  input: { ingestId: string; userId: string },
  overrides: Partial<CustomTemplateRouteDependencies> = {},
): Promise<{ previewUrl: string; expiresInSeconds: typeof previewExpiresInSeconds }> {
  const dependencies = routeDependencies(overrides);
  const ingest = await requireOwnedIngest(dependencies.repository, input.ingestId, input.userId);
  if (!isReadyForPreview(ingest, dependencies.now())) {
    throw new CustomTemplateRouteOperationError("PREVIEW_NOT_AVAILABLE");
  }

  return {
    previewUrl: await dependencies.storage.createReadUrl(
      ingest.objectKey,
      previewExpiresInSeconds,
    ),
    expiresInSeconds: previewExpiresInSeconds,
  };
}

export async function deleteOwnedCustomTemplate(
  input: { ingestId: string; userId: string },
  overrides: Partial<CustomTemplateRouteDependencies> = {},
): Promise<CustomTemplatePublicState> {
  const dependencies = routeDependencies(overrides);
  const ingest = await requireOwnedIngest(dependencies.repository, input.ingestId, input.userId);

  if (ingest.state === "deleted") {
    return toCustomTemplatePublicState(ingest);
  }
  if (ingest.state === "reserved" && !hasExpired(ingest, dependencies.now())) {
    throw new CustomTemplateRouteOperationError("INVALID_STATE");
  }

  try {
    await dependencies.storage.deleteObject(ingest.objectKey);
    await dependencies.repository.markDeleted(ingest.id, ingest.userId);
  } catch {
    throw new CustomTemplateRouteOperationError("DELETE_FAILED");
  }

  const deleted = await dependencies.repository.findOwned(ingest.id, ingest.userId);
  if (!deleted || deleted.state !== "deleted") {
    throw new CustomTemplateRouteOperationError("INVALID_STATE");
  }
  return toCustomTemplatePublicState(deleted);
}

export async function cleanupCustomTemplates(
  overrides: Partial<CustomTemplateRouteDependencies> = {},
): Promise<{ deleted: number; failed: number }> {
  const dependencies = routeDependencies(overrides);
  const candidates = await dependencies.repository.listCleanupCandidates(
    dependencies.now(),
    cleanupLimit,
  );
  let deleted = 0;
  let failed = 0;

  for (const ingest of candidates) {
    try {
      await dependencies.storage.deleteObject(ingest.objectKey);
      await dependencies.repository.markDeleted(ingest.id, ingest.userId);
      deleted += 1;
    } catch {
      failed += 1;
    }
  }

  return { deleted, failed };
}

export class CustomTemplateRouteOperationError extends Error {
  readonly code:
    | "NOT_FOUND"
    | "IDEMPOTENCY_CONFLICT"
    | "INVALID_STATE"
    | "PREVIEW_NOT_AVAILABLE"
    | "DELETE_FAILED";

  constructor(code: CustomTemplateRouteOperationError["code"]) {
    super(code);
    this.name = "CustomTemplateRouteOperationError";
    this.code = code;
  }
}

function publicResult(result: CustomTemplateResult): CustomTemplatePublicState {
  return toCustomTemplatePublicState(result.ingest, {
    customTemplateToken: result.customTemplateToken,
  });
}

async function requireOwnedIngest(
  repository: CustomTemplateRepository,
  ingestId: string,
  userId: string,
): Promise<CustomTemplateIngest> {
  const ingest = await repository.findOwned(ingestId, userId);
  if (!ingest) {
    throw new CustomTemplateRouteOperationError("NOT_FOUND");
  }
  return ingest;
}

function assertIdempotencyKey(
  ingest: CustomTemplateIngest,
  idempotencyKey: string,
): void {
  if (ingest.idempotencyKey !== idempotencyKey) {
    throw new CustomTemplateRouteOperationError("IDEMPOTENCY_CONFLICT");
  }
}

function isReadyForPreview(ingest: CustomTemplateIngest, now: Date): boolean {
  return ingest.state === "ready" && !hasExpired(ingest, now);
}

function hasExpired(ingest: CustomTemplateIngest, now: Date): boolean {
  const expiresAt = ingest.expiresAt === null ? Number.NaN : Date.parse(ingest.expiresAt);
  return !Number.isFinite(expiresAt) || expiresAt <= now.getTime();
}
