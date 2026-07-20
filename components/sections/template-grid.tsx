import type { DanceTemplate } from "@/lib/dance/types";

import { TemplateSelectionLink } from "./template-selection-link";

type TemplateGridProps = {
  templates: DanceTemplate[];
};

const showcaseVideoPathsByTemplateId: Record<string, string> = {
  "hip-hop": "/showcase-template-videos/template-2.mp4",
  "k-pop": "/showcase-template-videos/template-3.mp4",
  shuffle: "/showcase-template-videos/template-4.mp4",
  salsa: "/showcase-template-videos/template-5.mp4",
  robot: "/showcase-template-videos/template-6.mp4",
  fitness: "/showcase-template-videos/template-7.mp4",
  party: "/showcase-template-videos/template-8.mp4",
  catwalk: "/showcase-template-videos/template-7-1.mp4",
};

export function TemplateGrid({ templates }: TemplateGridProps) {
  return (
    <section className="bg-paper py-20">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-black leading-tight tracking-normal text-ink md:text-5xl">
            AI Dance Video Templates for Social Clips
          </h2>
          <p className="mt-4 text-base leading-7 text-ink/64">
            Use DanceClip AI as a TikTok AI dance generator with ready-made AI dance video templates for Reels,
            Shorts, and fast creator tests.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((template) => {
            const showcaseVideoPath = showcaseVideoPathsByTemplateId[template.id] ?? template.videoPath;

            return (
              <TemplateSelectionLink
                ariaLabel={`Try the ${template.name} template`}
                className="block rounded-[32px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cobalt"
                href={`/ai-dance-generator?template=${encodeURIComponent(template.id)}#generator`}
                key={template.id}
              >
                <article
                  aria-label={`${template.name} preview`}
                  className="relative aspect-[9/16] overflow-hidden rounded-[32px] border border-ink/10 bg-ink shadow-sm"
                >
                  <video autoPlay className="pointer-events-none h-full w-full object-cover" loop muted playsInline preload="metadata" src={showcaseVideoPath} />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[clamp(40px,4vw,56px)] items-center justify-center bg-acid text-sm font-black text-ink">
                    TRY NOW
                  </div>
                </article>
              </TemplateSelectionLink>
            );
          })}
        </div>
      </div>
    </section>
  );
}
