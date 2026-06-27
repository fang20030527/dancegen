import { NextResponse } from "next/server";
import { z } from "zod";

import { pricingPlans } from "@/lib/payments/pricing";

const checkoutSchema = z.object({
  priceKey: z.enum([pricingPlans.singleUnlock.key, pricingPlans.creatorMonthly.key]),
  taskId: z.string().optional(),
});

export async function POST(request: Request) {
  const payload = checkoutSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json(
      {
        code: "INVALID_CHECKOUT_REQUEST",
        message: "Choose a valid unlock or subscription option.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    checkoutUrl: `/payment/success?mode=stub&priceKey=${payload.data.priceKey}`,
  });
}
