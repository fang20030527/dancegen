export const standardDanceModelId = "viggle-v4-preview";
export const advancedDanceModelId = "seedance-2.0-mini-reference-to-video";

export const danceModelOptions = [
  {
    id: standardDanceModelId,
    name: "Viggle V4 Preview",
    description: "Default",
    tier: "standard",
    requiresSourceUpload: false,
  },
  {
    id: advancedDanceModelId,
    name: "Seedance 2.0 Mini Reference",
    description: "Better",
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
