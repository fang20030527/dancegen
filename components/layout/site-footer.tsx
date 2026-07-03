import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";
import { siteConfig } from "@/lib/site";

const footerLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/acceptable-use", label: "Acceptable use" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund-policy", label: "Refunds" },
  { href: `mailto:${siteConfig.supportEmail}`, label: "Support" },
  { href: `mailto:${siteConfig.abuseEmail}`, label: "Report abuse" },
];

export function SiteFooter() {
  return (
    <footer className="border-t-4 border-neutral-700 bg-ink text-paper">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[360px_1fr] md:items-start">
          <BrandLogo size="footer" />
          <div className="max-w-3xl">
            <h2 className="text-3xl font-black leading-tight tracking-normal text-paper sm:text-4xl">
              Photo to AI dance video generator.
            </h2>
            <p className="mt-4 text-base leading-7 text-paper/70 sm:text-lg">
              DanceClip AI helps creators turn a single adult solo photo into short 9:16 AI dance clips for TikTok,
              Reels, and Shorts. Upload a clear solo photo, choose a template, and generate a silent preview
              in seconds. The public workflow focuses on authorized adult solo photos, conservative motion templates,
              watermark previews, and credit returns when a model run fails or is safety-blocked.
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
