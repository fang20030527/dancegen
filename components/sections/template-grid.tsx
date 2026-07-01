import type { DanceTemplate } from "@/lib/dance/types";

type TemplateGridProps = {
  templates: DanceTemplate[];
};

const templateVideos = [
  "/template-videos/template-2.mp4",
  "/template-videos/template-3.mp4",
  "/template-videos/template-4.mp4",
  "/template-videos/template-5.mp4",
  "/template-videos/template-6.mp4",
  "/template-videos/template-7.mp4",
  "/template-videos/template-8.mp4",
  "/template-videos/template-7-1.mp4",
];

export function TemplateGrid({ templates }: TemplateGridProps) {
  return (
    <section className="bg-paper py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-black leading-tight tracking-normal text-ink md:text-5xl">
            Make Your AI Dance Video with DanceGen
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {templateVideos.map((src, index) => (
            <article
              aria-label={`${templates[index]?.name ?? "Dance template"} preview`}
              className="relative aspect-[9/16] overflow-hidden rounded-[32px] border border-ink/10 bg-ink shadow-sm"
              key={templates[index]?.id ?? src}
            >
              <video autoPlay className="h-full w-full object-cover" loop muted playsInline preload="metadata" src={src} />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 flex h-[clamp(40px,4vw,56px)] items-center justify-center bg-acid text-sm font-black text-ink"
              >
                TRY NOW
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
