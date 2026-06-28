"use client";

/* eslint-disable @next/next/no-img-element -- Blob preview URLs are user-selected local files, not remote optimized assets. */

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clapperboard,
  Download,
  FileWarning,
  ImageUp,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AspectRatio, DanceGenerationTask, DanceTemplate, UploadReviewResult } from "@/lib/dance/types";
import { pricingPlans } from "@/lib/payments/pricing";
import { cn } from "@/lib/utils";

type ReviewState = "idle" | "reviewing" | "passed" | "rejected";
type GenerationState = "idle" | "submitting" | "processing" | "succeeded" | "error";

type GeneratorPanelProps = {
  templates: DanceTemplate[];
  compact?: boolean;
};

const aspectOptions: AspectRatio[] = ["9:16", "1:1", "16:9"];

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `dance_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function GeneratorPanel({ templates, compact = false }: GeneratorPanelProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? "hip-hop");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewState>("idle");
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [reviewResult, setReviewResult] = useState<UploadReviewResult | null>(null);
  const [task, setTask] = useState<DanceGenerationTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId, templates],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
    setReviewState("idle");
    setReviewResult(null);
    setTask(null);
    setGenerationState("idle");
    setError(null);
  }

  async function reviewUpload() {
    if (!file) {
      setError("Upload a clear solo photo first.");
      return;
    }

    setReviewState("reviewing");
    setError(null);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("rightsConfirmed", String(rightsConfirmed));

    const response = await fetch("/api/review/upload", {
      method: "POST",
      body: formData,
    });
    const result = (await response.json()) as UploadReviewResult;

    setReviewResult(result);
    setReviewState(result.allowed ? "passed" : "rejected");
  }

  async function submitGeneration() {
    if (reviewState !== "passed") {
      await reviewUpload();
      return;
    }

    setGenerationState("submitting");
    setError(null);

    const response = await fetch("/api/dance/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: createIdempotencyKey(),
        templateId: selectedTemplateId,
        aspectRatio,
        rightsConfirmed,
      }),
    });

    if (response.status === 401) {
      window.location.href = "/api/auth/google?redirectTo=/ai-dance-generator";
      return;
    }

    if (!response.ok) {
      setGenerationState("error");
      setError("Generation could not start. Try another image or template.");
      return;
    }

    const { task: submittedTask } = (await response.json()) as { task: DanceGenerationTask };
    setTask(submittedTask);
    setGenerationState("processing");

    window.setTimeout(async () => {
      const statusResponse = await fetch(`/api/dance/status/${submittedTask.id}`);
      const { task: completedTask } = (await statusResponse.json()) as { task: DanceGenerationTask };
      setTask(completedTask);
      setGenerationState("succeeded");
    }, 900);
  }

  async function startCheckout() {
    const response = await fetch("/api/payments/creem/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceKey: pricingPlans.singleUnlock.key,
        taskId: task?.id,
      }),
    });
    const payload = (await response.json().catch(() => null)) as { checkoutUrl?: string; message?: string } | null;

    if (!response.ok || !payload?.checkoutUrl) {
      setError(payload?.message || "Checkout could not start. Please try again.");
      return;
    }

    window.location.href = payload.checkoutUrl;
  }

  const canReview = Boolean(file) && rightsConfirmed && reviewState !== "reviewing";
  const canGenerate = reviewState === "passed" && generationState !== "submitting" && generationState !== "processing";

  return (
    <section
      className={cn(
        "grid gap-6 rounded-[28px] border border-ink/10 bg-white/82 p-4 shadow-studio-soft backdrop-blur md:grid-cols-[0.92fr_1.08fr] md:p-6",
        compact && "shadow-none",
      )}
    >
      <div className="rounded-[24px] border border-ink/10 bg-ink p-3 text-paper">
        <div className="relative min-h-[520px] overflow-hidden rounded-[18px] bg-studio">
          {previewUrl ? (
            <img className="h-[520px] w-full object-cover opacity-88" src={previewUrl} alt="Uploaded source preview" />
          ) : (
            <div className="studio-grid flex h-[520px] flex-col items-center justify-center px-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-acid text-ink">
                <ImageUp aria-hidden="true" size={30} strokeWidth={1.9} />
              </div>
              <p className="text-2xl font-black leading-tight">Upload one clear adult solo photo</p>
              <p className="mt-3 max-w-xs text-sm leading-6 text-paper/58">
                Portrait or full-body images work best for 5-second silent dance clips.
              </p>
            </div>
          )}

          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <Badge className="border-white/18 bg-black/45 text-paper">5s silent MP4</Badge>
            <Badge className="border-white/18 bg-black/45 text-paper">Watermarked preview</Badge>
          </div>

          <div className="absolute bottom-4 left-4 right-4 rounded-[18px] border border-white/15 bg-black/58 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-acid">Current template</p>
                <p className="mt-1 text-lg font-black">{selectedTemplate?.name}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-acid text-ink">
                {generationState === "processing" ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={22} />
                ) : (
                  <Clapperboard aria-hidden="true" size={22} />
                )}
              </div>
            </div>
            {task?.previewUrl && generationState === "succeeded" ? (
              <div className="mt-3 flex items-center gap-2 rounded-full bg-acid px-3 py-2 text-xs font-black text-ink">
                <CheckCircle2 aria-hidden="true" size={16} /> Preview generated and awaiting HD unlock
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-ink">
            <ShieldCheck aria-hidden="true" size={18} />
            Conservative input gate
          </div>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-normal text-ink md:text-4xl">
            Build a safe dance clip from one photo.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink/64">
            Choose a low-risk template, pass the upload pre-check, then generate a short watermarked preview.
          </p>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">Source photo</span>
          <input
            accept="image/png,image/jpeg,image/webp"
            className="block w-full rounded-2xl border border-ink/12 bg-paper p-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-bold file:text-paper hover:border-ink/26 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ink"
            onChange={handleFileChange}
            type="file"
          />
        </label>

        <div>
          <p className="mb-2 text-sm font-bold text-ink">Dance template</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {templates.map((template) => (
              <button
                className={cn(
                  "rounded-2xl border border-ink/10 bg-paper p-3 text-left text-sm font-bold transition hover:border-ink/28",
                  selectedTemplateId === template.id && "border-ink bg-ink text-paper shadow-acid-ring",
                )}
                key={template.id}
                onClick={() => setSelectedTemplateId(template.id)}
                type="button"
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-bold text-ink">Aspect ratio</p>
          <div className="grid grid-cols-3 gap-2">
            {aspectOptions.map((option) => (
              <button
                className={cn(
                  "rounded-full border border-ink/10 bg-paper px-4 py-3 text-sm font-black transition hover:border-ink/28",
                  aspectRatio === option && "border-ink bg-acid text-ink",
                )}
                key={option}
                onClick={() => setAspectRatio(option)}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-paper p-4 text-sm leading-6 text-ink/72">
          <input
            checked={rightsConfirmed}
            className="mt-1 h-4 w-4 accent-ink"
            onChange={(event) => setRightsConfirmed(event.target.checked)}
            type="checkbox"
          />
          <span>
            I own the image rights and confirm this is not a minor, public figure, group photo, anime character, nude,
            swimwear, or underwear image.
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button disabled={!canReview} onClick={reviewUpload} type="button" variant="outline">
            {reviewState === "reviewing" ? <Loader2 aria-hidden="true" className="animate-spin" size={18} /> : null}
            Run pre-check
          </Button>
          <Button disabled={!canGenerate} onClick={submitGeneration} type="button">
            {generationState === "submitting" || generationState === "processing" ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={18} />
            ) : (
              <LockKeyhole aria-hidden="true" size={18} />
            )}
            Generate
          </Button>
        </div>

        {reviewResult ? (
          <div
            className={cn(
              "flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6",
              reviewResult.allowed
                ? "border-moss/20 bg-moss/8 text-moss"
                : "border-coral/25 bg-coral/8 text-[#9c2416]",
            )}
          >
            {reviewResult.allowed ? <CheckCircle2 aria-hidden="true" size={20} /> : <FileWarning aria-hidden="true" size={20} />}
            <span>{reviewResult.userMessage}</span>
          </div>
        ) : null}

        {error ? <div className="rounded-2xl border border-coral/25 bg-coral/8 p-4 text-sm font-semibold text-[#9c2416]">{error}</div> : null}

        {generationState === "succeeded" && task ? (
          <div className="rounded-[24px] border border-ink/10 bg-paper p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-ink">Preview ready</p>
                <p className="mt-1 text-sm leading-6 text-ink/62">
                  Task {task.id} passed output review. HD/no-watermark download uses single-video unlock.
                </p>
              </div>
              <Badge>{task.status}</Badge>
            </div>
            <Button className="mt-4 w-full" onClick={startCheckout} type="button" variant="dark">
              <Download aria-hidden="true" size={18} />
              Unlock HD
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
