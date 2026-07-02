const DEFAULT_VIGGLE_API_URL = "https://apis.viggle.ai";
const DEFAULT_VIGGLE_MODEL = "V4_Preview";
const supportedViggleModels = ["V4_Preview", "V3_Preview"] as const;

export type ViggleModel = (typeof supportedViggleModels)[number];

export class ViggleConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ViggleConfigError";
  }
}

export function getViggleApiKey() {
  const apiKey = process.env.VIGGLE_API_KEY?.trim();

  if (!apiKey) {
    throw new ViggleConfigError("VIGGLE_API_KEY is required for the default Viggle model.");
  }

  return apiKey;
}

export function getViggleApiUrl() {
  return trimTrailingSlash(process.env.VIGGLE_API_URL?.trim() || DEFAULT_VIGGLE_API_URL);
}

export function getViggleModel(): ViggleModel {
  const model = process.env.VIGGLE_MODEL?.trim() || DEFAULT_VIGGLE_MODEL;

  if (!isViggleModel(model)) {
    throw new ViggleConfigError("VIGGLE_MODEL must be V4_Preview or V3_Preview.");
  }

  return model;
}

function isViggleModel(model: string): model is ViggleModel {
  return supportedViggleModels.includes(model as ViggleModel);
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}
