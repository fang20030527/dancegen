import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDanceModelOption, standardDanceModelId } from "@/lib/dance/models";
import { userHasActiveCreatorSubscription } from "@/lib/payments/entitlements";
import { reviewUploadFilename } from "@/lib/safety/policy";
import { EvolinkConfigError } from "@/lib/providers/evolink-config";
import { EvolinkFileUploadError, uploadImageFileToEvolink } from "@/lib/providers/evolink-files";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("image");
  const rightsConfirmed = formData.get("rightsConfirmed") === "true";
  const modelId = formData.get("modelId");
  const selectedModel = getDanceModelOption(typeof modelId === "string" ? modelId : null) || getDanceModelOption(standardDanceModelId);

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        allowed: false,
        reasonCode: "missing_file",
        userMessage: "Upload a clear adult solo photo before starting review.",
      },
      { status: 400 },
    );
  }

  if (!rightsConfirmed) {
    return NextResponse.json(
      {
        allowed: false,
        reasonCode: "rights_not_confirmed",
        userMessage: "Confirm that you own the image rights before generation.",
      },
      { status: 400 },
    );
  }

  const review = reviewUploadFilename(file.name);

  if (!review.allowed || !selectedModel?.requiresSourceUpload) {
    return NextResponse.json(review, { status: review.allowed ? 200 : 422 });
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        allowed: false,
        reasonCode: "member_model_auth_required",
        userMessage: "Sign in before using the member Seedance model.",
      },
      { status: 401 },
    );
  }

  if (!(await userHasActiveCreatorSubscription(session.user.id))) {
    return NextResponse.json(
      {
        allowed: false,
        reasonCode: "member_model_subscription_required",
        userMessage: "Upgrade to the Creator plan before using the member Seedance model.",
      },
      { status: 402 },
    );
  }

  try {
    const uploadedFile = await uploadImageFileToEvolink(file);

    return NextResponse.json(
      {
        ...review,
        uploadObjectKey: uploadedFile.fileUrl,
        sourceUrlExpiresAt: uploadedFile.expiresAt,
      },
      { status: 200 },
    );
  } catch (error) {
    const status = error instanceof EvolinkConfigError ? 503 : 502;
    const message =
      error instanceof EvolinkConfigError || error instanceof EvolinkFileUploadError
        ? error.message
        : "The source image could not be prepared for the member Seedance model.";

    return NextResponse.json(
      {
        allowed: false,
        reasonCode: "member_model_upload_failed",
        userMessage: message,
      },
      { status },
    );
  }
}
