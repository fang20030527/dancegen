import { advancedDanceModelId, standardDanceModelId, type DanceModelId } from "@/lib/dance/models";
import { evolinkSeedanceProvider, isEvolinkTaskId } from "@/lib/providers/evolink-seedance";
import { mockSeedanceProvider } from "@/lib/providers/mock-seedance";
import type { ModelProvider } from "@/lib/providers/types";
import { isViggleJobId, viggleRenderProvider } from "@/lib/providers/viggle-render";

export function getDanceVideoProvider(modelId: DanceModelId): ModelProvider {
  if (modelId === standardDanceModelId) {
    return viggleRenderProvider;
  }

  if (modelId === advancedDanceModelId) {
    return evolinkSeedanceProvider;
  }

  return mockSeedanceProvider;
}

export function getDanceVideoStatusProvider(taskId: string): ModelProvider {
  if (isViggleJobId(taskId)) {
    return viggleRenderProvider;
  }

  if (isEvolinkTaskId(taskId)) {
    return evolinkSeedanceProvider;
  }

  return mockSeedanceProvider;
}
