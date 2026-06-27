import type { Metadata } from "next";
import { Ban, ClipboardList, Coins, RefreshCcw, ShieldCheck, ToggleLeft } from "lucide-react";

const adminModules = [
  { title: "Task search", body: "Find generation jobs by user, task ID, provider job ID, status, and failure reason.", icon: ClipboardList },
  { title: "Entitlement ledger", body: "Review reservations, refunds, unlocks, subscriptions, compensation, and chargebacks.", icon: Coins },
  { title: "Manual retry", body: "Retry transfer, status polling, output review, or provider submission from a known state.", icon: RefreshCcw },
  { title: "User controls", body: "Freeze downloads, ban abusive accounts, and retain an appeal trail.", icon: Ban },
  { title: "Template controls", body: "Enable, disable, or pull risky templates without redeploying the public UI.", icon: ToggleLeft },
  { title: "Admin audit", body: "Record every sensitive operation with actor, target, reason, timestamp, and previous value.", icon: ShieldCheck },
];

export const metadata: Metadata = {
  title: "Internal Ops Console",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <main className="bg-paper py-16">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-black leading-tight tracking-normal text-ink md:text-6xl">Internal ops console</h1>
          <p className="mt-4 text-base leading-7 text-ink/64">
            The public navigation does not expose this route. Production access should require an admin allowlist and audited actions.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {adminModules.map((module) => {
            const Icon = module.icon;

            return (
              <article className="rounded-[24px] border border-ink/10 bg-white p-6 shadow-sm" key={module.title}>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-acid">
                  <Icon aria-hidden="true" size={22} />
                </div>
                <h2 className="mt-5 text-xl font-black text-ink">{module.title}</h2>
                <p className="mt-3 text-sm leading-6 text-ink/62">{module.body}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
