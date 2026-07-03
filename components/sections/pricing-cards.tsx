import type { LucideIcon } from "lucide-react";
import { Check, CreditCard, Gauge, Rocket, Sparkles, Zap } from "lucide-react";

import { PricingCheckoutButton } from "@/components/sections/pricing-checkout-button";
import { Button } from "@/components/ui/button";
import { pricingDisplayPlans, type PricingPlanKey } from "@/lib/payments/pricing";
import { cn } from "@/lib/utils";

type PricingDisplayPlan = (typeof pricingDisplayPlans)[number];

const planIcons: Record<PricingDisplayPlan["key"], LucideIcon> = {
  free: Sparkles,
  starter_monthly: CreditCard,
  creator_monthly: Zap,
  pro_monthly: Rocket,
};

export function PricingCards() {
  return (
    <section className="bg-paper py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black leading-tight tracking-normal text-ink md:text-6xl">Plans for every dance workflow.</h1>
          <p className="mt-4 text-base leading-7 text-ink/62">
            Start free, then pick monthly or annual credits that match how often you publish. Annual plans save 20% while credits still refresh monthly.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pricingDisplayPlans.map((plan) => {
            const featured = isFeaturedPlan(plan);
            const Icon = planIcons[plan.key];

            return (
              <article
                className="flex min-h-full flex-col rounded-[24px] border border-ink/10 bg-white p-5 shadow-sm"
                key={plan.key}
              >
                <div className="flex min-h-[150px] flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-black text-ink">{plan.name}</h2>
                      {hasBadge(plan) ? (
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-3 py-1 text-xs font-black",
                            featured ? "border-acid/35 bg-acid text-ink" : "border-ink/10 bg-paper text-ink/70",
                          )}
                        >
                          {plan.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-acid">
                      <Icon aria-hidden="true" size={20} />
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-ink/62">{plan.description}</p>
                </div>

                <div className="mt-7">
                  <div className="flex items-end gap-2">
                    <p className="text-4xl font-black text-ink">{plan.priceLabel}</p>
                    <p className="pb-1 text-sm font-bold text-ink/48">{plan.cadenceLabel}</p>
                  </div>
                  <div className="mt-5 rounded-[18px] border border-ink/10 bg-paper p-4">
                    <div className="flex items-center gap-2">
                      <Gauge aria-hidden="true" className="text-moss" size={18} />
                      <p className="text-sm font-black text-ink">{plan.creditsLabel}</p>
                    </div>
                    <p className="mt-1 text-xs font-semibold leading-5 text-ink/52">{plan.creditsNote}</p>
                  </div>
                  {hasYearlyPricing(plan) ? (
                    <div className="mt-3 rounded-[18px] border border-acid/45 bg-acid/20 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/48">Annual</p>
                          <p className="mt-1 text-lg font-black text-ink">{plan.yearlyEquivalentLabel}</p>
                        </div>
                        <span className="rounded-full bg-ink px-3 py-1 text-xs font-black text-acid">Save 20%</span>
                      </div>
                      <p className="mt-2 text-xs font-bold leading-5 text-ink/58">
                        {plan.yearlyPriceLabel} {plan.yearlyCadenceLabel}. {plan.monthlySavingsLabel}.
                      </p>
                      <p className="text-xs font-bold leading-5 text-ink/58">{plan.yearlySavingsLabel}.</p>
                    </div>
                  ) : null}
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.entitlements.map((entitlement) => (
                    <li className="flex items-center gap-3 text-sm font-semibold text-ink/72" key={entitlement}>
                      <Check aria-hidden="true" className="shrink-0 text-moss" size={18} />
                      <span>{entitlement}</span>
                    </li>
                  ))}
                </ul>

                <PricingPlanAction featured={featured} plan={plan} />
              </article>
            );
          })}
        </div>
        <p className="mx-auto mt-7 max-w-3xl text-center text-sm font-semibold leading-6 text-ink/55">
          Default 5-second videos use 20 credits. Better 5-second videos use 50 credits. Failed, timed-out, or safety-blocked generations
          return credits automatically.
        </p>
      </div>
    </section>
  );
}

function PricingPlanAction({ plan, featured }: { plan: PricingDisplayPlan; featured: boolean }) {
  if (hasCheckoutOptions(plan)) {
    return (
      <div className="mt-7 grid gap-2">
        <PricingCheckoutButton
          className="mt-0"
          label={plan.ctaLabel}
          priceKey={plan.checkoutPriceKey}
          variant={featured ? "primary" : "outline"}
        />
        <PricingCheckoutButton
          className="mt-0"
          label={`${plan.annualCtaLabel} - save 20%`}
          priceKey={plan.annualCheckoutPriceKey}
          variant="dark"
        />
      </div>
    );
  }

  if (!hasPlanHref(plan)) {
    return null;
  }

  return (
    <div className="mt-7">
      <Button asChild className="w-full" variant={featured ? "primary" : "outline"}>
        <a href={plan.ctaHref}>{plan.ctaLabel}</a>
      </Button>
    </div>
  );
}

function isFeaturedPlan(plan: PricingDisplayPlan) {
  return "featured" in plan && plan.featured;
}

function hasBadge(plan: PricingDisplayPlan): plan is PricingDisplayPlan & { badge: string } {
  return "badge" in plan;
}

function hasCheckoutOptions(
  plan: PricingDisplayPlan,
): plan is Extract<
  PricingDisplayPlan,
  { readonly annualCheckoutPriceKey: PricingPlanKey; readonly annualCtaLabel: string; readonly checkoutPriceKey: PricingPlanKey }
> {
  return "checkoutPriceKey" in plan && "annualCheckoutPriceKey" in plan;
}

function hasYearlyPricing(
  plan: PricingDisplayPlan,
): plan is PricingDisplayPlan & {
  readonly monthlySavingsLabel: string;
  readonly yearlyCadenceLabel: string;
  readonly yearlyEquivalentLabel: string;
  readonly yearlyPriceLabel: string;
  readonly yearlySavingsLabel: string;
} {
  return "yearlyPriceLabel" in plan;
}

function hasPlanHref(plan: PricingDisplayPlan): plan is Extract<PricingDisplayPlan, { readonly ctaHref: string }> {
  return "ctaHref" in plan;
}
