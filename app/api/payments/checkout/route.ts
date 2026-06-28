import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createCreemCheckoutSession, CreemApiError, CreemConfigError, getAppOrigin } from "@/lib/payments/creem";
import { recordPendingCreemCheckout } from "@/lib/payments/entitlements";
import { pricingPlanKeys } from "@/lib/payments/pricing";

const checkoutSchema = z.object({
  priceKey: z.enum(pricingPlanKeys),
  taskId: z.string().min(1).optional(),
  customerEmail: z.string().email().optional(),
});

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = checkoutSchema.safeParse(await request.json().catch(() => null));

  if (!payload.success) {
    return NextResponse.json(
      {
        code: "INVALID_CHECKOUT_REQUEST",
        message: "Choose a valid unlock or subscription option.",
      },
      { status: 400 },
    );
  }

  try {
    const checkout = await createCreemCheckoutSession({
      priceKey: payload.data.priceKey,
      taskId: payload.data.taskId,
      customerEmail: payload.data.customerEmail,
      userId: getCheckoutUserId(),
      origin: getAppOrigin(request.url),
    });
    const ledger = await recordPendingCreemCheckout(checkout);

    return NextResponse.json({
      checkoutId: checkout.id,
      checkoutUrl: checkout.checkoutUrl,
      requestId: checkout.requestId,
      ledgerStored: ledger.stored,
    });
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

    if (error instanceof CreemApiError) {
      return NextResponse.json(
        {
          code: "CREEM_CHECKOUT_FAILED",
          message: "Creem could not create a checkout session.",
          creemStatus: error.status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        code: "CHECKOUT_FAILED",
        message: "Checkout could not be started.",
      },
      { status: 500 },
    );
  }
}

function getCheckoutUserId() {
  return "demo-user";
}
