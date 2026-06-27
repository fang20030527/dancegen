import { NextResponse } from "next/server";
import { z } from "zod";

const complaintSchema = z.object({
  email: z.string().email(),
  urlOrTaskId: z.string().min(3),
  reason: z.string().min(12),
});

export async function POST(request: Request) {
  const payload = complaintSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      {
        code: "INVALID_COMPLAINT",
        message: "Include an email, task or URL, and a short reason.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    received: true,
    nextStep: "Downloads are frozen first in the production workflow, then queued for manual review.",
  });
}
