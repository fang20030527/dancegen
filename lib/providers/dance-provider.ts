import { advancedDanceModelId, type DanceModelId } from "@/lib/dance/models";
import { evolinkSeedanceProvider, isEvolinkTaskId } from "@/lib/providers/evolink-seedance";
import { mockSeedanceProvider } from "@/lib/providers/mock-seedance";
import type { ModelProvider } from "@/lib/providers/types";

export function getDanceVideoProvider(modelId: DanceModelId): ModelProvider {
  if (modelId === advancedDanceModelId) {
    return evolinkSeedanceProvider;
  }

  return mockSeedanceProvider;
}

export function getDanceVideoStatusProvider(taskId: string): ModelProvider {
  if (isEvolinkTaskId(taskId)) {
    return evolinkSeedanceProvider;
  }

  return mockSeedanceProvider;
}
