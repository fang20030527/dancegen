export const aspectRatios = ["9:16", "1:1", "16:9"] as const;

export type AspectRatio = (typeof aspectRatios)[number];

export const taskStatuses = [
  "created",
  "input_reviewing",
  "rejected",
  "reserved",
  "submitted",
  "processing",
  "transferring",
  "output_reviewing",
  "succeeded",
  "failed_refunded",
  "blocked_refunded",
] as const;

export type TaskStatus = (typeof taskStatuses)[number];

export type DanceTemplateRisk = "low" | "internal";

export type DanceTemplate = {
  id: string;
  name: string;
  slug: string;
  description: string;
  platformTags: string[];
  risk: DanceTemplateRisk;
  isPublic: boolean;
  durationSeconds: number;
  videoPath: string;
  providerPayloadVersion: string;
  modelHints: {
    motion: string;
    camera: string;
    safety: string;
  };
};

export type DanceGenerationTask = {
  id: string;
  userId: string;
  status: TaskStatus;
  templateId: string;
  customTemplateIngestId?: string;
  aspectRatio: AspectRatio;
  provider: string;
  model: string;
  providerJobId?: string;
  payloadVersion: string;
  costCents?: number;
  latencyMs?: number;
  failureReason?: string;
  previewUrl?: string;
  watermarkedUrl?: string;
  hdUnlocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UploadReviewResult = {
  allowed: boolean;
  reasonCode?: string;
  userMessage: string;
  uploadObjectKey?: string;
  sourceUrlExpiresAt?: string;
};
