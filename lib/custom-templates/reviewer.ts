import { z } from "zod";

import { getCustomTemplateConfig } from "./config.ts";
import { customTemplateStorage, type CustomTemplateStorage } from "./storage.ts";
import type { CustomTemplateMime } from "./types";
import {
  assertDurationAllowed,
  CustomTemplateValidationError,
} from "./validation.ts";

const reviewPolicy = "danceclip-custom-template-v1" as const;
const reviewReadUrlLifetimeSeconds = 300;
const reviewTimeoutMs = 30_000;

const reviewResponseSchema = z
  .object({
    allowed: z.boolean(),
    durationSeconds: z.number().finite(),
    detectedMime: z.enum(["video/mp4", "video/webm"]),
    reasonCodes: z.array(z.string()).optional(),
  })
  .strict();

export type CustomTemplateReviewResult = {
  durationSeconds: number;
  detectedMime: CustomTemplateMime;
};

export class CustomTemplateReviewError extends Error {
  readonly code: "REVIEW_UNAVAILABLE" | "REVIEW_BLOCKED";

  constructor(code: "REVIEW_UNAVAILABLE" | "REVIEW_BLOCKED") {
    super(code);
    this.name = "CustomTemplateReviewError";
    this.code = code;
  }
}

type ReviewInput = {
  ingestId: string;
  objectKey: string;
  storedMime: CustomTemplateMime;
  signatureMime: CustomTemplateMime;
};

type ReviewConfig = {
  reviewUrl: string;
  reviewApiKey: string;
};

type ReviewFetch = (
  url: string,
  init: {
    method: "POST";
    headers: { authorization: string; "content-type": "application/json" };
    body: string;
    signal: AbortSignal;
  },
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

type ReviewDependencies = {
  storage?: Pick<CustomTemplateStorage, "createReadUrl">;
  config?: ReviewConfig;
  fetch?: ReviewFetch;
  createTimeoutSignal?: (timeoutMs: number) => AbortSignal;
};

export async function reviewCustomTemplate(
  input: ReviewInput,
  dependencies: ReviewDependencies = {},
): Promise<CustomTemplateReviewResult> {
  const storage = dependencies.storage ?? customTemplateStorage;
  const config = dependencies.config ?? readConfiguredReviewer();
  const reviewFetch = dependencies.fetch ?? defaultReviewFetch;
  const createTimeoutSignal = dependencies.createTimeoutSignal ?? defaultTimeoutSignal;
  const response = await requestReview(
    input,
    storage,
    config,
    reviewFetch,
    createTimeoutSignal,
  );

  if (!response.allowed) {
    throw new CustomTemplateReviewError("REVIEW_BLOCKED");
  }

  if (
    input.signatureMime !== input.storedMime ||
    response.detectedMime !== input.storedMime
  ) {
    throw new CustomTemplateValidationError("INVALID_FORMAT");
  }

  assertDurationAllowed(response.durationSeconds);

  return {
    durationSeconds: response.durationSeconds,
    detectedMime: response.detectedMime,
  };
}

function readConfiguredReviewer(): ReviewConfig {
  try {
    const config = getCustomTemplateConfig();
    if (!config.enabled) {
      throw new CustomTemplateReviewError("REVIEW_UNAVAILABLE");
    }
    return { reviewUrl: config.reviewUrl, reviewApiKey: config.reviewApiKey };
  } catch (error) {
    if (error instanceof CustomTemplateReviewError) {
      throw error;
    }
    throw new CustomTemplateReviewError("REVIEW_UNAVAILABLE");
  }
}

async function requestReview(
  input: ReviewInput,
  storage: Pick<CustomTemplateStorage, "createReadUrl">,
  config: ReviewConfig,
  reviewFetch: ReviewFetch,
  createTimeoutSignal: (timeoutMs: number) => AbortSignal,
): Promise<z.infer<typeof reviewResponseSchema>> {
  try {
    const mediaUrl = await storage.createReadUrl(
      input.objectKey,
      reviewReadUrlLifetimeSeconds,
    );
    const response = await reviewFetch(config.reviewUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.reviewApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        mediaUrl,
        ingestId: input.ingestId,
        declaredMime: input.storedMime,
        policy: reviewPolicy,
      }),
      signal: createTimeoutSignal(reviewTimeoutMs),
    });

    if (!response.ok) {
      throw new Error("review request was unsuccessful");
    }

    return reviewResponseSchema.parse(await response.json());
  } catch {
    throw new CustomTemplateReviewError("REVIEW_UNAVAILABLE");
  }
}

const defaultReviewFetch: ReviewFetch = async (url, init) => fetch(url, init);
const defaultTimeoutSignal = (timeoutMs: number) => AbortSignal.timeout(timeoutMs);
