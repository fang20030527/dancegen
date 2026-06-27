import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const heroImage =
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1600&q=82";

export function HeroSection() {
  return (
    <section className="relative min-h-[76dvh] overflow-hidden bg-ink text-paper">
      <Image
        alt="A dancer moving under studio lights"
        className="object-cover opacity-62"
        fill
        priority
        sizes="100vw"
        src={heroImage}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,7,0.92),rgba(9,9,7,0.54),rgba(9,9,7,0.18))]" />
      <div className="relative mx-auto flex min-h-[76dvh] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl animate-slide-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-acid backdrop-blur">
            <Sparkles aria-hidden="true" size={14} />
            DanceGen MVP
          </div>
          <h1 className="max-w-2xl text-5xl font-black leading-[1.02] tracking-normal text-paper md:text-6xl lg:text-7xl">
            AI dance videos from one photo.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-paper/72 md:text-lg">
            Generate safe 5-second silent clips for TikTok, Reels, and Shorts tests.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/ai-dance-generator">
                Open generator <ArrowRight aria-hidden="true" size={18} />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-paper/68">
            <ShieldCheck aria-hidden="true" className="text-acid" size={20} />
            Public MVP blocks minors, celebrities, explicit inputs, and high-uncertainty uploads.
          </div>
        </div>
      </div>
    </section>
  );
}
