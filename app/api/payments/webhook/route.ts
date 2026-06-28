import { NextRequest, NextResponse } from "next/server";

import {
  CreemConfigError,
  getCreemWebhookSecret,
  getCreemWebhookEventType,
  parseCreemWebhookEvent,
  verifyCreemWebhookSignature,
} from "@/lib/payments/creem";
import { applyCreemWebhookEvent } from "@/lib/payments/entitlements";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  try {
    const webhookSecret = getCreemWebhookSecret();
    const signature = request.headers.get("creem-signature");

    if (!verifyCreemWebhookSignature(rawBody, signature, webhookSecret)) {
      return NextResponse.json(
        {
          code: "INVALID_CREEM_SIGNATURE",
          message: "Webhook signature verification failed.",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    if (error instanceof CreemConfigError) {
      return NextResponse.json(
        {
          code: "CREEM_CONFIGURATION_ERROR",
          message: error.message,
        },
        { status: 500 },
      );
    }

    throw error;
  }

  const event = parseCreemWebhookEvent(rawBody);

  if (!event) {
    return NextResponse.json(
      {
        code: "INVALID_CREEM_WEBHOOK_PAYLOAD",
        message: "Webhook payload must be a JSON object.",
      },
      { status: 400 },
    );
  }

  const result = await applyCreemWebhookEvent(event);

  return NextResponse.json({
    received: true,
    eventId: result.eventId,
    eventType: getCreemWebhookEventType(event),
    processed: result.processed,
    alreadyProcessed: result.alreadyProcessed,
    ledgerStored: result.stored,
    actions: result.actions,
    message: result.message,
  });
}
