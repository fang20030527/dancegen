import type {
  CustomTemplateMime,
  CustomTemplatePublicState,
} from "../../lib/custom-templates/types.ts";

const maxCustomTemplateBytes = 50 * 1024 * 1024;
const allowedVideoTypes = new Set<CustomTemplateMime>(["video/mp4", "video/webm"]);
const knownClientCodes = new Set<CustomTemplateClientCode>([
  "FEATURE_DISABLED", "GOOGLE_AUTH_REQUIRED", "CREATOR_REQUIRED", "INVALID_REQUEST", "NOT_FOUND",
  "INVALID_STATE", "IDEMPOTENCY_CONFLICT", "INVALID_FORMAT", "FILE_TOO_LARGE", "INVALID_DURATION",
  "UNSAFE_URL", "DOWNLOAD_TIMEOUT", "DOWNLOAD_FAILED", "REVIEW_UNAVAILABLE", "REVIEW_BLOCKED",
  "INGEST_FAILED", "PREVIEW_NOT_AVAILABLE", "DELETE_FAILED", "INTERNAL_ERROR", "UPLOAD_FAILED",
  "REQUEST_ABORTED",
]);

export type CustomTemplateClientCode =
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
  | "INTERNAL_ERROR"
  | "UPLOAD_FAILED"
  | "REQUEST_ABORTED";

export class CustomTemplateClientError extends Error {
  readonly code: CustomTemplateClientCode;

  constructor(code: CustomTemplateClientCode, message: string) {
    super(message);
    this.name = "CustomTemplateClientError";
    this.code = code;
  }
}

export type CustomTemplateClientDependencies = {
  request: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  createRequest: () => XMLHttpRequest;
};

export async function uploadCustomTemplate(
  input: {
    file: File;
    rightsConfirmed: boolean;
    signal?: AbortSignal;
    onProgress?: (percentage: number) => void;
    onTransferStart?: () => void;
    onReviewStart?: () => void;
  },
  dependencies: Partial<CustomTemplateClientDependencies> = {},
): Promise<CustomTemplatePublicState> {
  const mimeType = validateLocalVideo(input.file, input.rightsConfirmed);
  const idempotencyKey = createIdempotencyKey();
  const request = dependencies.request ?? fetch;
  const prepared = await requestJson<PreparedUpload>(
    "/api/templates/custom/upload/prepare",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: input.file.name,
        contentType: mimeType,
        sizeBytes: input.file.size,
        rightsConfirmed: true,
        idempotencyKey,
      }),
      signal: input.signal,
    },
    request,
  );

  await putFileDirectly({
    file: input.file,
    uploadUrl: prepared.uploadUrl,
    uploadHeaders: prepared.uploadHeaders,
    signal: input.signal,
    onProgress: input.onProgress,
    onTransferStart: input.onTransferStart,
    createRequest: dependencies.createRequest,
  });

  input.onReviewStart?.();

  return requestJson<CustomTemplatePublicState>(
    `/api/templates/custom/upload/${encodeURIComponent(prepared.ingestId)}/finalize`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idempotencyKey }),
      signal: input.signal,
    },
    request,
  );
}

export async function importCustomTemplate(
  input: {
    url: string;
    rightsConfirmed: boolean;
    signal?: AbortSignal;
  },
  dependencies: Pick<Partial<CustomTemplateClientDependencies>, "request"> = {},
): Promise<CustomTemplatePublicState> {
  const url = validateRemoteVideoUrl(input.url, input.rightsConfirmed);
  const request = dependencies.request ?? fetch;
  return requestJson<CustomTemplatePublicState>(
    "/api/templates/custom/import",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        rightsConfirmed: true,
        idempotencyKey: createIdempotencyKey(),
      }),
      signal: input.signal,
    },
    request,
  );
}

export async function getCustomTemplateState(
  ingestId: string,
  signal?: AbortSignal,
  dependencies: Pick<Partial<CustomTemplateClientDependencies>, "request"> = {},
): Promise<CustomTemplatePublicState> {
  const request = dependencies.request ?? fetch;
  return requestJson<CustomTemplatePublicState>(
    customTemplatePath(ingestId),
    { method: "GET", signal, cache: "no-store" },
    request,
  );
}

export async function deleteCustomTemplate(
  ingestId: string,
  dependencies: Pick<Partial<CustomTemplateClientDependencies>, "request"> = {},
): Promise<CustomTemplatePublicState> {
  const request = dependencies.request ?? fetch;
  return requestJson<CustomTemplatePublicState>(
    customTemplatePath(ingestId),
    { method: "DELETE" },
    request,
  );
}

type PreparedUpload = {
  ingestId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  expiresInSeconds: number;
};

function validateLocalVideo(file: File, rightsConfirmed: boolean): CustomTemplateMime {
  if (!rightsConfirmed) {
    throw new CustomTemplateClientError(
      "INVALID_REQUEST",
      "Confirm that you have the right to use this video.",
    );
  }

  if (!allowedVideoTypes.has(file.type as CustomTemplateMime)) {
    throw new CustomTemplateClientError("INVALID_FORMAT", "Choose an MP4 or WebM video.");
  }

  if (file.size < 1) {
    throw new CustomTemplateClientError("INVALID_REQUEST", "Choose a video file to upload.");
  }

  if (file.size > maxCustomTemplateBytes) {
    throw new CustomTemplateClientError("FILE_TOO_LARGE", "Choose a video no larger than 50 MB.");
  }

  return file.type as CustomTemplateMime;
}

function validateRemoteVideoUrl(value: string, rightsConfirmed: boolean): string {
  if (!rightsConfirmed) {
    throw new CustomTemplateClientError(
      "INVALID_REQUEST",
      "Confirm that you have the right to use this video.",
    );
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new CustomTemplateClientError("UNSAFE_URL", "Use a direct public HTTPS video-file URL.");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new CustomTemplateClientError("UNSAFE_URL", "Use a direct public HTTPS video-file URL.");
  }

  return url.toString();
}

async function putFileDirectly(input: {
  file: File;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  signal?: AbortSignal;
  onProgress?: (percentage: number) => void;
  onTransferStart?: () => void;
  createRequest?: () => XMLHttpRequest;
}): Promise<void> {
  const xhr = input.createRequest?.() ?? new XMLHttpRequest();

  await new Promise<void>((resolve, reject) => {
    const abortUpload = () => xhr.abort();
    const cleanUp = () => input.signal?.removeEventListener("abort", abortUpload);

    xhr.open("PUT", input.uploadUrl, true);
    for (const [name, value] of Object.entries(input.uploadHeaders)) {
      xhr.setRequestHeader(name, value);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        return;
      }
      input.onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      cleanUp();
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new CustomTemplateClientError("UPLOAD_FAILED", "The video upload could not be completed."));
    };
    xhr.onerror = () => {
      cleanUp();
      reject(new CustomTemplateClientError("UPLOAD_FAILED", "The video upload could not be completed."));
    };
    xhr.onabort = () => {
      cleanUp();
      reject(new CustomTemplateClientError("REQUEST_ABORTED", "The video upload was canceled."));
    };

    if (input.signal?.aborted) {
      xhr.abort();
      return;
    }
    input.signal?.addEventListener("abort", abortUpload, { once: true });
    input.onTransferStart?.();
    xhr.send(input.file);
  });
}

async function requestJson<T>(
  url: string,
  init: RequestInit,
  request: CustomTemplateClientDependencies["request"],
): Promise<T> {
  let response: Response;
  try {
    response = await request(url, init);
  } catch (error) {
    if (isAbortError(error) || init.signal?.aborted) {
      throw new CustomTemplateClientError("REQUEST_ABORTED", "The custom video request was canceled.");
    }
    throw new CustomTemplateClientError("INTERNAL_ERROR", "The custom video request could not be completed.");
  }

  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    throw toClientError(payload);
  }
  return payload as T;
}

function toClientError(payload: unknown): CustomTemplateClientError {
  if (
    payload &&
    typeof payload === "object" &&
    "code" in payload &&
    typeof payload.code === "string" &&
    knownClientCodes.has(payload.code as CustomTemplateClientCode) &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return new CustomTemplateClientError(payload.code as CustomTemplateClientCode, payload.message);
  }

  return new CustomTemplateClientError("INTERNAL_ERROR", "The custom video request could not be completed.");
}

function createIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `template_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function customTemplatePath(ingestId: string): string {
  return `/api/templates/custom/${encodeURIComponent(ingestId)}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
