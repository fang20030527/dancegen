import { readFile } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";

import { standardDanceModelId } from "../dance/models.ts";
import { getTemplateById } from "../dance/templates.ts";
import { customTemplateStorage, type CustomTemplateStorage } from "../custom-templates/storage.ts";
import type { TemplateSource } from "../custom-templates/types.ts";
import type { DanceGenerationTask, TaskStatus } from "../dance/types.ts";
import { getViggleApiKey, getViggleApiUrl, getViggleModel } from "./viggle-config.ts";
import {
  assertProviderSupportsTemplateSource,
  type DanceVideoRequest,
  type ModelProvider,
} from "./types.ts";

type ViggleRenderStatus = "queued" | "processing" | "complete" | "failed" | "cancelled";

type ViggleRenderJob = {
  job_id?: string;
  status?: ViggleRenderStatus | string;
  mode?: string | null;
  cdn_url?: string | null;
  download_url?: string | null;
  error?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  enqueued_at?: string | null;
};

type ViggleErrorResponse = {
  detail?: string;
  error?: string;
  error_message?: string;
  message?: string;
};

const vigglePayloadVersion = "dancegen-viggle-render-v1";

export class ViggleProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ViggleProviderError";
  }
}

export const viggleRenderProvider: ModelProvider = {
  name: "viggle",
  model: standardDanceModelId,
  async submitDanceVideo(request) {
    assertProviderSupportsTemplateSource(standardDanceModelId, request.templateSource);
    const job = await createRenderJob(request);

    return buildTaskFromViggleJob({
      request,
      job,
      fallbackStatus: "submitted",
    });
  },
  async getDanceVideoStatus(taskId) {
    const job = await getRenderJob(taskId);

    return buildTaskFromViggleJob({
      job,
      fallbackStatus: "processing",
    });
  },
};

export function isViggleJobId(taskId: string) {
  return taskId.startsWith("job_");
}

async function createRenderJob(request: DanceVideoRequest): Promise<ViggleRenderJob> {
  const response = await fetch(`${getViggleApiUrl()}/api/render`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getViggleApiKey()}`,
    },
    body: await buildRenderFormData(request),
  });

  return parseViggleResponse(response, "Viggle render job could not start.");
}

async function getRenderJob(jobId: string): Promise<ViggleRenderJob> {
  const response = await fetch(`${getViggleApiUrl()}/api/render/${encodeURIComponent(jobId)}`);

  return parseViggleResponse(response, "Viggle render status could not be loaded.");
}

async function buildRenderFormData(request: DanceVideoRequest) {
  const formData = new FormData();

  appendSourceImage(formData, request);
  await appendDrivingVideo(formData, request.templateSource);
  formData.append("model", getViggleModel());
  formData.append("background_mode", "original");

  return formData;
}

function appendSourceImage(formData: FormData, request: DanceVideoRequest) {
  if (request.sourceImageFile && request.sourceImageFile.size > 0) {
    formData.append("ref_image", request.sourceImageFile, request.sourceImageFile.name || "source-image");
    return;
  }

  if (request.uploadObjectKey) {
    formData.append("ref_image_url", getPublicSourceUrl(request.uploadObjectKey));
    return;
  }

  throw new ViggleProviderError("A source image file or public source image URL is required for Viggle generation.");
}

export async function appendDrivingVideo(
  formData: FormData,
  templateSource: TemplateSource,
  storage: Pick<CustomTemplateStorage, "getObjectBytes"> = customTemplateStorage,
) {
  if (templateSource.kind === "custom") {
    const videoBytes = await storage.getObjectBytes(templateSource.objectKey);
    const videoBlob = new Blob([new Uint8Array(videoBytes)], { type: templateSource.mimeType });
    formData.append("driving_video", videoBlob, getCustomVideoFilename(templateSource.mimeType));
    return;
  }

  const template = getTemplateById(templateSource.templateId);

  if (!template?.videoPath) {
    throw new ViggleProviderError("The selected dance template does not have a Viggle driving video.");
  }

  const videoPath = getPublicAssetPath(template.videoPath);
  const videoBytes = await readFile(videoPath);
  const videoBlob = new Blob([videoBytes], { type: "video/mp4" });

  formData.append("driving_video", videoBlob, basename(videoPath));
}

function getCustomVideoFilename(mimeType: "video/mp4" | "video/webm") {
  return mimeType === "video/webm" ? "member-driving-video.webm" : "member-driving-video.mp4";
}

function getPublicSourceUrl(uploadObjectKey: string) {
  if (/^https?:\/\//i.test(uploadObjectKey)) {
    return uploadObjectKey;
  }

  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim();

  if (!publicBaseUrl) {
    throw new ViggleProviderError("A public source image URL is required for Viggle generation.");
  }

  return `${publicBaseUrl.replace(/\/+$/, "")}/${uploadObjectKey.replace(/^\/+/, "")}`;
}

function getPublicAssetPath(assetPath: string) {
  const publicRoot = resolve(process.cwd(), "public");
  const resolvedAssetPath = resolve(publicRoot, assetPath.replace(/^\/+/, ""));

  if (!resolvedAssetPath.startsWith(`${publicRoot}${sep}`)) {
    throw new ViggleProviderError("The selected driving video path is outside the public asset directory.");
  }

  return resolvedAssetPath;
}

async function parseViggleResponse(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as ViggleRenderJob | ViggleErrorResponse | null;

  if (!response.ok || !payload || !("job_id" in payload) || !payload.job_id) {
    throw new ViggleProviderError(getViggleErrorMessage(payload) || fallbackMessage);
  }

  return payload;
}

function getViggleErrorMessage(payload: ViggleRenderJob | ViggleErrorResponse | null) {
  if (!payload) {
    return undefined;
  }

  if (payload.error_message) {
    return payload.error_message;
  }

  if ("detail" in payload && payload.detail) {
    return payload.detail;
  }

  if ("message" in payload && payload.message) {
    return payload.message;
  }

  return payload.error || undefined;
}

function buildTaskFromViggleJob({
  request,
  job,
  fallbackStatus,
}: {
  request?: DanceVideoRequest;
  job: ViggleRenderJob;
  fallbackStatus: TaskStatus;
}): DanceGenerationTask {
  const now = new Date().toISOString();
  const previewUrl = getViggleResultUrl(job);
  const status = mapViggleStatus(job.status, fallbackStatus, previewUrl);

  return {
    id: job.job_id || request?.idempotencyKey || `viggle_${Date.now()}`,
    userId: request?.userId || "demo-user",
    status,
    templateId: request ? getTaskTemplateId(request.templateSource) : "hip-hop",
    customTemplateIngestId:
      request?.templateSource.kind === "custom" ? request.templateSource.ingestId : undefined,
    aspectRatio: request?.aspectRatio || "9:16",
    provider: "viggle",
    model: getViggleModel(),
    providerJobId: job.job_id,
    payloadVersion: vigglePayloadVersion,
    failureReason: status === "failed_refunded" ? getViggleFailureReason(job) : undefined,
    previewUrl,
    watermarkedUrl: previewUrl,
    hdUnlocked: false,
    createdAt: job.created_at || job.enqueued_at || now,
    updatedAt: job.completed_at || now,
  };
}

function getTaskTemplateId(templateSource: TemplateSource) {
  return templateSource.kind === "platform" ? templateSource.templateId : "custom-member-video";
}

function mapViggleStatus(status: string | undefined, fallbackStatus: TaskStatus, previewUrl: string | undefined): TaskStatus {
  if (status === "complete") {
    return previewUrl ? "succeeded" : "failed_refunded";
  }

  if (status === "failed" || status === "cancelled") {
    return "failed_refunded";
  }

  if (status === "processing") {
    return "processing";
  }

  if (status === "queued") {
    return "submitted";
  }

  return fallbackStatus;
}

function getViggleResultUrl(job: ViggleRenderJob) {
  return job.cdn_url || job.download_url || undefined;
}

function getViggleFailureReason(job: ViggleRenderJob) {
  return job.error_message || job.error || job.error_code || "Viggle render job failed.";
}
