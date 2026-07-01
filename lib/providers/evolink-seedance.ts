import { advancedDanceModelId } from "@/lib/dance/models";
import { getTemplateById } from "@/lib/dance/templates";
import type { DanceGenerationTask, TaskStatus } from "@/lib/dance/types";
import { getConfiguredProviderModelId, getEvolinkApiKey, getEvolinkApiUrl } from "@/lib/providers/evolink-config";
import type { DanceVideoRequest, ModelProvider } from "@/lib/providers/types";

type EvolinkTaskStatus = "pending" | "processing" | "completed" | "failed";

type EvolinkTask = {
  id?: string;
  model?: string;
  status?: EvolinkTaskStatus | string;
  created?: number;
  results?: unknown[];
  error?: {
    message?: string;
  };
};

type EvolinkTaskResponse = {
  id?: string;
  model?: string;
  status?: EvolinkTaskStatus | string;
  created?: number;
  results?: unknown[];
  error?: {
    message?: string;
  };
};

const evolinkPayloadVersion = "dancegen-seedance-2-mini-reference-v1";

export class EvolinkProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvolinkProviderError";
  }
}

export const evolinkSeedanceProvider: ModelProvider = {
  name: "evolink",
  model: advancedDanceModelId,
  async submitDanceVideo(request) {
    const task = await createVideoGeneration(request);

    return buildTaskFromEvolinkTask({
      request,
      task,
      fallbackStatus: "submitted",
    });
  },
  async getDanceVideoStatus(taskId) {
    const task = await getTaskDetail(taskId);

    return buildTaskFromEvolinkTask({
      task,
      fallbackStatus: "processing",
    });
  },
};

export function isEvolinkTaskId(taskId: string) {
  return taskId.startsWith("task-");
}

async function createVideoGeneration(request: DanceVideoRequest): Promise<EvolinkTask> {
  const response = await fetch(`${getEvolinkApiUrl()}/v1/videos/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getEvolinkApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildGenerationPayload(request)),
  });

  return parseEvolinkTaskResponse(response, "EvoLink video generation could not start.");
}

async function getTaskDetail(taskId: string): Promise<EvolinkTask> {
  const response = await fetch(`${getEvolinkApiUrl()}/v1/tasks/${encodeURIComponent(taskId)}`, {
    headers: {
      Authorization: `Bearer ${getEvolinkApiKey()}`,
    },
  });

  return parseEvolinkTaskResponse(response, "EvoLink task status could not be loaded.");
}

function buildGenerationPayload(request: DanceVideoRequest) {
  const template = getTemplateById(request.templateId);
  const duration = template?.durationSeconds ?? 5;

  return {
    model: getConfiguredProviderModelId(request.modelId),
    prompt: buildPrompt(request),
    image_urls: [getPublicSourceUrl(request.uploadObjectKey)],
    duration,
    aspect_ratio: request.aspectRatio,
    quality: "720p",
    generate_audio: false,
    content_filter: true,
  };
}

function buildPrompt(request: DanceVideoRequest) {
  const template = getTemplateById(request.templateId);
  const hints = template?.modelHints;
  const duration = template?.durationSeconds ?? 5;

  return [
    `Use @Image1 as the sole identity and pose reference for a ${duration}-second silent vertical dance clip.`,
    hints?.motion ? `Motion: ${hints.motion}.` : null,
    hints?.camera ? `Camera: ${hints.camera}.` : null,
    hints?.safety ? `Safety: ${hints.safety}.` : null,
    "Preserve clothing, face identity, and body proportions. Do not add music, captions, logos, nudity, minors, or extra people.",
  ]
    .filter(Boolean)
    .join(" ");
}

function getPublicSourceUrl(uploadObjectKey: string) {
  if (/^https?:\/\//i.test(uploadObjectKey)) {
    return uploadObjectKey;
  }

  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim();

  if (!publicBaseUrl) {
    throw new EvolinkProviderError("A public source image URL is required for Seedance reference-to-video generation.");
  }

  return `${publicBaseUrl.replace(/\/+$/, "")}/${uploadObjectKey.replace(/^\/+/, "")}`;
}

async function parseEvolinkTaskResponse(response: Response, fallbackMessage: string) {
  const payload = (await response.json().catch(() => null)) as EvolinkTaskResponse | null;

  if (!response.ok || !payload?.id) {
    throw new EvolinkProviderError(payload?.error?.message || fallbackMessage);
  }

  return payload;
}

function buildTaskFromEvolinkTask({
  request,
  task,
  fallbackStatus,
}: {
  request?: DanceVideoRequest;
  task: EvolinkTask;
  fallbackStatus: TaskStatus;
}): DanceGenerationTask {
  const now = new Date().toISOString();
  const previewUrl = getFirstResultUrl(task.results);
  const providerModel = task.model || (request ? getConfiguredProviderModelId(request.modelId) : advancedDanceModelId);
  const status = mapTaskStatus(task.status, fallbackStatus, previewUrl);

  return {
    id: task.id || request?.idempotencyKey || `task_${Date.now()}`,
    userId: request?.userId || "demo-user",
    status,
    templateId: request?.templateId || "hip-hop",
    aspectRatio: request?.aspectRatio || "9:16",
    provider: "evolink",
    model: providerModel,
    providerJobId: task.id,
    payloadVersion: evolinkPayloadVersion,
    failureReason: status === "failed_refunded" ? task.error?.message || "EvoLink task failed." : undefined,
    previewUrl,
    watermarkedUrl: previewUrl,
    hdUnlocked: false,
    createdAt: task.created ? new Date(task.created * 1000).toISOString() : now,
    updatedAt: now,
  };
}

function mapTaskStatus(status: string | undefined, fallbackStatus: TaskStatus, previewUrl: string | undefined): TaskStatus {
  if (status === "completed") {
    return previewUrl ? "succeeded" : "failed_refunded";
  }

  if (status === "failed") {
    return "failed_refunded";
  }

  if (status === "processing") {
    return "processing";
  }

  if (status === "pending") {
    return "submitted";
  }

  return fallbackStatus;
}

function getFirstResultUrl(results: unknown[] | undefined) {
  const firstResult = results?.[0];

  if (typeof firstResult === "string") {
    return firstResult;
  }

  if (!firstResult || typeof firstResult !== "object" || Array.isArray(firstResult)) {
    return undefined;
  }

  const record = firstResult as Record<string, unknown>;
  const candidates = [record.url, record.video_url, record.file_url, record.download_url];
  const resultUrl = candidates.find((candidate): candidate is string => typeof candidate === "string");

  return resultUrl;
}
