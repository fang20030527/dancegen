import type { Metadata } from "next";
import { headers } from "next/headers";

import { GeneratorPanel } from "@/components/generator/generator-panel";
import { SafetyFlow } from "@/components/sections/safety-flow";
import { TemplateGrid } from "@/components/sections/template-grid";
import { auth } from "@/lib/auth";
import { getPublicDanceTemplates } from "@/lib/dance/templates";
import { userHasActiveCreatorSubscription } from "@/lib/payments/entitlements";
import { createPageMetadata } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "AI Dance Generator From Photo",
  description:
    "Use DanceClip AI to turn one authorized adult solo photo into a 5-second AI dance video. Choose a template and make a photo dance online for TikTok, Reels, and Shorts.",
  path: "/ai-dance-generator",
  keywords: [
    "AI dance generator from photo",
    "photo to dance video generator",
    "AI dance video generator",
    "make photo dance online",
    "AI photo dance generator",
    "AI dance maker online",
    "TikTok AI dance generator",
    "AI dance video templates",
  ],
});

export default async function AiDanceGeneratorPage() {
  const templates = getPublicDanceTemplates();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const hasCreatorMonthlyAccess = session?.user?.id ? await userHasActiveCreatorSubscription(session.user.id) : false;

  return (
    <main>
      <section className="bg-paper py-10 md:py-16">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <h1 className="text-4xl font-black leading-tight tracking-normal text-ink md:text-6xl">
              AI Dance Generator From Photo
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink/64">
              Turn a clear adult solo photo into a short dance video with a template-led workflow. This AI photo dance
              generator works as a photo to dance video generator for vertical social posts, low-risk choreography, and
              safe preview generation.
            </p>
          </div>
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
    </main>
  );
}
