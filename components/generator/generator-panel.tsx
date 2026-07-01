"use client";

/* eslint-disable @next/next/no-img-element -- Blob preview URLs are user-selected local files, not remote optimized assets. */

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Download,
  FileWarning,
  ImageUp,
  Loader2,
  LockKeyhole,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { danceModelOptions, standardDanceModelId, type DanceModelId } from "@/lib/dance/models";
import type { AspectRatio, DanceGenerationTask, DanceTemplate, UploadReviewResult } from "@/lib/dance/types";
import { pricingPlans } from "@/lib/payments/pricing";
import { cn } from "@/lib/utils";

type ReviewState = "idle" | "reviewing" | "passed" | "rejected";
type GenerationState = "idle" | "submitting" | "processing" | "succeeded" | "error";

type GeneratorPanelProps = {
  templates: DanceTemplate[];
  compact?: boolean;
  hasCreatorMonthlyAccess?: boolean;
};

const aspectOptions: AspectRatio[] = ["9:16"];
const visibleTemplateCount = 4;
const templateVideoSources = [
  "/template-videos/template-2.mp4",
  "/template-videos/template-3.mp4",
  "/template-videos/template-4.mp4",
  "/template-videos/template-5.mp4",
  "/template-videos/template-6.mp4",
  "/template-videos/template-7.mp4",
  "/template-videos/template-8.mp4",
  "/template-videos/template-7-1.mp4",
];

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `dance_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getVisibleTemplateWindow(templates: DanceTemplate[], startIndex: number) {
  if (templates.length <= visibleTemplateCount) {
    return templates;
  }

  return Array.from({ length: visibleTemplateCount }, (_, offset) => templates[(startIndex + offset) % templates.length]);
}

function getTemplateVideoSource(templateIndex: number) {
  return templateVideoSources[templateIndex % templateVideoSources.length];
}

function isTerminalTask(task: DanceGenerationTask) {
  return task.status === "succeeded" || task.status === "failed_refunded" || task.status === "blocked_refunded";
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function GeneratorPanel({ templates, compact = false, hasCreatorMonthlyAccess = false }: GeneratorPanelProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? "hip-hop");
  const [templateWindowStart, setTemplateWindowStart] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [selectedModelId, setSelectedModelId] = useState<DanceModelId>(standardDanceModelId);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewState>("idle");
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [reviewResult, setReviewResult] = useState<UploadReviewResult | null>(null);
  const [task, setTask] = useState<DanceGenerationTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleTemplates = useMemo(() => getVisibleTemplateWindow(templates, templateWindowStart), [templateWindowStart, templates]);

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

  function handleModelSelect(modelId: DanceModelId) {
    setSelectedModelId(modelId);
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
    formData.append("modelId", selectedModelId);

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
        modelId: selectedModelId,
        uploadObjectKey: reviewResult?.uploadObjectKey,
        rightsConfirmed,
      }),
    });

    if (response.status === 401) {
      window.location.assign("/api/auth/google?redirectTo=/ai-dance-generator");
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setGenerationState("error");
      setError(payload?.message || "Generation could not start. Try another image or template.");
      return;
    }

    const { task: submittedTask } = (await response.json()) as { task: DanceGenerationTask };
    setTask(submittedTask);
    setGenerationState("processing");

    if (isTerminalTask(submittedTask)) {
      setGenerationState(submittedTask.status === "succeeded" ? "succeeded" : "error");
      return;
    }

    await pollGenerationTask(submittedTask.id);
  }

  async function pollGenerationTask(taskId: string) {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      await delay(attempt === 0 ? 1200 : 3000);

      const statusResponse = await fetch(`/api/dance/status/${taskId}`);
      const payload = (await statusResponse.json().catch(() => null)) as {
        message?: string;
        task?: DanceGenerationTask;
      } | null;

      if (!statusResponse.ok || !payload?.task) {
        setGenerationState("error");
        setError(payload?.message || "Generation status could not be loaded.");
        return;
      }

      setTask(payload.task);

      if (payload.task.status === "succeeded") {
        setGenerationState("succeeded");
        return;
      }

      if (payload.task.status === "failed_refunded" || payload.task.status === "blocked_refunded") {
        setGenerationState("error");
        setError(payload.task.failureReason || "Generation did not complete. Your generation should be refunded.");
        return;
      }
    }

    setGenerationState("error");
    setError("Generation is still processing. Check the task again in a few minutes.");
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

  function showNextTemplateWindow() {
    setTemplateWindowStart((currentIndex) => (templates.length ? (currentIndex + visibleTemplateCount) % templates.length : 0));
  }

  const canReview = Boolean(file) && rightsConfirmed && reviewState !== "reviewing";
  const canGenerate = reviewState === "passed" && generationState !== "submitting" && generationState !== "processing";
  const canMoveTemplates = templates.length > visibleTemplateCount;

  return (
    <section
      className={cn(
        "grid gap-6 rounded-[28px] border border-ink/10 bg-white/82 p-4 shadow-studio-soft backdrop-blur md:grid-cols-[0.92fr_1.08fr] md:p-6",
        compact && "shadow-none",
      )}
    >
      <label
        className="flex cursor-pointer rounded-[24px] border border-ink/10 bg-ink p-3 text-paper"
        htmlFor="source-photo-input"
      >
        <div className="relative min-h-[520px] flex-1 overflow-hidden rounded-[18px] bg-studio">
          {previewUrl ? (
            <img className="h-full min-h-[520px] w-full object-cover opacity-88" src={previewUrl} alt="Uploaded source preview" />
          ) : (
            <div className="studio-grid flex h-full min-h-[520px] flex-col items-center justify-center px-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-acid text-ink">
                <ImageUp aria-hidden="true" size={30} strokeWidth={1.9} />
              </div>
              <p className="text-2xl font-black leading-tight">Upload one clear adult solo photo</p>
              <p className="mt-3 max-w-xs text-sm leading-6 text-paper/58">
                Portrait or full-body images work best for 5-second silent dance clips.
              </p>
            </div>
          )}
        </div>
      </label>

      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-3xl font-black leading-tight tracking-normal text-ink md:text-4xl">
            Build a safe dance clip from one photo.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink/64">
            Choose a low-risk template, pass the upload pre-check, then generate a short watermarked preview.
          </p>
        </div>

        <input
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          id="source-photo-input"
          onChange={handleFileChange}
          type="file"
        />

        <div>
          <p className="mb-2 text-sm font-bold text-ink">Dance template</p>
          <div className="flex items-center gap-3">
            <div className="grid flex-1 grid-cols-4 gap-3">
              {visibleTemplates.map((template, index) => (
                <button
                  aria-label={`Select ${template.name} template`}
                  className={cn(
                    "relative aspect-[9/16] overflow-hidden rounded-[22px] border-2 border-ink/18 bg-ink transition hover:border-ink/40",
                    selectedTemplateId === template.id && "border-[3px] border-ink shadow-acid-ring",
                  )}
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  type="button"
                >
                  <video
                    autoPlay
                    className="h-full w-full object-cover"
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    src={getTemplateVideoSource(templateWindowStart + index)}
                  />
                  {selectedTemplateId === template.id ? (
                    <span
                      aria-hidden="true"
                      className="absolute right-2.5 top-2.5 h-3 w-3 rounded-full border border-ink/30 bg-acid shadow-[0_0_0_3px_rgba(198,255,0,0.28)]"
                    />
                  ) : null}
                </button>
              ))}
            </div>
            <button
              aria-label="Show next dance templates"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/12 bg-white text-ink shadow-sm transition hover:border-ink hover:bg-acid disabled:cursor-not-allowed disabled:opacity-35"
              disabled={!canMoveTemplates}
              onClick={showNextTemplateWindow}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={22} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-bold text-ink">Model</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {danceModelOptions.map((model) => {
              const isSelected = selectedModelId === model.id;
              const isLocked = model.tier === "member" && !hasCreatorMonthlyAccess;

              return (
                <button
                  aria-pressed={isSelected}
                  className={cn(
                    "flex min-h-[96px] flex-col items-start rounded-[18px] border border-ink/10 bg-paper p-4 text-left transition hover:border-ink/28 disabled:cursor-not-allowed disabled:opacity-52",
                    isSelected && "border-ink bg-acid text-ink shadow-acid-ring",
                  )}
                  disabled={isLocked}
                  key={model.id}
                  onClick={() => handleModelSelect(model.id)}
                  title={isLocked ? "Creator plan required" : model.name}
                  type="button"
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-black">{model.name}</span>
                    {model.tier === "member" ? (
                      <Badge className={cn("bg-white text-ink", isSelected && "border-ink/20")}>
                        {isLocked ? <LockKeyhole aria-hidden="true" size={13} /> : null}
                        Members
                      </Badge>
                    ) : null}
                  </span>
                  <span className="mt-2 text-xs font-semibold leading-5 text-ink/58">{model.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-bold text-ink">Aspect ratio</p>
          <div className="grid gap-2">
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
