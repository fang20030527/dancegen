import type { Metadata } from "next";

import { PricingCards } from "@/components/sections/pricing-cards";

export const metadata: Metadata = {
  title: "Pricing",
  description: "DanceGen AI pricing for one-video unlocks and monthly standard video allowance.",
};

export default function PricingPage() {
  return (
    <main>
      <PricingCards />
      <section className="border-t border-ink/10 bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-ink">Allowance follows real generation cost.</h2>
          <p className="mt-4 text-base leading-7 text-ink/64">
            Fast 5-second generations use the standard allowance baseline. Reference models and other higher-cost modes can use more
            allowance, while model failure, timeout, transfer failure, or output safety block returns the reserved allowance automatically.
          </p>
        </div>
      </section>
    </main>
  );
}
