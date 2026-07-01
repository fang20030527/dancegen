import { headers } from "next/headers";

import { GeneratorPanel } from "@/components/generator/generator-panel";
import { HeroSection } from "@/components/sections/hero-section";
import { PricingCards } from "@/components/sections/pricing-cards";
import { SafetyFlow } from "@/components/sections/safety-flow";
import { TemplateGrid } from "@/components/sections/template-grid";
import { auth } from "@/lib/auth";
import { getPublicDanceTemplates } from "@/lib/dance/templates";
import { userHasActiveCreatorSubscription } from "@/lib/payments/entitlements";

export default async function HomePage() {
  const templates = getPublicDanceTemplates();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const hasCreatorMonthlyAccess = session?.user?.id ? await userHasActiveCreatorSubscription(session.user.id) : false;

  return (
    <main>
      <HeroSection />
      <div aria-hidden="true" className="h-1 bg-neutral-700" />
      <section className="bg-paper py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <GeneratorPanel hasCreatorMonthlyAccess={hasCreatorMonthlyAccess} templates={templates} />
        </div>
      </section>
      <TemplateGrid templates={templates} />
      <SafetyFlow />
      <PricingCards />
    </main>
  );
}
