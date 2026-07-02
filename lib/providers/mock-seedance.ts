import { getTemplateById } from "@/lib/dance/templates";
import { standardDanceModelId } from "@/lib/dance/models";
import type { DanceGenerationTask } from "@/lib/dance/types";
import type { DanceVideoRequest, ModelProvider } from "@/lib/providers/types";

const samplePreviewUrl =
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80";

function buildMockTask(request: DanceVideoRequest, status: DanceGenerationTask["status"]): DanceGenerationTask {
  const template = getTemplateById(request.templateId);
  const now = new Date().toISOString();

  return {
    id: `dance_${request.idempotencyKey.slice(0, 12)}`,
    userId: request.userId,
    status,
    templateId: request.templateId,
    aspectRatio: request.aspectRatio,
    provider: "mock",
    model: request.modelId,
    providerJobId: `mock_${request.idempotencyKey.slice(-10)}`,
    payloadVersion: template?.providerPayloadVersion ?? "dancegen-seedance-v1",
    costCents: 0,
    latencyMs: status === "succeeded" ? 4200 : undefined,
    previewUrl: samplePreviewUrl,
    watermarkedUrl: samplePreviewUrl,
    hdUnlocked: false,
    createdAt: now,
    updatedAt: now,
  };
}

export const mockSeedanceProvider: ModelProvider = {
  name: "mock",
  model: standardDanceModelId,
  async submitDanceVideo(request) {
    return buildMockTask(request, "submitted");
  },
  async getDanceVideoStatus(taskId) {
    const now = new Date().toISOString();

    return {
      id: taskId,
      userId: "demo-user",
      status: "succeeded",
      templateId: "hip-hop",
      aspectRatio: "9:16",
      provider: "mock",
      model: standardDanceModelId,
      providerJobId: `mock_${taskId.slice(-10)}`,
      payloadVersion: "dancegen-seedance-v1",
      costCents: 0,
      latencyMs: 4200,
      previewUrl: samplePreviewUrl,
      watermarkedUrl: samplePreviewUrl,
      hdUnlocked: false,
      createdAt: now,
      updatedAt: now,
    };
  },
};
