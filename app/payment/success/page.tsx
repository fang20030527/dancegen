import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type PaymentPageSearchParams = Record<string, string | string[] | undefined>;

type PaymentSuccessPageProps = {
  searchParams?: Promise<PaymentPageSearchParams>;
};

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const params = (await searchParams) || {};
  const verified = getParam(params, "verified") === "1";
  const checkoutId = getParam(params, "checkoutId");

  return (
    <main className="bg-paper py-20">
      <section className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-acid text-ink">
          <CheckCircle2 aria-hidden="true" size={30} />
        </div>
        <h1 className="mt-7 text-4xl font-black text-ink md:text-5xl">Payment confirmed</h1>
        <p className="mt-4 text-base leading-7 text-ink/64">
          {verified
            ? "Creem returned a verified checkout confirmation. The webhook ledger is the source of truth for unlocking HD access."
            : "Your payment status is being checked. The webhook ledger is the source of truth for unlocking HD access."}
        </p>
        {checkoutId ? <p className="mt-3 text-sm font-semibold text-ink/50">Checkout {checkoutId}</p> : null}
        <Button asChild className="mt-8">
          <Link href="/ai-dance-generator">Back to generator</Link>
        </Button>
      </section>
    </main>
  );
}

function getParam(params: PaymentPageSearchParams, key: string) {
  const value = params[key];

  return Array.isArray(value) ? value[0] : value;
}
