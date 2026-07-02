import type { DanceModelId } from "@/lib/dance/models";
import type { AspectRatio, DanceGenerationTask } from "@/lib/dance/types";

export type DanceVideoRequest = {
  idempotencyKey: string;
  userId: string;
  uploadObjectKey: string;
  sourceImageFile?: File;
  templateId: string;
  aspectRatio: AspectRatio;
  modelId: DanceModelId;
};

export type ModelProvider = {
  name: string;
  model: string;
  submitDanceVideo(request: DanceVideoRequest): Promise<DanceGenerationTask>;
  getDanceVideoStatus(taskId: string): Promise<DanceGenerationTask>;
};
