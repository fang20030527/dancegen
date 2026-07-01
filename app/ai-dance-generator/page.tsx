import type { Metadata } from "next";
import { headers } from "next/headers";

import { GeneratorPanel } from "@/components/generator/generator-panel";
import { SafetyFlow } from "@/components/sections/safety-flow";
import { TemplateGrid } from "@/components/sections/template-grid";
import { auth } from "@/lib/auth";
import { getPublicDanceTemplates } from "@/lib/dance/templates";
import { userHasActiveCreatorSubscription } from "@/lib/payments/entitlements";

export const metadata: Metadata = {
  title: "AI Dance Generator",
  description: "Upload one adult solo photo and generate a safe 5-second silent AI dance video preview.",
};

export default async function AiDanceGeneratorPage() {
  const templates = getPublicDanceTemplates();
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const hasCreatorMonthlyAccess = session?.user?.id ? await userHasActiveCreatorSubscription(session.user.id) : false;

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
          <GeneratorPanel hasCreatorMonthlyAccess={hasCreatorMonthlyAccess} templates={templates} />
        </div>
      </section>
      <TemplateGrid templates={templates} />
      <SafetyFlow />
    </main>
  );
}
