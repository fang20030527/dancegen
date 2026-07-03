import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Mail, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "AI Twerk Generator Waitlist",
  description:
    "Join the AI twerk generator waitlist for future access while public release remains blocked during safety, consent, and quality testing.",
  path: "/ai-twerk-generator",
  keywords: [
    "AI twerk generator waitlist",
    "AI twerk generator",
    "twerk generation waitlist",
    "AI dance generator",
    "safe AI dance video generator",
  ],
});

export default function AiTwerkGeneratorPage() {
  return (
    <main className="bg-paper">
      <section className="mx-auto grid min-h-[72dvh] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-coral/25 bg-coral/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#9c2416]">
            <Lock aria-hidden="true" size={14} />
            Internal testing only
          </div>
          <h1 className="text-5xl font-black leading-tight tracking-normal text-ink md:text-6xl">
            AI Twerk Generator Waitlist
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-ink/64">
            Public twerk generation is not available in this MVP. This waitlist page validates search demand while the
            template remains blocked for safety, consent, and quality review.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/ai-dance-generator">Use dance generator</Link>
            </Button>
            <Button asChild variant="outline">
              <a href={`mailto:${siteConfig.waitlistEmail}`}>
                <Mail aria-hidden="true" size={18} />
                Join waitlist
              </a>
            </Button>
          </div>
        </div>
        <div className="rounded-[32px] border border-ink/10 bg-white p-6 shadow-studio-soft">
          <div className="rounded-[24px] bg-ink p-6 text-paper">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-coral text-white">
              <ShieldAlert aria-hidden="true" size={26} />
            </div>
            <h2 className="mt-8 text-3xl font-black leading-tight">Public access blocked</h2>
            <p className="mt-4 text-sm leading-6 text-paper/64">
              DanceClip AI only exposes low-risk templates while the product measures safety, cost, quality, and user satisfaction.
            </p>
            <div className="mt-8 grid gap-3 text-sm font-semibold text-paper/72">
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">No public twerk template</div>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">No explicit samples</div>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">No free prompt generation</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
