import type { Metadata } from "next";

import { PricingCards } from "@/components/sections/pricing-cards";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Pricing",
  description:
    "Compare DanceClip AI pricing for free trials, monthly credits, annual savings, HD downloads, watermark removal, priority queues, and creator subscriptions.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <main>
      <PricingCards />
      <section className="border-t border-ink/10 bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-ink">Credits follow real generation cost.</h2>
          <p className="mt-4 text-base leading-7 text-ink/64">
            Default 5-second dances use 20 credits. Better 5-second dances use 50 credits. Subscription credits refresh monthly, annual
            plans save 20%, and model failure, timeout, transfer failure, or output safety block returns reserved credits automatically.
          </p>
        </div>
      </section>
    </main>
  );
}
