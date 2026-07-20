import { headers } from "next/headers";

import { GeneratorPanel } from "@/components/generator/generator-panel";
import { HeroSection } from "@/components/sections/hero-section";
import { PricingCards } from "@/components/sections/pricing-cards";
import { SafetyFlow } from "@/components/sections/safety-flow";
import { TemplateGrid } from "@/components/sections/template-grid";
import { auth } from "@/lib/auth";
import { getPublicDanceTemplates } from "@/lib/dance/templates";
import { userHasActiveCreatorSubscription } from "@/lib/payments/entitlements";
import { createPageMetadata } from "@/lib/site";

export const metadata = createPageMetadata({
  title: "Free AI Dance Video Generator from Photo | DanceClip AI",
  description:
    "Make a photo dance online with DanceClip AI. Upload one adult solo photo, choose a viral dance template, and create a short AI dance video for TikTok, Reels, and Shorts.",
  path: "/",
  absoluteTitle: true,
  keywords: [
    "free AI dance video generator",
    "AI dance generator from photo",
    "photo to dance video generator",
    "make photo dance online",
    "AI dance video generator",
    "AI photo dance generator",
    "AI dance maker online",
    "TikTok AI dance generator",
    "AI dance video templates",
  ],
});

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
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
          <h2 className="mb-10 max-w-3xl text-4xl font-black leading-tight tracking-normal text-ink md:text-6xl">
            Turn One Photo Into an AI Dance Video
          </h2>
          <GeneratorPanel
            customTemplatesEnabled={process.env.CUSTOM_TEMPLATE_FEATURE_ENABLED?.trim() === "true"}
            hasCreatorMonthlyAccess={hasCreatorMonthlyAccess}
            signedIn={Boolean(session?.user?.id)}
            templates={templates}
          />
        </div>
      </section>
      <TemplateGrid templates={templates} />
      <SafetyFlow />
      <PricingCards headingLevel="h2" />
    </main>
  );
}
