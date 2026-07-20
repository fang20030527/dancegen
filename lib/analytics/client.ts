export const productEventNames = [
  "custom_template_upload_start",
  "custom_template_import_start",
  "custom_template_transfer_complete",
  "custom_template_review_ready",
  "custom_template_review_failed",
  "custom_template_removed",
  "select_template",
  "generate_click",
  "generate_start",
  "generate_success",
  "generate_failed",
  "auth_start",
  "auth_success",
  "checkout_start",
  "purchase",
] as const;

export type ProductEventName = (typeof productEventNames)[number];

const generationFailureReasonCodes = [
  "TEMPLATE_SELECTION_INVALID",
  "TEMPLATE_NOT_AVAILABLE",
  "CUSTOM_TEMPLATE_MEMBER_REQUIRED",
  "CUSTOM_TEMPLATE_MODEL_REQUIRED",
  "CUSTOM_TEMPLATE_EXPIRED",
  "CUSTOM_TEMPLATE_ALREADY_CONSUMED",
  "CUSTOM_TEMPLATE_ALREADY_RESERVED",
  "CUSTOM_TEMPLATE_NOT_READY",
  "CUSTOM_TEMPLATE_NOT_AVAILABLE",
  "MEMBER_MODEL_REQUIRED",
  "SOURCE_UPLOAD_REQUIRED",
  "SOURCE_IMAGE_REQUIRED",
  "GENERATION_BLOCKED_BY_MODERATION",
  "GENERATION_MODERATION_UNAVAILABLE",
  "MODEL_PROVIDER_FAILED",
] as const;

type GenerationFailureReasonCode = (typeof generationFailureReasonCodes)[number];

const analyticsValues = {
  source: ["upload", "url", "platform", "custom", "generator", "pricing", "register"] as const,
  state: [
    "validating",
    "transferring",
    "reviewing",
    "ready",
    "failed",
    "removed",
    "submitting",
    "processing",
    "succeeded",
  ] as const,
  model: ["viggle-v4-preview", "seedance-2.0-mini-reference-to-video"] as const,
  reasonCode: [
    "FEATURE_DISABLED",
    "GOOGLE_AUTH_REQUIRED",
    "CREATOR_REQUIRED",
    "INVALID_REQUEST",
    "NOT_FOUND",
    "INVALID_STATE",
    "IDEMPOTENCY_CONFLICT",
    "INVALID_FORMAT",
    "FILE_TOO_LARGE",
    "INVALID_DURATION",
    "UNSAFE_URL",
    "DOWNLOAD_TIMEOUT",
    "DOWNLOAD_FAILED",
    "REVIEW_UNAVAILABLE",
    "REVIEW_BLOCKED",
    "INGEST_FAILED",
    "PREVIEW_NOT_AVAILABLE",
    "DELETE_FAILED",
    "INTERNAL_ERROR",
    "UPLOAD_FAILED",
    "GENERATION_REJECTED",
    "GENERATION_FAILED",
    "STATUS_UNAVAILABLE",
    "PROCESSING_TIMEOUT",
    ...generationFailureReasonCodes,
  ] as const,
  sizeBucket: ["under-10mb", "10-50mb", "over-50mb"] as const,
  durationBucket: ["3-5s", "6-10s", "11-15s"] as const,
} as const;

type AnalyticsValues = typeof analyticsValues;
type AnalyticsPropertyName = keyof AnalyticsValues;

export type AnalyticsProperties = {
  [Name in AnalyticsPropertyName]?: AnalyticsValues[Name][number];
};

type Gtag = (command: "event", name: ProductEventName, properties: AnalyticsProperties) => void;

declare global {
  interface Window {
    gtag?: Gtag;
  }
}

export function sanitizeAnalyticsProperties(input: Record<string, unknown>): AnalyticsProperties {
  const safeProperties: Record<string, string> = {};

  for (const [name, allowedValues] of Object.entries(analyticsValues)) {
    const value = input[name];
    if (typeof value === "string" && (allowedValues as readonly string[]).includes(value)) {
      safeProperties[name] = value;
    }
  }

  return safeProperties as AnalyticsProperties;
}

export function getAnalyticsSizeBucket(sizeBytes: number): AnalyticsProperties["sizeBucket"] {
  if (sizeBytes < 10 * 1024 * 1024) {
    return "under-10mb";
  }

  return sizeBytes <= 50 * 1024 * 1024 ? "10-50mb" : "over-50mb";
}

export function getAnalyticsDurationBucket(durationSeconds: number): AnalyticsProperties["durationBucket"] {
  if (durationSeconds <= 5) {
    return "3-5s";
  }

  return durationSeconds <= 10 ? "6-10s" : "11-15s";
}

export function getAnalyticsGenerationFailureReason(
  value: unknown,
): GenerationFailureReasonCode | "GENERATION_FAILED" {
  if (
    typeof value === "string" &&
    (generationFailureReasonCodes as readonly string[]).includes(value)
  ) {
    return value as GenerationFailureReasonCode;
  }

  return "GENERATION_FAILED";
}

export function trackProductEvent(name: ProductEventName, properties: AnalyticsProperties = {}): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", name, sanitizeAnalyticsProperties(properties));
}
