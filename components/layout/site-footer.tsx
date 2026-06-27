import Link from "next/link";

const legalLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund-policy", label: "Refunds" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-ink text-paper">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-acid">DanceGen AI</p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-paper/68">
            A conservative MVP for single-photo AI dance video generation. Public output stays low-risk,
            short, silent, watermarked, and review-gated.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3 text-sm text-paper/68 md:justify-end">
          {legalLinks.map((link) => (
            <Link className="rounded-full px-3 py-2 transition hover:bg-white/8 hover:text-paper" href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
          <a className="rounded-full px-3 py-2 transition hover:bg-white/8 hover:text-paper" href="mailto:abuse@dancegen.ai">
            Report abuse
          </a>
        </div>
      </div>
    </footer>
  );
}
