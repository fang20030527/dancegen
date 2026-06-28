import { Check, CreditCard } from "lucide-react";

import { PricingCheckoutButton } from "@/components/sections/pricing-checkout-button";
import { pricingPlans } from "@/lib/payments/pricing";

export function PricingCards() {
  const plans = [pricingPlans.singleUnlock, pricingPlans.creatorMonthly];

  return (
    <section className="bg-paper py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-black leading-tight tracking-normal text-ink md:text-6xl">Pay only after a usable result.</h1>
          <p className="mt-4 text-base leading-7 text-ink/62">
            The MVP keeps pricing simple: one successful video unlock, or one creator subscription.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {plans.map((plan) => (
            <article className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-sm" key={plan.key}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-ink">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink/62">{plan.description}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-acid">
                  <CreditCard aria-hidden="true" size={21} />
                </div>
              </div>
              <p className="mt-7 text-5xl font-black text-ink">{plan.priceLabel}</p>
              <ul className="mt-6 space-y-3">
                {plan.entitlements.map((entitlement) => (
                  <li className="flex items-center gap-3 text-sm font-semibold text-ink/72" key={entitlement}>
                    <Check aria-hidden="true" className="text-moss" size={18} />
                    {entitlement}
                  </li>
                ))}
              </ul>
              <PricingCheckoutButton priceKey={plan.key} variant={plan.key === "single_hd_unlock" ? "primary" : "dark"} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
