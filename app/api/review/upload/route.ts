import { NextResponse } from "next/server";

import { reviewUploadFilename } from "@/lib/safety/policy";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("image");
  const rightsConfirmed = formData.get("rightsConfirmed") === "true";

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

  return NextResponse.json(review, { status: review.allowed ? 200 : 422 });
}
