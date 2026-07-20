export const customTemplateStates = [
  "awaiting_upload",
  "transferring",
  "reviewing",
  "ready",
  "reserved",
  "rejected",
  "failed",
  "consumed",
  "deleted",
] as const;

export type CustomTemplateState = (typeof customTemplateStates)[number];

export type CustomTemplateMime = "video/mp4" | "video/webm";

export type TemplateSource =
  | { kind: "platform"; templateId: string }
  | { kind: "custom"; ingestId: string; objectKey: string; mimeType: CustomTemplateMime };

export type CustomTemplateIngest = {
  id: string;
  userId: string;
  idempotencyKey: string;
  sourceKind: "upload" | "url";
  objectKey: string;
  mimeType: CustomTemplateMime;
  sizeBytes: number;
  durationSeconds: number | null;
  state: CustomTemplateState;
  tokenHash: string | null;
  reasonCode: string | null;
  createdAt: string;
  approvedAt: string | null;
  expiresAt: string | null;
  consumedAt: string | null;
  deletedAt: string | null;
};

export type CustomTemplatePublicState = Pick<
  CustomTemplateIngest,
  "id" | "state" | "mimeType" | "sizeBytes" | "durationSeconds" | "expiresAt" | "reasonCode"
> & { customTemplateToken?: string; previewUrl?: string };
