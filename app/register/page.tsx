import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { RegisterTurnstileForm } from "@/components/auth/register-turnstile-form";
import { auth } from "@/lib/auth";
import { getSafeAuthCallbackPath } from "@/lib/auth-oauth";
import { createPageMetadata, siteConfig } from "@/lib/site";
import { getTurnstileSiteKey } from "@/lib/turnstile";

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = createPageMetadata({
  title: "Register",
  description: "Create or access your DanceClip AI account after Cloudflare Turnstile human verification.",
  path: "/register",
});

const registerErrorMessages: Record<string, string> = {
  turnstile_failed: "Human verification failed. Please try again.",
  turnstile_not_configured: "Human verification is not configured yet.",
  turnstile_required: "Complete the human verification before continuing with Google.",
  turnstile_expired: "Human verification expired or was already used. Complete the check again.",
  turnstile_unavailable: "Human verification is temporarily unavailable. Please try again.",
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const redirectTo = getRegisterRedirectPath(params);
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.id) {
    redirect(redirectTo);
  }

  const errorMessage = getRegisterErrorMessage(params);

  return (
    <main className="bg-paper">
      <section className="border-b border-ink/10 py-14 md:py-20">
        <div className="mx-auto grid max-w-[1040px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-cobalt">Register</p>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-normal text-ink md:text-6xl">
              Start with a quick human check.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink/66 sm:text-lg">
              DanceClip AI uses Cloudflare Turnstile before Google account registration to reduce automated abuse while keeping sign-up fast.
            </p>
          </div>
          <RegisterTurnstileForm errorMessage={errorMessage} redirectTo={redirectTo} siteKey={getTurnstileSiteKey()} />
        </div>
      </section>
      <section className="bg-ink py-10 text-paper">
        <div className="mx-auto max-w-[1040px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-black tracking-normal">Protected registration</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-paper/66">
            Turnstile validates the browser session server-side before we send you to Google OAuth for {siteConfig.name}.
          </p>
        </div>
      </section>
    </main>
  );
}

function getRegisterRedirectPath(params: Record<string, string | string[] | undefined>) {
  const pageUrl = new URL("/register", siteConfig.url);
  const redirectTo = getFirstParam(params.redirectTo);

  if (redirectTo) {
    pageUrl.searchParams.set("redirectTo", redirectTo);
  }

  return getSafeAuthCallbackPath(pageUrl);
}

function getRegisterErrorMessage(params: Record<string, string | string[] | undefined>) {
  const error = getFirstParam(params.error);

  return error ? registerErrorMessages[error] : undefined;
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
