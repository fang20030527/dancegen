import type { AspectRatio, DanceGenerationTask } from "@/lib/dance/types";

export type DanceVideoRequest = {
  idempotencyKey: string;
  userId: string;
  uploadObjectKey: string;
  templateId: string;
  aspectRatio: AspectRatio;
};

export type ModelProvider = {
  name: string;
  model: string;
  submitDanceVideo(request: DanceVideoRequest): Promise<DanceGenerationTask>;
  getDanceVideoStatus(taskId: string): Promise<DanceGenerationTask>;
};
