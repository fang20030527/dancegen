import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { danceModelIds, getDanceModelOption, isMemberDanceModel, standardDanceModelId } from "@/lib/dance/models";
import { aspectRatios } from "@/lib/dance/types";
import { getTemplateById } from "@/lib/dance/templates";
import { userHasActiveCreatorSubscription } from "@/lib/payments/entitlements";
import { getDanceVideoProvider } from "@/lib/providers/dance-provider";
import { EvolinkConfigError } from "@/lib/providers/evolink-config";
import { EvolinkProviderError } from "@/lib/providers/evolink-seedance";

const generationSchema = z.object({
  idempotencyKey: z.string().min(12),
  templateId: z.string().min(1),
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

  const payload = generationSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      {
        code: "INVALID_GENERATION_REQUEST",
        message: "Check the selected template, aspect ratio, and image rights confirmation.",
      },
      { status: 400 },
    );
  }

  const template = getTemplateById(payload.data.templateId);

  if (!template?.isPublic) {
    return NextResponse.json(
      {
        code: "TEMPLATE_NOT_AVAILABLE",
        message: "This template is not available in the public MVP.",
      },
      { status: 403 },
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

  try {
    const provider = getDanceVideoProvider(payload.data.modelId);
    const task = await provider.submitDanceVideo({
      idempotencyKey: payload.data.idempotencyKey,
      userId: session.user.id,
      uploadObjectKey: payload.data.uploadObjectKey || "demo/local-upload",
      templateId: payload.data.templateId,
      aspectRatio: payload.data.aspectRatio,
      modelId: payload.data.modelId,
    });

    return NextResponse.json({ task }, { status: 202 });
  } catch (error) {
    const status = error instanceof EvolinkConfigError ? 503 : 502;
    const message =
      error instanceof EvolinkConfigError || error instanceof EvolinkProviderError
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
