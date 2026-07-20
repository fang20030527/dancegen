import type { DanceModelId } from "@/lib/dance/models";
import type { AspectRatio, DanceGenerationTask } from "@/lib/dance/types";
import type { TemplateSource } from "@/lib/custom-templates/types";

export type DanceVideoRequest = {
  idempotencyKey: string;
  userId: string;
  uploadObjectKey: string;
  sourceImageFile?: File;
  templateSource: TemplateSource;
  aspectRatio: AspectRatio;
  modelId: DanceModelId;
};

export function assertProviderSupportsTemplateSource(
  modelId: DanceModelId,
  templateSource: TemplateSource,
): void {
  if (
    templateSource.kind === "custom" &&
    modelId !== "viggle-v4-preview"
  ) {
    throw new Error("The selected provider does not support member-supplied driving videos.");
  }
}

export type ModelProvider = {
  name: string;
  model: string;
  submitDanceVideo(request: DanceVideoRequest): Promise<DanceGenerationTask>;
  getDanceVideoStatus(taskId: string): Promise<DanceGenerationTask>;
};
