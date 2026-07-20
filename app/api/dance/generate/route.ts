import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  GenerationTemplateError,
  resolveGenerationTemplateSource,
  submitGenerationWithTemplateReservation,
  type ResolvedGenerationTemplate,
} from "@/lib/custom-templates/generation";
import { customTemplateRepository } from "@/lib/custom-templates/repository";
import { danceModelIds, getDanceModelOption, isMemberDanceModel, standardDanceModelId } from "@/lib/dance/models";
import { defaultMotionTransferPrompt } from "@/lib/dance/prompts";
import { aspectRatios } from "@/lib/dance/types";
import { getTemplateById } from "@/lib/dance/templates";
import { userHasActiveCreatorSubscription } from "@/lib/payments/entitlements";
import { getDanceVideoProvider } from "@/lib/providers/dance-provider";
import { EvolinkConfigError } from "@/lib/providers/evolink-config";
import { EvolinkProviderError } from "@/lib/providers/evolink-seedance";
import { ViggleConfigError } from "@/lib/providers/viggle-config";
import { ViggleProviderError } from "@/lib/providers/viggle-render";
import { assertPromptAllowedByCreemModeration, CreemModerationError } from "@/lib/safety/creem-moderation";

const generationSchema = z.object({
  idempotencyKey: z.string().min(12),
  templateId: z.string().min(1).optional(),
  customTemplateToken: z.string().min(1).max(512).optional(),
  aspectRatio: z.enum(aspectRatios),
  modelId: z.enum(danceModelIds).default(standardDanceModelId),
  uploadObjectKey: z.string().min(1).optional(),
  rightsConfirmed: z.literal(true),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        code: "GOOGLE_AUTH_REQUIRED",
        message: "Continue with Google before generating your first dance video.",
      },
      { status: 401 },
    );
  }

  const { payload, sourceImageFile } = await parseGenerationRequest(request);

  if (!payload.success) {
    return NextResponse.json(
      {
        code: "INVALID_GENERATION_REQUEST",
        message: "Check the selected template, aspect ratio, and image rights confirmation.",
      },
      { status: 400 },
    );
  }

  const model = getDanceModelOption(payload.data.modelId);

  if (!model) {
    return NextResponse.json(
      {
        code: "MODEL_NOT_AVAILABLE",
        message: "Choose a supported video model.",
      },
      { status: 400 },
    );
  }

  let resolvedTemplate: ResolvedGenerationTemplate;
  try {
    resolvedTemplate = await resolveGenerationTemplateSource(
      {
        userId: session.user.id,
        templateId: payload.data.templateId,
        customTemplateToken: payload.data.customTemplateToken,
        modelId: payload.data.modelId,
      },
      {
        repository: customTemplateRepository,
        hasActiveCreatorSubscription: userHasActiveCreatorSubscription,
        findPublicTemplate: getTemplateById,
        now: () => new Date(),
      },
    );
  } catch (error) {
    if (error instanceof GenerationTemplateError) {
      return generationTemplateErrorResponse(error);
    }
    throw error;
  }

  if (isMemberDanceModel(payload.data.modelId) && !(await userHasActiveCreatorSubscription(session.user.id))) {
    return NextResponse.json(
      {
        code: "MEMBER_MODEL_REQUIRED",
        message: "Upgrade to the Creator plan before using the member Seedance model.",
      },
      { status: 402 },
    );
  }

  if (model.requiresSourceUpload && !payload.data.uploadObjectKey) {
    return NextResponse.json(
      {
        code: "SOURCE_UPLOAD_REQUIRED",
        message: "Run pre-check again so the source image can be prepared for this member model.",
      },
      { status: 409 },
    );
  }

  if (!payload.data.uploadObjectKey && !sourceImageFile) {
    return NextResponse.json(
      {
        code: "SOURCE_IMAGE_REQUIRED",
        message: "Upload a clear source photo before generating the dance video.",
      },
      { status: 409 },
    );
  }

  try {
    await assertPromptAllowedByCreemModeration({
      externalId: `dancegen:user_${session.user.id}:gen_${payload.data.idempotencyKey}`,
      prompt: buildGenerationModerationPrompt({
        aspectRatio: payload.data.aspectRatio,
        modelId: payload.data.modelId,
        resolvedTemplate,
      }),
    });

    const provider = getDanceVideoProvider(payload.data.modelId);
    const task = await submitGenerationWithTemplateReservation(
      {
        resolved: resolvedTemplate,
        userId: session.user.id,
        submit: () =>
          provider.submitDanceVideo({
            idempotencyKey: payload.data.idempotencyKey,
            userId: session.user.id,
            uploadObjectKey: payload.data.uploadObjectKey || "",
            sourceImageFile,
            templateSource: resolvedTemplate.templateSource,
            aspectRatio: payload.data.aspectRatio,
            modelId: payload.data.modelId,
          }),
      },
      customTemplateRepository,
    );

    return NextResponse.json({ task }, { status: 202 });
  } catch (error) {
    if (error instanceof CreemModerationError) {
      const isBlocked = error.kind === "blocked";

      return NextResponse.json(
        {
          code: isBlocked ? "GENERATION_BLOCKED_BY_MODERATION" : "GENERATION_MODERATION_UNAVAILABLE",
          message: isBlocked
            ? "This generation request could not be processed because it does not meet our content policy."
            : "Safety screening is temporarily unavailable. Please try again in a moment.",
        },
        { status: isBlocked ? 403 : 503 },
      );
    }

    if (error instanceof GenerationTemplateError) {
      return generationTemplateErrorResponse(error);
    }

    const status = isProviderConfigError(error) ? 503 : 502;
    const message =
      isKnownProviderError(error)
        ? error.message
        : "Generation could not start. Try another image or template.";

    return NextResponse.json(
      {
        code: "MODEL_PROVIDER_FAILED",
        message,
      },
      { status },
    );
  }
}

async function parseGenerationRequest(request: NextRequest) {
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    return parseMultipartGenerationRequest(request);
  }

  return {
    payload: generationSchema.safeParse(await request.json()),
    sourceImageFile: undefined,
  };
}

async function parseMultipartGenerationRequest(request: NextRequest) {
  const formData = await request.formData();

  return {
    payload: generationSchema.safeParse({
      idempotencyKey: getFormString(formData, "idempotencyKey"),
      templateId: getFormString(formData, "templateId"),
      customTemplateToken: getFormString(formData, "customTemplateToken"),
      aspectRatio: getFormString(formData, "aspectRatio"),
      modelId: getFormString(formData, "modelId"),
      uploadObjectKey: getFormString(formData, "uploadObjectKey"),
      rightsConfirmed: formData.get("rightsConfirmed") === "true",
    }),
    sourceImageFile: getFormFile(formData, "image"),
  };
}

function getFormString(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getFormFile(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);

  return value instanceof File && value.size > 0 ? value : undefined;
}

function isProviderConfigError(error: unknown) {
  return error instanceof EvolinkConfigError || error instanceof ViggleConfigError;
}

function isKnownProviderError(error: unknown): error is Error {
  return (
    error instanceof EvolinkConfigError ||
    error instanceof EvolinkProviderError ||
    error instanceof ViggleConfigError ||
    error instanceof ViggleProviderError
  );
}

function buildGenerationModerationPrompt({
  aspectRatio,
  modelId,
  resolvedTemplate,
}: {
  aspectRatio: string;
  modelId: string;
  resolvedTemplate: ResolvedGenerationTemplate;
}) {
  const templateDescription = resolvedTemplate.moderationTemplate
    ? [
        `Template: ${resolvedTemplate.moderationTemplate.name}. ${resolvedTemplate.moderationTemplate.description}`,
        `Template motion hint: ${resolvedTemplate.moderationTemplate.modelHints.motion}`,
        `Template camera hint: ${resolvedTemplate.moderationTemplate.modelHints.camera}`,
        `Template safety hint: ${resolvedTemplate.moderationTemplate.modelHints.safety}`,
      ]
    : [
        "Template: approved member-supplied driving video.",
        "The driving video passed the separate custom-template safety review.",
      ];

  return [
    "DanceClip AI photo-to-dance video generation request.",
    "User-supplied free-text prompt: none.",
    `Backend model instruction: ${defaultMotionTransferPrompt}`,
    ...templateDescription,
    `Model: ${modelId}. Aspect ratio: ${aspectRatio}.`,
    "Only authorized adult solo source photos are allowed. Do not generate explicit, sexually suggestive, non-consensual, minor, impersonation, face-swap, deepfake, hateful, violent, illegal, or safety-bypass content.",
  ].join("\n");
}

function generationTemplateErrorResponse(error: GenerationTemplateError) {
  const response = getGenerationTemplateErrorDetails(error.code);
  return NextResponse.json(
    { code: error.code, message: response.message },
    { status: response.status },
  );
}

function getGenerationTemplateErrorDetails(code: GenerationTemplateError["code"]): {
  status: number;
  message: string;
} {
  switch (code) {
    case "TEMPLATE_SELECTION_INVALID":
      return { status: 400, message: "Choose exactly one platform or custom video template." };
    case "TEMPLATE_NOT_AVAILABLE":
      return { status: 403, message: "This template is not available in the public MVP." };
    case "CUSTOM_TEMPLATE_MEMBER_REQUIRED":
      return { status: 402, message: "Activate the Creator plan before using a custom video template." };
    case "CUSTOM_TEMPLATE_MODEL_REQUIRED":
      return { status: 409, message: "Custom video templates currently require Viggle V4 Preview." };
    case "CUSTOM_TEMPLATE_EXPIRED":
      return { status: 410, message: "This custom video template has expired. Import it again to continue." };
    case "CUSTOM_TEMPLATE_ALREADY_CONSUMED":
      return { status: 409, message: "This custom video template has already been used for a generation." };
    case "CUSTOM_TEMPLATE_ALREADY_RESERVED":
      return { status: 409, message: "This custom video template is already being used for a generation." };
    case "CUSTOM_TEMPLATE_NOT_READY":
      return { status: 409, message: "Wait for the custom video template review to finish before generating." };
    case "CUSTOM_TEMPLATE_NOT_AVAILABLE":
      return { status: 404, message: "This custom video template is unavailable." };
  }
}
