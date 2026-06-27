import type { Metadata } from "next";

import { GeneratorPanel } from "@/components/generator/generator-panel";
import { SafetyFlow } from "@/components/sections/safety-flow";
import { TemplateGrid } from "@/components/sections/template-grid";
import { getPublicDanceTemplates } from "@/lib/dance/templates";

export const metadata: Metadata = {
  title: "AI Dance Generator",
  description: "Upload one adult solo photo and generate a safe 5-second silent AI dance video preview.",
};

export default function AiDanceGeneratorPage() {
  const templates = getPublicDanceTemplates();

  return (
    <main>
      <section className="bg-paper py-10 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <h1 className="text-4xl font-black leading-tight tracking-normal text-ink md:text-6xl">
              AI dance generator
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ink/64">
              Start with a conservative upload pre-check, generate a watermarked preview, then unlock HD only when the result works.
            </p>
          </div>
          <GeneratorPanel templates={templates} />
        </div>
      </section>
      <TemplateGrid templates={templates} />
      <SafetyFlow />
    </main>
  );
}
