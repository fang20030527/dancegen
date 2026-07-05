"use client";

import { Send } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";

type ContactFormProps = {
  contactEmail: string;
};

type SubmitState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

const initialSubmitState: SubmitState = {
  status: "idle",
  message: "",
};

export function ContactForm({ contactEmail }: ContactFormProps) {
  const [submitState, setSubmitState] = useState<SubmitState>(initialSubmitState);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    setSubmitState({ status: "submitting", message: "" });

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: getFormValue(formData, "name"),
        email: getFormValue(formData, "email"),
        subject: getFormValue(formData, "subject"),
        message: getFormValue(formData, "message"),
        company: getFormValue(formData, "company"),
      }),
    });

    if (response.ok) {
      form.reset();
      setSubmitState({
        status: "success",
        message: "Message sent. We will reply from the DanceClip AI inbox.",
      });
      return;
    }

    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    setSubmitState({
      status: "error",
      message: body?.message || `Message failed. Email ${contactEmail} directly.`,
    });
  }

  const isSubmitting = submitState.status === "submitting";

  return (
    <form className="rounded-lg border border-ink/10 bg-white p-5 shadow-studio-soft sm:p-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Name
          <input
            className="min-h-12 rounded-md border border-ink/12 bg-paper px-3 text-base font-medium text-ink outline-none transition placeholder:text-ink/38 focus:border-cobalt focus:bg-white focus:ring-2 focus:ring-cobalt/20"
            maxLength={80}
            name="name"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Email
          <input
            className="min-h-12 rounded-md border border-ink/12 bg-paper px-3 text-base font-medium text-ink outline-none transition placeholder:text-ink/38 focus:border-cobalt focus:bg-white focus:ring-2 focus:ring-cobalt/20"
            maxLength={254}
            name="email"
            required
            type="email"
          />
        </label>
      </div>
      <label className="mt-4 grid gap-2 text-sm font-semibold text-ink">
        Subject
        <input
          className="min-h-12 rounded-md border border-ink/12 bg-paper px-3 text-base font-medium text-ink outline-none transition placeholder:text-ink/38 focus:border-cobalt focus:bg-white focus:ring-2 focus:ring-cobalt/20"
          maxLength={120}
          name="subject"
          required
        />
      </label>
      <label className="mt-4 grid gap-2 text-sm font-semibold text-ink">
        Message
        <textarea
          className="min-h-40 resize-y rounded-md border border-ink/12 bg-paper px-3 py-3 text-base font-medium leading-6 text-ink outline-none transition placeholder:text-ink/38 focus:border-cobalt focus:bg-white focus:ring-2 focus:ring-cobalt/20"
          maxLength={4000}
          name="message"
          required
        />
      </label>
      <label aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        Company
        <input autoComplete="off" name="company" tabIndex={-1} />
      </label>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className={`min-h-6 text-sm font-medium ${
            submitState.status === "error" ? "text-coral" : "text-ink/60"
          }`}
        >
          {submitState.message}
        </p>
        <Button className="shrink-0" disabled={isSubmitting} type="submit" variant="dark">
          <Send aria-hidden="true" size={16} />
          {isSubmitting ? "Sending" : "Send message"}
        </Button>
      </div>
    </form>
  );
}

function getFormValue(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}
