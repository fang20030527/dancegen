import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GPTImageGenerationLoader } from "@/components/ui/gpt-image-generation-loader";
import { cn } from "@/lib/utils";

const heroVideos = [
  { className: "mt-16", cornerImage: "/hero-images/source-cat.png", src: "/hero-videos/hero-dance-cat.mp4" },
  { className: "-mt-16", cornerImage: "/hero-images/source-female.png", src: "/hero-videos/hero-dance-2.mp4" },
];

function HeroSourceTile({ src }: { src: string }) {
  return (
    <div className="absolute right-5 top-5 z-10 aspect-[3/4] w-[clamp(52px,4vw,70px)] overflow-hidden rounded-[18px] border border-ink/10 bg-white shadow-[0_12px_26px_rgba(9,9,7,0.14)]">
      <Image alt="" className="object-cover" fill sizes="70px" src={src} />
    </div>
  );
}

function HeroVideoCard({ className, cornerImage, src }: { className?: string; cornerImage: string; src: string }) {
  return (
    <div
      className={cn(
        "relative aspect-[9/16] w-[clamp(220px,16vw,282px)] overflow-hidden rounded-[40px] border border-ink/12 bg-white/92 shadow-[0_24px_70px_rgba(9,9,7,0.18)]",
        className,
      )}
    >
      <video autoPlay className="h-full w-full object-cover" loop muted playsInline preload="metadata" src={src} />
      <HeroSourceTile src={cornerImage} />
    </div>
  );
}

function HeroVideoFrames() {
  return (
    <div
      aria-hidden="true"
      className="absolute right-[1vw] top-1/2 z-10 hidden -translate-y-1/2 items-center gap-5 lg:flex xl:right-[3vw]"
    >
      {heroVideos.map((video) => (
        <HeroVideoCard className={video.className} cornerImage={video.cornerImage} key={video.src} src={video.src} />
      ))}
    </div>
  );
}

function HeroAcidField({ className, clipPath }: { className: string; clipPath: string }) {
  return (
    <div aria-hidden="true" className={cn("absolute overflow-hidden bg-acid", className)} style={{ clipPath }}>
      <GPTImageGenerationLoader
        className="absolute inset-0"
        dotGap={7}
        speed={1.08}
        variant="field"
      />
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative min-h-[76dvh] overflow-hidden bg-chalk text-ink">
      <HeroAcidField
        className="inset-y-0 right-0 hidden w-[52%] md:block"
        clipPath="polygon(24% 0, 100% 0, 100% 100%, 0 100%)"
      />
      <HeroAcidField
        className="-right-24 top-0 h-full w-[62%] md:hidden"
        clipPath="polygon(34% 0, 100% 0, 100% 100%, 0 100%)"
      />
      <HeroVideoFrames />
      <div className="relative mx-auto flex min-h-[76dvh] max-w-[1500px] items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative z-20 max-w-2xl animate-slide-up">
          <h1 className="max-w-2xl text-5xl font-black leading-[1.02] tracking-normal text-ink md:text-6xl lg:text-7xl">
            Free AI Dance
            <br />
            Video Generator
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-ink/68 md:text-lg">
            Make a photo dance online: upload one adult solo photo, choose a viral dance template, and create a short
            AI dance clip for TikTok, Reels, and Shorts with an AI dance maker online.
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
        </div>
      </div>
    </section>
  );
}
