import Link from "next/link";
import { headers } from "next/headers";

import { BrandLogo } from "@/components/layout/brand-logo";
import { UserStatusMenu } from "@/components/layout/user-status-menu";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getHeaderAuthStatus } from "@/lib/auth-status";
import { getActiveSubscriptionPlanKey } from "@/lib/payments/entitlements";
import { getPlanAccountSummary, pricingDisplayPlans, type PricingPlanKey } from "@/lib/payments/pricing";

const navItems = [
  { href: "/ai-dance-generator", label: "Generator" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

function getHeaderPlanStatus(isSignedIn: boolean, activePlanKey: PricingPlanKey | null) {
  const freePlan = pricingDisplayPlans.find((plan) => plan.key === "free");
  const planSummary = getPlanAccountSummary(activePlanKey);

  if (!isSignedIn) {
    return {
      creditsLabel: "Sign in to view",
      planLabel: freePlan?.name ?? "Free",
    };
  }

  if (planSummary) {
    return planSummary;
  }

  return {
    creditsLabel: freePlan?.creditsLabel ?? "20 trial credits",
    planLabel: freePlan?.name ?? "Free",
  };
}

export async function SiteHeader() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const authStatus = getHeaderAuthStatus(session?.user);
  const activePlanKey = session?.user?.id ? await getActiveSubscriptionPlanKey(session.user.id) : null;
  const planStatus = getHeaderPlanStatus(authStatus.isSignedIn, activePlanKey);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink text-paper backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo priority />
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
          <UserStatusMenu
            accountLabel={authStatus.accountLabel}
            creditsLabel={planStatus.creditsLabel}
            isSignedIn={authStatus.isSignedIn}
            planLabel={planStatus.planLabel}
            statusLabel={authStatus.statusLabel}
          />
          {authStatus.isSignedIn ? null : (
            <Button asChild size="sm">
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- OAuth endpoints need document navigation, not App Router navigation. */}
              <a href="/api/auth/google?redirectTo=/ai-dance-generator">Sign in</a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
