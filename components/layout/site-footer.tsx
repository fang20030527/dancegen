import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund-policy", label: "Refunds" },
  { href: "mailto:abuse@dancegen.ai", label: "Report abuse" },
];

export function SiteFooter() {
  return (
    <footer className="border-t-4 border-neutral-700 bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[360px_1fr] md:items-start">
          <div className="relative h-16 w-[252px] overflow-hidden">
            <Image alt="DanceGen" className="scale-[1.85] object-cover object-center invert" fill sizes="252px" src="/DanceGen.svg" />
          </div>
          <div className="max-w-3xl">
            <h2 className="text-3xl font-black leading-tight tracking-normal text-paper sm:text-4xl">
              AI dance videos from one photo.
            </h2>
            <p className="mt-4 text-base leading-7 text-paper/70 sm:text-lg">
              DanceGen helps creators turn a single source photo into short 9:16 AI dance clips for TikTok,
              Reels, and Shorts. Upload a clear solo photo, choose a template, and generate a silent preview
              in seconds.
            </p>
          </div>
        </div>
        <nav aria-label="Footer links" className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-paper/42 md:justify-end">
          {footerLinks.map((link) => (
            <Link className="transition hover:text-paper" href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
