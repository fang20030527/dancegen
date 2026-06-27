import type { ReactNode } from "react";

type LegalShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function LegalShell({ title, description, children }: LegalShellProps) {
  return (
    <main className="bg-paper py-16">
      <article className="prose prose-zinc mx-auto max-w-3xl px-4 prose-headings:font-black prose-a:text-ink sm:px-6 lg:px-8">
        <h1>{title}</h1>
        <p className="lead">{description}</p>
        {children}
        <hr />
        <h2>Complaints and deletion</h2>
        <p>
          To report misuse, request deletion, or freeze a download, email{" "}
          <a href="mailto:abuse@dancegen.ai">abuse@dancegen.ai</a> with the result URL or task ID. Reported downloads
          should be frozen before manual review in production.
        </p>
      </article>
    </main>
  );
}
