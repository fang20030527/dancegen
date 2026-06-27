import { Clapperboard, Shield } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DanceTemplate } from "@/lib/dance/types";

type TemplateGridProps = {
  templates: DanceTemplate[];
};

export function TemplateGrid({ templates }: TemplateGridProps) {
  return (
    <section className="bg-paper py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-black leading-tight tracking-normal text-ink md:text-5xl">Low-risk templates only.</h2>
          <p className="mt-4 text-base leading-7 text-ink/62">
            Every public template is pre-scoped to avoid sexualized motion, partner interaction, music dependency, and free prompt risk.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {templates.map((template, index) => (
            <article
              className="group min-h-[210px] rounded-[24px] border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-studio-soft"
              key={template.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-acid">
                  <Clapperboard aria-hidden="true" size={20} />
                </div>
                <span className="text-xs font-black text-ink/32">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-xl font-black text-ink">{template.name}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/60">{template.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge className="bg-acid/24 text-ink">
                  <Shield aria-hidden="true" className="mr-1" size={13} /> {template.risk}
                </Badge>
                <Badge>{template.durationSeconds}s</Badge>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
