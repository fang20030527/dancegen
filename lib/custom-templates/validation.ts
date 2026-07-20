import { z } from "zod";

import type { CustomTemplateMime } from "./types";

export const customTemplateLimits = {
  maxBytes: 50 * 1024 * 1024,
  minDurationSeconds: 3,
  maxDurationSeconds: 15,
} as const;

const declarationSchema = z.object({
  contentType: z.enum(["video/mp4", "video/webm"]),
  sizeBytes: z.number().int().positive().max(customTemplateLimits.maxBytes),
});

export function validateCustomTemplateDeclaration(
  input: unknown,
): { contentType: CustomTemplateMime; sizeBytes: number } {
  return declarationSchema.parse(input);
}

export function assertDurationAllowed(durationSeconds: number) {
  if (
    durationSeconds < customTemplateLimits.minDurationSeconds ||
    durationSeconds > customTemplateLimits.maxDurationSeconds
  ) {
    throw new CustomTemplateValidationError("INVALID_DURATION");
  }
}

export class CustomTemplateValidationError extends Error {
  readonly code: "INVALID_DURATION" | "INVALID_FORMAT" | "FILE_TOO_LARGE";

  constructor(code: "INVALID_DURATION" | "INVALID_FORMAT" | "FILE_TOO_LARGE") {
    super(code);
    this.name = "CustomTemplateValidationError";
    this.code = code;
  }
}
