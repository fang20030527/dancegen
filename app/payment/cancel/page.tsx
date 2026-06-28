import Link from "next/link";
import { XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

type PaymentPageSearchParams = Record<string, string | string[] | undefined>;

type PaymentCancelPageProps = {
  searchParams?: Promise<PaymentPageSearchParams>;
};

const reasonCopy: Record<string, string> = {
  invalid_signature: "Creem returned payment details with an invalid signature, so no unlock was applied.",
  missing_signature: "Creem did not include a redirect signature, so no unlock was applied.",
  creem_configuration_error: "The Creem return handler is missing server configuration.",
  creem_return_error: "The Creem return handler could not verify the checkout result.",
};

export default async function PaymentCancelPage({ searchParams }: PaymentCancelPageProps) {
  const params = (await searchParams) || {};
  const reason = getParam(params, "reason");
  const body = reason ? reasonCopy[reason] || "No unlock was applied. Your watermarked preview remains available during the retention window." : null;

  return (
    <main className="bg-paper py-20">
      <section className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-coral text-white">
          <XCircle aria-hidden="true" size={30} />
        </div>
        <h1 className="mt-7 text-4xl font-black text-ink md:text-5xl">Payment canceled</h1>
        <p className="mt-4 text-base leading-7 text-ink/64">
          {body || "No unlock was applied. Your watermarked preview remains available during the retention window."}
        </p>
        <Button asChild className="mt-8" variant="dark">
          <Link href="/pricing">Return to pricing</Link>
        </Button>
      </section>
    </main>
  );
}

function getParam(params: PaymentPageSearchParams, key: string) {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
}
