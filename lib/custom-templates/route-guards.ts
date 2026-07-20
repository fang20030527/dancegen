import { randomUUID, timingSafeEqual } from "node:crypto";

import { getCustomTemplateConfig } from "./config.ts";

export type CustomTemplateApiErrorCode =
  | "FEATURE_DISABLED"
  | "GOOGLE_AUTH_REQUIRED"
  | "CREATOR_REQUIRED"
  | "INVALID_REQUEST"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "IDEMPOTENCY_CONFLICT"
  | "INVALID_FORMAT"
  | "FILE_TOO_LARGE"
  | "INVALID_DURATION"
  | "UNSAFE_URL"
  | "DOWNLOAD_TIMEOUT"
  | "DOWNLOAD_FAILED"
  | "REVIEW_UNAVAILABLE"
  | "REVIEW_BLOCKED"
  | "INGEST_FAILED"
  | "PREVIEW_NOT_AVAILABLE"
  | "DELETE_FAILED"
  | "INTERNAL_ERROR";

export type CustomTemplateErrorResponse = {
  status: number;
  body: {
    code: CustomTemplateApiErrorCode;
    message: string;
    requestId?: string;
  };
};

const safeErrors: Record<Exclude<CustomTemplateApiErrorCode, "INTERNAL_ERROR">, CustomTemplateErrorResponse> = {
  FEATURE_DISABLED: response(404, "FEATURE_DISABLED", "Custom video templates are not available."),
  GOOGLE_AUTH_REQUIRED: response(401, "GOOGLE_AUTH_REQUIRED", "Continue with Google before using a custom video template."),
  CREATOR_REQUIRED: response(402, "CREATOR_REQUIRED", "Upgrade to the Creator plan before using a custom video template."),
  INVALID_REQUEST: response(400, "INVALID_REQUEST", "Check the custom video details and try again."),
  NOT_FOUND: response(404, "NOT_FOUND", "This custom video could not be found."),
  INVALID_STATE: response(409, "INVALID_STATE", "This custom video cannot be changed in its current state."),
  IDEMPOTENCY_CONFLICT: response(409, "IDEMPOTENCY_CONFLICT", "Use a new request identifier for a different video."),
  INVALID_FORMAT: response(415, "INVALID_FORMAT", "Upload a valid MP4 or WebM video."),
  FILE_TOO_LARGE: response(413, "FILE_TOO_LARGE", "Choose a video no larger than 50 MB."),
  INVALID_DURATION: response(422, "INVALID_DURATION", "Choose a video between 3 and 15 seconds long."),
  UNSAFE_URL: response(400, "UNSAFE_URL", "Use a direct public HTTPS video-file URL."),
  DOWNLOAD_TIMEOUT: response(504, "DOWNLOAD_TIMEOUT", "The video download timed out. Try another direct link."),
  DOWNLOAD_FAILED: response(502, "DOWNLOAD_FAILED", "The video could not be downloaded from that link."),
  REVIEW_UNAVAILABLE: response(503, "REVIEW_UNAVAILABLE", "Video review is temporarily unavailable. Please try again later."),
  REVIEW_BLOCKED: response(403, "REVIEW_BLOCKED", "This video could not be used because it does not meet our content policy."),
  INGEST_FAILED: response(502, "INGEST_FAILED", "The custom video could not be prepared. Please try again."),
  PREVIEW_NOT_AVAILABLE: response(409, "PREVIEW_NOT_AVAILABLE", "A preview is available only after the video is approved."),
  DELETE_FAILED: response(502, "DELETE_FAILED", "The custom video could not be removed. Please try again."),
};

export function mapCustomTemplateError(error: unknown): CustomTemplateErrorResponse {
  const code = readKnownCode(error);

  if (code && code !== "INTERNAL_ERROR") {
    return safeErrors[code];
  }

  return {
    status: 500,
    body: {
      code: "INTERNAL_ERROR",
      message: "The custom video request could not be completed.",
      requestId: randomUUID(),
    },
  };
}

type GuardDependencies = {
  featureEnabled: () => boolean;
  getUserId: (headers: Headers) => Promise<string | null>;
  hasCreatorAccess: (userId: string) => Promise<boolean>;
};

export type CustomTemplateUserGuardResult =
  | { ok: true; userId: string }
  | { ok: false; error: CustomTemplateErrorResponse };

export type CreatorGuardResult = CustomTemplateUserGuardResult;

export async function requireCustomTemplateUser(
  request: Request,
  dependencies: Partial<GuardDependencies> = {},
): Promise<CustomTemplateUserGuardResult> {
  const getUserId = dependencies.getUserId ?? defaultGetUserId;
  let userId: string | null;
  try {
    userId = await getUserId(request.headers);
  } catch {
    return internalGuardFailure("session");
  }
  if (!userId) {
    return { ok: false, error: mapCustomTemplateError({ code: "GOOGLE_AUTH_REQUIRED" }) };
  }

  return { ok: true, userId };
}

export async function requireCustomTemplateCreator(
  request: Request,
  dependencies: Partial<GuardDependencies> = {},
): Promise<CreatorGuardResult> {
  const featureEnabled = dependencies.featureEnabled ?? defaultFeatureEnabled;
  if (!featureEnabled()) {
    return { ok: false, error: mapCustomTemplateError({ code: "FEATURE_DISABLED" }) };
  }

  const user = await requireCustomTemplateUser(request, dependencies);
  if (!user.ok) {
    return user;
  }

  const hasCreatorAccess = dependencies.hasCreatorAccess ?? defaultHasCreatorAccess;
  let isCreator: boolean;
  try {
    isCreator = await hasCreatorAccess(user.userId);
  } catch {
    return internalGuardFailure("entitlement");
  }
  if (!isCreator) {
    return { ok: false, error: mapCustomTemplateError({ code: "CREATOR_REQUIRED" }) };
  }

  return user;
}

function internalGuardFailure(stage: "session" | "entitlement"): CreatorGuardResult {
  const error = mapCustomTemplateError({ code: "INTERNAL_ERROR" });
  console.error("Custom template access check failed", {
    requestId: error.body.requestId,
    stage,
  });
  return { ok: false, error };
}

export function hasValidCronAuthorization(
  headers: Headers,
  secret: string | undefined,
): boolean {
  if (!secret) {
    return false;
  }

  const actual = Buffer.from(headers.get("authorization") ?? "", "utf8");
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  return actual.byteLength === expected.byteLength && timingSafeEqual(actual, expected);
}

function response(
  status: number,
  code: Exclude<CustomTemplateApiErrorCode, "INTERNAL_ERROR">,
  message: string,
): CustomTemplateErrorResponse {
  return { status, body: { code, message } };
}

export function customTemplateErrorResponse(error: unknown): Response {
  const mapped = mapCustomTemplateError(error);
  if (mapped.body.code === "INTERNAL_ERROR") {
    const errorName = error instanceof Error ? error.name : typeof error;
    console.error("Custom template route failed", {
      requestId: mapped.body.requestId,
      errorName,
    });
  }
  return customTemplateJsonResponse(mapped.body, { status: mapped.status });
}

export function creatorGuardErrorResponse(
  result: Extract<CreatorGuardResult, { ok: false }>,
): Response {
  return customTemplateJsonResponse(result.error.body, { status: result.error.status });
}

export function customTemplateJsonResponse(
  body: unknown,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "private, no-store");
  return Response.json(body, { ...init, headers });
}

function readKnownCode(error: unknown): CustomTemplateApiErrorCode | null {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && (code === "INTERNAL_ERROR" || code in safeErrors)
    ? code as CustomTemplateApiErrorCode
    : null;
}

function defaultFeatureEnabled(): boolean {
  try {
    return getCustomTemplateConfig().enabled;
  } catch {
    return false;
  }
}

async function defaultGetUserId(headers: Headers): Promise<string | null> {
  const { auth } = await import("../auth.ts");
  const session = await auth.api.getSession({ headers });
  return session?.user?.id ?? null;
}

async function defaultHasCreatorAccess(userId: string): Promise<boolean> {
  const { userHasActiveCreatorSubscription } = await import("../payments/entitlements.ts");
  return userHasActiveCreatorSubscription(userId);
}
