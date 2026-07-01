export const standardDanceModelId = "seedance-1.0-pro-fast";
export const advancedDanceModelId = "seedance-2.0-mini-reference-to-video";

export const danceModelOptions = [
  {
    id: standardDanceModelId,
    name: "Seedance 1.0 Pro Fast",
    description: "Fast preview model for the public generator.",
    tier: "standard",
    requiresSourceUpload: false,
  },
  {
    id: advancedDanceModelId,
    name: "Seedance 2.0 Mini Reference",
    description: "Member model with stronger reference control.",
    tier: "member",
    requiresSourceUpload: true,
  },
] as const;

export const danceModelIds = danceModelOptions.map((model) => model.id) as [
  typeof standardDanceModelId,
  typeof advancedDanceModelId,
];

export type DanceModelId = (typeof danceModelIds)[number];
export type DanceModelTier = (typeof danceModelOptions)[number]["tier"];

export function getDanceModelOption(modelId: string | null | undefined) {
  return danceModelOptions.find((model) => model.id === modelId);
}

export function isDanceModelId(modelId: unknown): modelId is DanceModelId {
  return typeof modelId === "string" && danceModelIds.includes(modelId as DanceModelId);
}

export function isMemberDanceModel(modelId: DanceModelId) {
  return getDanceModelOption(modelId)?.tier === "member";
}
