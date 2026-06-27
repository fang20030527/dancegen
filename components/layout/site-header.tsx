import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/ai-dance-generator", label: "Generator" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/8 bg-paper/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-acid">
            <Sparkles aria-hidden="true" size={17} strokeWidth={2.2} />
          </span>
          DanceGen
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link
              className="rounded-full px-3 py-2 text-sm font-semibold text-ink/68 transition hover:bg-ink/5 hover:text-ink"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Button asChild size="sm">
          <Link href="/api/auth/google?redirectTo=/ai-dance-generator">Sign in</Link>
        </Button>
      </div>
    </header>
  );
}
