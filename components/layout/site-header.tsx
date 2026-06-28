import Link from "next/link";
import { headers } from "next/headers";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getHeaderAuthStatus } from "@/lib/auth-status";

const navItems = [
  { href: "/ai-dance-generator", label: "Generator" },
  { href: "/pricing", label: "Pricing" },
];

export async function SiteHeader() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const authStatus = getHeaderAuthStatus(session?.user);

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
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex max-w-[150px] items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-3 py-2 text-xs font-bold text-ink/72 shadow-sm sm:max-w-[220px]"
            title={authStatus.accountLabel ?? authStatus.statusLabel}
          >
            <span
              className={
                authStatus.isSignedIn ? "h-2 w-2 rounded-full bg-moss" : "h-2 w-2 rounded-full bg-ink/28"
              }
              aria-hidden="true"
            />
            <span className="shrink-0">{authStatus.statusLabel}</span>
            {authStatus.accountLabel ? <span className="truncate text-ink">{authStatus.accountLabel}</span> : null}
          </div>
          <Button asChild size="sm">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- OAuth endpoints need document navigation, not App Router navigation. */}
            <a href="/api/auth/google?redirectTo=/ai-dance-generator">Sign in</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
