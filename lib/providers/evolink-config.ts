import { advancedDanceModelId, type DanceModelId } from "@/lib/dance/models";

const DEFAULT_EVOLINK_API_URL = "https://api.evolink.ai";
const DEFAULT_EVOLINK_FILES_API_URL = "https://files-api.evolink.ai";

export class EvolinkConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvolinkConfigError";
  }
}

export function hasEvolinkApiKey() {
  return Boolean(process.env.EVOLINK_API_KEY?.trim());
}

export function getEvolinkApiKey() {
  const apiKey = process.env.EVOLINK_API_KEY?.trim();

  if (!apiKey) {
    throw new EvolinkConfigError("EVOLINK_API_KEY is required for the member Seedance model.");
  }

  return apiKey;
}

export function getEvolinkApiUrl() {
  return trimTrailingSlash(process.env.EVOLINK_API_URL?.trim() || DEFAULT_EVOLINK_API_URL);
}

export function getEvolinkFilesApiUrl() {
  return trimTrailingSlash(process.env.EVOLINK_FILES_API_URL?.trim() || DEFAULT_EVOLINK_FILES_API_URL);
}

export function getConfiguredProviderModelId(modelId: DanceModelId) {
  if (modelId === advancedDanceModelId) {
    return process.env.SEEDANCE_ADVANCED_MODEL?.trim() || advancedDanceModelId;
  }

  return modelId;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}
