import { Clapperboard, ImageUp, Share2, Sparkles } from "lucide-react";

const marketingHighlights = [
  {
    title: "One photo is enough",
    body: "Upload a clear solo image and turn it into a dance preview without filming, editing, or learning motion tools.",
    icon: ImageUp,
  },
  {
    title: "Ready-made moves",
    body: "Pick from dance templates that are built for quick, recognizable short-form videos.",
    icon: Clapperboard,
  },
  {
    title: "Smooth AI motion",
    body: "Full-body, front-facing photos work best for clean movement and natural-looking choreography.",
    icon: Sparkles,
  },
  {
    title: "Made for social",
    body: "Create vertical clips that feel native on TikTok, Instagram Reels, YouTube Shorts, and creator feeds.",
    icon: Share2,
  },
];

export function SafetyFlow() {
  return (
    <section className="bg-ink py-20 text-paper">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-4xl font-black leading-tight tracking-normal md:text-5xl">
              Make dance videos people want to share.
            </h2>
            <p className="mt-4 text-base leading-7 text-paper/64">
              Start with one photo, choose a viral dance template, and generate a short video built for social feeds.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {marketingHighlights.map((highlight) => {
              const Icon = highlight.icon;

              return (
                <article className="rounded-[24px] border border-white/10 bg-white/6 p-5" key={highlight.title}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-acid text-ink">
                    <Icon aria-hidden="true" size={20} />
                  </div>
                  <h3 className="mt-5 text-lg font-black">{highlight.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-paper/62">{highlight.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
