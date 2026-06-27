import { GeneratorPanel } from "@/components/generator/generator-panel";
import { HeroSection } from "@/components/sections/hero-section";
import { PricingCards } from "@/components/sections/pricing-cards";
import { SafetyFlow } from "@/components/sections/safety-flow";
import { TemplateGrid } from "@/components/sections/template-grid";
import { getPublicDanceTemplates } from "@/lib/dance/templates";

export default function HomePage() {
  const templates = getPublicDanceTemplates();

  return (
    <main>
      <HeroSection />
      <section className="bg-paper py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <GeneratorPanel templates={templates} />
        </div>
      </section>
      <TemplateGrid templates={templates} />
      <SafetyFlow />
      <PricingCards />
    </main>
  );
}
