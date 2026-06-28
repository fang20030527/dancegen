import { NextRequest, NextResponse } from "next/server";

import { CreemConfigError, getAppOrigin, verifyCreemReturnSignature } from "@/lib/payments/creem";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);

  try {
    const verification = verifyCreemReturnSignature(requestUrl);
    const destination = new URL(verification.ok ? "/payment/success" : "/payment/cancel", getAppOrigin(request.url));

    if (verification.ok) {
      destination.searchParams.set("verified", "1");
      copyParam(destination, verification.params, "checkout_id", "checkoutId");
      copyParam(destination, verification.params, "order_id", "orderId");
      copyParam(destination, verification.params, "subscription_id", "subscriptionId");
      copyParam(destination, verification.params, "request_id", "requestId");
      copyParam(destination, verification.params, "product_id", "productId");
    } else {
      destination.searchParams.set("reason", verification.reason || "invalid_creem_return");
    }

    return NextResponse.redirect(destination);
  } catch (error) {
    const destination = new URL("/payment/cancel", getAppOrigin(request.url));

    destination.searchParams.set("reason", error instanceof CreemConfigError ? "creem_configuration_error" : "creem_return_error");

    return NextResponse.redirect(destination);
  }
}

function copyParam(destination: URL, params: Record<string, string>, from: string, to: string) {
  const value = params[from];

  if (value) {
    destination.searchParams.set(to, value);
  }
}
