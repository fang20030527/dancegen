import { randomBytes } from "node:crypto";

import { detectVideoMime } from "./media.ts";
import {
  customTemplateRepository,
  hashCustomTemplateToken,
  type CustomTemplateRepository,
} from "./repository.ts";
import {
  downloadRemoteVideo,
  RemoteVideoError,
  type DownloadedRemoteVideo,
} from "./remote-video.ts";
import {
  CustomTemplateReviewError,
  reviewCustomTemplate,
  type CustomTemplateReviewResult,
} from "./reviewer.ts";
import { customTemplateStorage, type CustomTemplateStorage } from "./storage.ts";
import type {
  CustomTemplateIngest,
  CustomTemplateMime,
} from "./types";
import {
  customTemplateLimits,
  CustomTemplateValidationError,
  validateCustomTemplateDeclaration,
} from "./validation.ts";

const uploadUrlExpiresInSeconds = 600 as const;
const approvedLifetimeMs = 24 * 60 * 60 * 1000;
const signaturePrefixBytes = 16;

export type CustomTemplateResult = {
  ingest: CustomTemplateIngest;
  customTemplateToken?: string;
};

export type PreparedCustomTemplateUpload = {
  ingest: CustomTemplateIngest;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  expiresInSeconds: typeof uploadUrlExpiresInSeconds;
};

export class CustomTemplateServiceError extends Error {
  readonly code: "NOT_FOUND" | "INVALID_STATE" | "INGEST_FAILED";

  constructor(code: "NOT_FOUND" | "INVALID_STATE" | "INGEST_FAILED") {
    super(code);
    this.name = "CustomTemplateServiceError";
    this.code = code;
  }
}

type ReviewFunction = (
  input: {
    ingestId: string;
    objectKey: string;
    storedMime: CustomTemplateMime;
    signatureMime: CustomTemplateMime;
  },
) => Promise<CustomTemplateReviewResult>;

type DownloadFunction = (rawUrl: string) => Promise<DownloadedRemoteVideo>;

type ServiceDependencies = {
  repository: CustomTemplateRepository;
  storage: CustomTemplateStorage;
  review: ReviewFunction;
  download: DownloadFunction;
  createToken: () => string;
  now: () => Date;
};

export class CustomTemplateService {
  private readonly dependencies: ServiceDependencies;

  constructor(dependencies: Partial<ServiceDependencies> = {}) {
    this.dependencies = {
      repository: dependencies.repository ?? customTemplateRepository,
      storage: dependencies.storage ?? customTemplateStorage,
      review: dependencies.review ?? reviewCustomTemplate,
      download: dependencies.download ?? downloadRemoteVideo,
      createToken: dependencies.createToken ?? createOpaqueToken,
      now: dependencies.now ?? (() => new Date()),
    };
  }

  async prepareUpload(input: {
    userId: string;
    idempotencyKey: string;
    contentType: CustomTemplateMime;
    sizeBytes: number;
  }): Promise<PreparedCustomTemplateUpload> {
    const declaration = validateCustomTemplateDeclaration(input);
    const ingest = await this.dependencies.repository.createOrGet({
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      sourceKind: "upload",
      mimeType: declaration.contentType,
      sizeBytes: declaration.sizeBytes,
    });

    if (ingest.state !== "awaiting_upload") {
      throw new CustomTemplateServiceError("INVALID_STATE");
    }

    const upload = await this.dependencies.storage.createUploadUrl({
      objectKey: ingest.objectKey,
      contentType: ingest.mimeType,
      sizeBytes: ingest.sizeBytes,
    });

    return {
      ingest,
      uploadUrl: upload.url,
      uploadHeaders: upload.headers,
      expiresInSeconds: uploadUrlExpiresInSeconds,
    };
  }

  async finalizeUpload(input: {
    ingestId: string;
    userId: string;
  }): Promise<CustomTemplateResult> {
    const ingest = await this.requireOwnedIngest(input.ingestId, input.userId);

    if (ingest.sourceKind !== "upload") {
      throw new CustomTemplateServiceError("INVALID_STATE");
    }

    if (ingest.state === "ready" || ingest.state === "reserved" || ingest.state === "consumed") {
      return { ingest };
    }

    if (ingest.state === "rejected" || ingest.state === "failed" || ingest.state === "deleted") {
      return { ingest };
    }

    if (ingest.state !== "awaiting_upload" && ingest.state !== "reviewing") {
      throw new CustomTemplateServiceError("INVALID_STATE");
    }

    try {
      const head = await this.dependencies.storage.getHead(ingest.objectKey);
      assertStoredObjectMatches(ingest, head);
      return await this.validateAndReview(ingest);
    } catch (error) {
      const normalizedError = normalizeServiceError(error);
      await this.failAndDelete(ingest, normalizedError);
      throw normalizedError;
    }
  }

  async importRemote(input: {
    userId: string;
    idempotencyKey: string;
    url: string;
  }): Promise<CustomTemplateResult> {
    const downloaded = await this.dependencies.download(input.url);
    const mimeType = validateDownloadedMedia(downloaded);
    const declaration = validateCustomTemplateDeclaration({
      contentType: mimeType,
      sizeBytes: downloaded.bytes.byteLength,
    });
    const ingest = await this.dependencies.repository.createOrGet({
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      sourceKind: "url",
      mimeType: declaration.contentType,
      sizeBytes: declaration.sizeBytes,
    });

    if (ingest.state === "ready" || ingest.state === "reserved" || ingest.state === "consumed") {
      return { ingest };
    }
    if (ingest.state === "rejected" || ingest.state === "failed" || ingest.state === "deleted") {
      return { ingest };
    }
    if (ingest.state !== "transferring" && ingest.state !== "reviewing") {
      throw new CustomTemplateServiceError("INVALID_STATE");
    }

    try {
      await this.dependencies.storage.putBytes({
        objectKey: ingest.objectKey,
        contentType: ingest.mimeType,
        bytes: downloaded.bytes,
      });
      return await this.validateAndReview(ingest);
    } catch (error) {
      const normalizedError = normalizeServiceError(error);
      await this.failAndDelete(ingest, normalizedError);
      throw normalizedError;
    }
  }

  private async validateAndReview(
    ingest: CustomTemplateIngest,
  ): Promise<CustomTemplateResult> {
    const prefix = await this.dependencies.storage.getPrefix(
      ingest.objectKey,
      signaturePrefixBytes,
    );
    const signatureMime = detectVideoMime(prefix);
    const reviewing = await this.dependencies.repository.markReviewing(
      ingest.id,
      ingest.userId,
    );
    const review = await this.dependencies.review({
      ingestId: reviewing.id,
      objectKey: reviewing.objectKey,
      storedMime: reviewing.mimeType,
      signatureMime,
    });

    return this.approve(reviewing, review);
  }

  private async approve(
    ingest: CustomTemplateIngest,
    review: CustomTemplateReviewResult,
  ): Promise<CustomTemplateResult> {
    const token = this.dependencies.createToken();
    const tokenHash = hashCustomTemplateToken(token);
    const expiresAt = new Date(this.dependencies.now().getTime() + approvedLifetimeMs).toISOString();
    const ready = await this.dependencies.repository.markReady({
      id: ingest.id,
      userId: ingest.userId,
      durationSeconds: review.durationSeconds,
      tokenHash,
      expiresAt,
    });

    return ready.tokenHash === tokenHash
      ? { ingest: ready, customTemplateToken: token }
      : { ingest: ready };
  }

  private async requireOwnedIngest(
    ingestId: string,
    userId: string,
  ): Promise<CustomTemplateIngest> {
    const ingest = await this.dependencies.repository.findOwned(ingestId, userId);
    if (!ingest) {
      throw new CustomTemplateServiceError("NOT_FOUND");
    }
    return ingest;
  }

  private async failAndDelete(
    ingest: CustomTemplateIngest,
    error: Error & { code?: string },
  ): Promise<void> {
    const state = error instanceof CustomTemplateReviewError && error.code === "REVIEW_BLOCKED"
      ? "rejected"
      : "failed";

    try {
      const terminal = await this.dependencies.repository.markFailed({
        id: ingest.id,
        userId: ingest.userId,
        state,
        reasonCode: error.code ?? "INGEST_FAILED",
      });
      if (terminal.state !== "failed" && terminal.state !== "rejected") {
        return;
      }
    } catch {
      // Deletion is still required when terminal-state persistence is unavailable.
    }

    try {
      await this.dependencies.storage.deleteObject(ingest.objectKey);
    } catch {
      // Persistent terminal state keeps the object eligible for retryable cleanup.
    }
  }
}

function assertStoredObjectMatches(
  ingest: CustomTemplateIngest,
  head: { contentType: string; sizeBytes: number },
): void {
  if (head.sizeBytes > customTemplateLimits.maxBytes) {
    throw new CustomTemplateValidationError("FILE_TOO_LARGE");
  }

  if (
    head.sizeBytes <= 0 ||
    head.sizeBytes !== ingest.sizeBytes ||
    head.contentType !== ingest.mimeType
  ) {
    throw new CustomTemplateValidationError("INVALID_FORMAT");
  }
}

function validateDownloadedMedia(downloaded: DownloadedRemoteVideo): CustomTemplateMime {
  const signatureMime = detectVideoMime(downloaded.bytes.subarray(0, signaturePrefixBytes));
  const responseMime = downloaded.contentType?.split(";", 1)[0].trim().toLowerCase();

  if (responseMime !== signatureMime) {
    throw new CustomTemplateValidationError("INVALID_FORMAT");
  }

  return signatureMime;
}

function normalizeServiceError(error: unknown): Error & { code?: string } {
  if (
    error instanceof CustomTemplateValidationError ||
    error instanceof CustomTemplateReviewError ||
    error instanceof RemoteVideoError ||
    error instanceof CustomTemplateServiceError
  ) {
    return error;
  }
  return new CustomTemplateServiceError("INGEST_FAILED");
}

function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export const customTemplateService = new CustomTemplateService();
