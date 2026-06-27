import type { Metadata } from "next";

import { PricingCards } from "@/components/sections/pricing-cards";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple DanceGen AI MVP pricing for single-video unlocks and a monthly creator plan.",
};

export default function PricingPage() {
  return (
    <main>
      <PricingCards />
      <section className="border-t border-ink/10 bg-white py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-ink">Failures refund the generation.</h2>
          <p className="mt-4 text-base leading-7 text-ink/64">
            Model failure, system timeout, transfer failure, or output safety block returns the reserved generation automatically.
            Payment unlocks only apply to successful videos.
          </p>
        </div>
      </section>
    </main>
  );
}
