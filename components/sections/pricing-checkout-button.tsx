"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { trackProductEvent } from "@/lib/analytics/client";
import type { PricingPlanKey } from "@/lib/payments/pricing";
import { cn } from "@/lib/utils";

type PricingCheckoutButtonProps = {
  className?: string;
  priceKey: PricingPlanKey;
  variant: ButtonProps["variant"];
  label?: string;
};

export function PricingCheckoutButton({ className, priceKey, variant, label = "Start" }: PricingCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkoutLock = useRef(false);

  async function startCheckout() {
    if (checkoutLock.current) {
      return;
    }

    checkoutLock.current = true;
    setIsLoading(true);
    setError(null);
    trackProductEvent("checkout_start", { source: "pricing" });
    let keepLockedForNavigation = false;

    try {
      const response = await fetch("/api/payments/creem/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceKey }),
      });
      const payload = (await response.json().catch(() => null)) as { checkoutUrl?: string; message?: string } | null;

      if (!response.ok || !payload?.checkoutUrl) {
        throw new Error(payload?.message || "Checkout could not be started.");
      }

      keepLockedForNavigation = true;
      window.location.href = payload.checkoutUrl;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be started.");
      setIsLoading(false);
    } finally {
      if (!keepLockedForNavigation) {
        checkoutLock.current = false;
      }
    }
  }

  return (
    <div className={cn("mt-7", className)}>
      <Button className="w-full" disabled={isLoading} onClick={startCheckout} type="button" variant={variant}>
        {isLoading ? <Loader2 aria-hidden="true" className="animate-spin" size={18} /> : null}
        {isLoading ? "Opening checkout" : label}
      </Button>
      {error ? (
        <p aria-live="polite" className="mt-3 text-sm font-semibold text-coral">
          {error}
        </p>
      ) : null}
    </div>
  );
}
