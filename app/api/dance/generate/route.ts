import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { aspectRatios } from "@/lib/dance/types";
import { getTemplateById } from "@/lib/dance/templates";
import { mockSeedanceProvider } from "@/lib/providers/mock-seedance";

const generationSchema = z.object({
  idempotencyKey: z.string().min(12),
  templateId: z.string().min(1),
  aspectRatio: z.enum(aspectRatios),
  rightsConfirmed: z.literal(true),
});

export async function POST(request: NextRequest) {
  const hasDemoSession = request.cookies.get("dancegen_demo_session")?.value === "true";

  if (!hasDemoSession) {
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

  const task = await mockSeedanceProvider.submitDanceVideo({
    idempotencyKey: payload.data.idempotencyKey,
    userId: "demo-user",
    uploadObjectKey: "demo/local-upload",
    templateId: payload.data.templateId,
    aspectRatio: payload.data.aspectRatio,
  });

  return NextResponse.json({ task }, { status: 202 });
}
