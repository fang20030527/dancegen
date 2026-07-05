import { NextResponse } from "next/server";

import {
  ContactEmailConfigError,
  ContactEmailSendError,
  contactMessageSchema,
  sendContactEmail,
} from "@/lib/contact-email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = contactMessageSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json(
      {
        code: "INVALID_CONTACT_MESSAGE",
        message: "Include your name, email, subject, and a short message.",
      },
      { status: 400 },
    );
  }

  try {
    const email = await sendContactEmail(payload.data);

    return NextResponse.json({
      received: true,
      emailId: email.id,
    });
  } catch (error) {
    if (error instanceof ContactEmailConfigError) {
      return NextResponse.json(
        {
          code: "CONTACT_EMAIL_NOT_CONFIGURED",
          message: "Contact email is not configured yet.",
        },
        { status: 500 },
      );
    }

    if (error instanceof ContactEmailSendError) {
      return NextResponse.json(
        {
          code: "CONTACT_EMAIL_FAILED",
          message: "Message could not be sent. Please email us directly.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        code: "CONTACT_FAILED",
        message: "Message could not be sent. Please try again.",
      },
      { status: 500 },
    );
  }
}
