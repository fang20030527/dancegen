import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PaymentSuccessPage() {
  return (
    <main className="bg-paper py-20">
      <section className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-acid text-ink">
          <CheckCircle2 aria-hidden="true" size={30} />
        </div>
        <h1 className="mt-7 text-4xl font-black text-ink md:text-5xl">Payment confirmed</h1>
        <p className="mt-4 text-base leading-7 text-ink/64">
          The Creem integration is stubbed for the web framework. Production will unlock HD after webhook verification and ledger write.
        </p>
        <Button asChild className="mt-8">
          <Link href="/ai-dance-generator">Back to generator</Link>
        </Button>
      </section>
    </main>
  );
}
