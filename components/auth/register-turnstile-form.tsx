"use client";

import { useCallback, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { Button } from "@/components/ui/button";

type RegisterTurnstileFormProps = {
  errorMessage?: string;
  redirectTo: string;
  siteKey: string;
};

export function RegisterTurnstileForm({ errorMessage, redirectTo, siteKey }: RegisterTurnstileFormProps) {
  const [turnstileToken, setTurnstileToken] = useState("");
  const handleTokenChange = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);
  const isConfigured = siteKey.length > 0;
  const canContinue = isConfigured && turnstileToken.length > 0;

  return (
    <form action="/api/auth/register" className="rounded-lg border border-ink/10 bg-white p-5 shadow-studio-soft sm:p-6" method="post">
      <input name="redirectTo" readOnly type="hidden" value={redirectTo} />
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-acid text-ink">
          <ShieldCheck aria-hidden="true" size={21} />
        </span>
        <div>
          <h2 className="text-xl font-black text-ink">Verify before continuing</h2>
          <p className="mt-2 text-sm leading-6 text-ink/62">
            Complete the Cloudflare Turnstile check, then continue with Google to create or access your DanceClip AI account.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-ink/10 bg-paper p-4">
        {isConfigured ? (
          <TurnstileWidget onTokenChange={handleTokenChange} siteKey={siteKey} />
        ) : (
          <p className="text-sm font-semibold leading-6 text-coral">
            Cloudflare Turnstile is not configured yet. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY before enabling registration.
          </p>
        )}
      </div>

      {errorMessage ? <p className="mt-4 text-sm font-semibold leading-6 text-coral">{errorMessage}</p> : null}

      <Button className="mt-6 w-full" disabled={!canContinue} type="submit" variant="dark">
        Continue with Google
        <ArrowRight aria-hidden="true" size={17} />
      </Button>
    </form>
  );
}
