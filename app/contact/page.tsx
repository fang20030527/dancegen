import type { Metadata } from "next";
import { Mail, MessageCircle, ShieldCheck } from "lucide-react";

import { ContactForm } from "@/components/contact/contact-form";
import { Button } from "@/components/ui/button";
import { createPageMetadata, siteConfig } from "@/lib/site";

export const metadata: Metadata = createPageMetadata({
  title: "Contact",
  description:
    "Contact DanceClip AI for product support, billing questions, creator feedback, and safety or deletion requests.",
  path: "/contact",
});

const contactNotes = [
  {
    icon: MessageCircle,
    title: "Product feedback",
    text: "Share generator issues, template ideas, checkout questions, or account support details.",
  },
  {
    icon: ShieldCheck,
    title: "Safety requests",
    text: "For misuse, deletion, or impersonation reports, include the result URL or task ID when available.",
  },
];

export default function ContactPage() {
  return (
    <main className="bg-paper">
      <section className="border-b border-ink/10 py-14 md:py-20">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-cobalt">Contact</p>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-normal text-ink md:text-6xl">
              Reach the DanceClip AI team.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink/66 sm:text-lg">
              Send product feedback, billing questions, partnership notes, or safety requests to the DanceClip AI inbox.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild className="max-w-full whitespace-normal text-left sm:whitespace-nowrap" variant="dark">
                <a href={`mailto:${siteConfig.contactEmail}`}>
                  <Mail aria-hidden="true" className="shrink-0" size={17} />
                  <span className="min-w-0 break-all sm:break-normal">{siteConfig.contactEmail}</span>
                </a>
              </Button>
            </div>
            <div className="mt-10 grid gap-4">
              {contactNotes.map((note) => {
                const Icon = note.icon;

                return (
                  <div className="flex gap-4 border-t border-ink/10 pt-4" key={note.title}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-acid text-ink">
                      <Icon aria-hidden="true" size={19} />
                    </span>
                    <div>
                      <h2 className="text-base font-black text-ink">{note.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-ink/62">{note.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <ContactForm contactEmail={siteConfig.contactEmail} />
        </div>
      </section>
      <section className="bg-ink py-12 text-paper">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <h2 className="text-2xl font-black tracking-normal">Domain email</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-paper/66">
              Public contact address:{" "}
              <a
                className="break-all font-semibold text-paper underline decoration-acid decoration-2 underline-offset-4"
                href={`mailto:${siteConfig.contactEmail}`}
              >
                {siteConfig.contactEmail}
              </a>
            </p>
          </div>
          <Button asChild>
            <a href="/ai-dance-generator">Open generator</a>
          </Button>
        </div>
      </section>
    </main>
  );
}
