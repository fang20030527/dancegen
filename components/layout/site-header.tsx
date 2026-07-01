import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink text-paper backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="DanceGen home" className="relative block h-10 w-[158px] overflow-hidden">
          <Image
            alt="DanceGen"
            className="scale-[1.85] object-cover object-center invert"
            fill
            priority
            sizes="158px"
            src="/DanceGen.svg"
          />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <Link
              className="rounded-full px-3 py-2 text-sm font-semibold text-paper/78 transition hover:bg-white/10 hover:text-paper"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex max-w-[150px] items-center gap-2 rounded-full border border-white/14 bg-white/8 px-3 py-2 text-xs font-bold text-paper/78 shadow-sm sm:max-w-[220px]"
            title={authStatus.accountLabel ?? authStatus.statusLabel}
          >
            <span
              className={
                authStatus.isSignedIn ? "h-2 w-2 rounded-full bg-acid" : "h-2 w-2 rounded-full bg-white/32"
              }
              aria-hidden="true"
            />
            <span className="shrink-0">{authStatus.statusLabel}</span>
            {authStatus.accountLabel ? <span className="truncate text-paper">{authStatus.accountLabel}</span> : null}
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
