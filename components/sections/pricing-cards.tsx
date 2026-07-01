import { Check, CreditCard, Mail } from "lucide-react";

import { PricingCheckoutButton } from "@/components/sections/pricing-checkout-button";
import { Button } from "@/components/ui/button";
import { pricingDisplayPlans } from "@/lib/payments/pricing";
import { cn } from "@/lib/utils";

export function PricingCards() {
  return (
    <section className="bg-paper py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-black leading-tight tracking-normal text-ink md:text-6xl">Choose by how often you create.</h1>
          <p className="mt-4 text-base leading-7 text-ink/62">
            Unlock one finished video, or subscribe for monthly standard video allowance. Higher-cost models use more allowance,
            so your plan stays simple while generation costs stay predictable.
          </p>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {pricingDisplayPlans.map((plan) => (
            <article
              className={cn(
                "flex min-h-full flex-col rounded-[28px] border border-ink/10 bg-white p-6 shadow-sm",
                plan.key === "creator_monthly" && "border-ink bg-ink text-paper shadow-[0_18px_45px_rgba(20,22,19,0.18)]",
              )}
              key={plan.key}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  {"badge" in plan ? (
                    <span
                      className={cn(
                        "mb-3 inline-flex rounded-full border px-3 py-1 text-xs font-black",
                        plan.key === "creator_monthly" ? "border-acid/35 bg-acid text-ink" : "border-ink/10 bg-paper text-ink/70",
                      )}
                    >
                      {plan.badge}
                    </span>
                  ) : null}
                  <h2 className={cn("text-2xl font-black text-ink", plan.key === "creator_monthly" && "text-paper")}>{plan.name}</h2>
                  <p className={cn("mt-2 text-sm leading-6 text-ink/62", plan.key === "creator_monthly" && "text-paper/66")}>
                    {plan.description}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-acid",
                    plan.key === "creator_monthly" && "bg-paper text-ink",
                  )}
                >
                  <CreditCard aria-hidden="true" size={21} />
                </div>
              </div>
              <p className={cn("mt-7 text-5xl font-black text-ink", plan.key === "creator_monthly" && "text-paper")}>
                {plan.priceLabel}
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.entitlements.map((entitlement) => (
                  <li
                    className={cn("flex items-center gap-3 text-sm font-semibold text-ink/72", plan.key === "creator_monthly" && "text-paper/75")}
                    key={entitlement}
                  >
                    <Check aria-hidden="true" className={cn("text-moss", plan.key === "creator_monthly" && "text-acid")} size={18} />
                    {entitlement}
                  </li>
                ))}
              </ul>
              {"checkoutPriceKey" in plan ? (
                <PricingCheckoutButton
                  label={plan.ctaLabel}
                  priceKey={plan.checkoutPriceKey}
                  variant={plan.key === "single_hd_unlock" ? "primary" : "dark"}
                />
              ) : (
                <div className="mt-7">
                  <Button asChild className="w-full" variant="outline">
                    <a href="mailto:support@dancegen.ai?subject=Studio%20plan">
                      <Mail aria-hidden="true" size={18} />
                      {plan.ctaLabel}
                    </a>
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
        <p className="mx-auto mt-7 max-w-3xl text-center text-sm font-semibold leading-6 text-ink/55">
          A standard video means a 5-second generation on the fast model. Reference and higher-cost models can use more allowance; failed,
          timed-out, or safety-blocked generations are returned automatically.
        </p>
      </div>
    </section>
  );
}
