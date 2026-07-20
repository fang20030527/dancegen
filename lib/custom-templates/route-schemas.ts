import { z } from "zod";

import { customTemplateLimits } from "./validation.ts";

const idempotencyKeySchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

export const customTemplatePrepareSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255).refine((value) => !/[\u0000-\u001f\u007f]/.test(value)),
    contentType: z.enum(["video/mp4", "video/webm"]),
    sizeBytes: z.number().int().positive().max(customTemplateLimits.maxBytes),
    rightsConfirmed: z.literal(true),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const customTemplateFinalizeSchema = z
  .object({
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const customTemplateImportSchema = z
  .object({
    url: z.url().max(2_048),
    rightsConfirmed: z.literal(true),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict();

export const customTemplateIngestParamsSchema = z
  .object({
    ingestId: z.uuid(),
  })
  .strict();

export function getCustomTemplateRequestErrorCode(
  error: z.ZodError,
): "INVALID_REQUEST" | "INVALID_FORMAT" | "FILE_TOO_LARGE" | "UNSAFE_URL" {
  if (error.issues.some((issue) => issue.path[0] === "sizeBytes" && issue.code === "too_big")) {
    return "FILE_TOO_LARGE";
  }
  if (error.issues.some((issue) => issue.path[0] === "contentType")) {
    return "INVALID_FORMAT";
  }
  if (error.issues.some((issue) => issue.path[0] === "url")) {
    return "UNSAFE_URL";
  }
  return "INVALID_REQUEST";
}
