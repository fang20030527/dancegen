"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
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

  async function startCheckout() {
    setIsLoading(true);
    setError(null);

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

      window.location.href = payload.checkoutUrl;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be started.");
      setIsLoading(false);
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
