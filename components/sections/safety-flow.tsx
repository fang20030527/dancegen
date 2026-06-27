import { CheckCircle2, EyeOff, RotateCcw, ShieldAlert } from "lucide-react";

const safetySteps = [
  {
    title: "Input review",
    body: "Reject minors, public figures, group images, explicit clothing, anime, and uncertain photos before generation.",
    icon: ShieldAlert,
  },
  {
    title: "Reserved generation",
    body: "A generation is reserved first, then refunded automatically if the model fails, times out, or safety blocks output.",
    icon: RotateCcw,
  },
  {
    title: "Output review",
    body: "Completed videos are checked before preview, download, or unlock surfaces become available.",
    icon: EyeOff,
  },
  {
    title: "Audit trail",
    body: "Tasks, provider job IDs, costs, latency, payments, compensation, and admin actions are designed for review.",
    icon: CheckCircle2,
  },
];

export function SafetyFlow() {
  return (
    <section className="bg-ink py-20 text-paper">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-4xl font-black leading-tight tracking-normal md:text-5xl">Safety is the product boundary.</h2>
            <p className="mt-4 text-base leading-7 text-paper/64">
              The MVP is built around conservative refusal, resumable tasks, and entitlement refunds.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {safetySteps.map((step) => {
              const Icon = step.icon;

              return (
                <article className="rounded-[24px] border border-white/10 bg-white/6 p-5" key={step.title}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-acid text-ink">
                    <Icon aria-hidden="true" size={20} />
                  </div>
                  <h3 className="mt-5 text-lg font-black">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-paper/62">{step.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
