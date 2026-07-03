import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="bg-paper py-20">
      <section className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <h1 className="text-5xl font-black text-ink">Page not found</h1>
        <p className="mt-4 text-base leading-7 text-ink/64">The requested page is outside DanceClip AI.</p>
        <Button asChild className="mt-8">
          <Link href="/ai-dance-generator">Open generator</Link>
        </Button>
      </section>
    </main>
  );
}
