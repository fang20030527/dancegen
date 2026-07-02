"use client";

/* eslint-disable @next/next/no-img-element -- Blob preview URLs are user-selected local files, not remote optimized assets. */

import { ChangeEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Download,
  Film,
  FileWarning,
  ImageUp,
  LinkIcon,
  Loader2,
  LockKeyhole,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { danceModelOptions, standardDanceModelId, type DanceModelId } from "@/lib/dance/models";
import { referenceImages, type ReferenceImage } from "@/lib/dance/reference-images";
import type { AspectRatio, DanceGenerationTask, DanceTemplate, UploadReviewResult } from "@/lib/dance/types";
import { pricingPlans, type PricingPlanKey } from "@/lib/payments/pricing";
import { cn } from "@/lib/utils";

type ReviewState = "idle" | "reviewing" | "passed" | "rejected";
type GenerationState = "idle" | "submitting" | "processing" | "succeeded" | "error";
type AssetTab = "library" | "upload" | "url";

type GeneratorPanelProps = {
  templates: DanceTemplate[];
  compact?: boolean;
  hasCreatorMonthlyAccess?: boolean;
};

const aspectOptions: AspectRatio[] = ["9:16"];
const visibleTemplateCount = 4;
const visibleReferenceImageCount = 4;
const assetTabs: AssetTab[] = ["library", "upload", "url"];

const assetTabLabels: Record<AssetTab, string> = {
  library: "Library",
  upload: "Upload",
  url: "URL",
};

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

function getVisibleReferenceImageWindow(images: ReferenceImage[], startIndex: number) {
  if (images.length <= visibleReferenceImageCount) {
    return images;
  }

  return Array.from({ length: visibleReferenceImageCount }, (_, offset) => images[(startIndex + offset) % images.length]);
}

function isTerminalTask(task: DanceGenerationTask) {
  return task.status === "succeeded" || task.status === "failed_refunded" || task.status === "blocked_refunded";
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function AssetTabs({ activeTab, onChange }: { activeTab: AssetTab; onChange: (tab: AssetTab) => void }) {
  return (
    <div className="grid grid-cols-3 rounded-[16px] bg-white/8 p-1 text-sm font-black text-paper/52">
      {assetTabs.map((tab) => (
        <button
          className={cn(
            "rounded-[12px] px-3 py-2 transition hover:text-paper",
            activeTab === tab && "bg-acid text-ink hover:text-ink",
          )}
          key={tab}
          onClick={() => onChange(tab)}
          type="button"
        >
          {assetTabLabels[tab]}
        </button>
      ))}
    </div>
  );
}

function AssetPlaceholder({
  body,
  icon,
  title,
}: {
  body: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex min-h-[136px] flex-col items-center justify-center rounded-[18px] border border-dashed border-paper/24 bg-[#111110] px-4 py-5 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/10 text-paper/66">{icon}</div>
      <p className="text-sm font-black text-paper">{title}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-paper/42">{body}</p>
    </div>
  );
}

export function GeneratorPanel({ templates, compact = false, hasCreatorMonthlyAccess = false }: GeneratorPanelProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? "hip-hop");
  const [templateWindowStart, setTemplateWindowStart] = useState(0);
  const [referenceImageWindowStart, setReferenceImageWindowStart] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [selectedModelId, setSelectedModelId] = useState<DanceModelId>(standardDanceModelId);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedReferenceImageId, setSelectedReferenceImageId] = useState<string | null>(null);
  const [loadingReferenceImageId, setLoadingReferenceImageId] = useState<string | null>(null);
  const rightsConfirmed = true;
  const [reviewState, setReviewState] = useState<ReviewState>("idle");
  const [generationState, setGenerationState] = useState<GenerationState>("idle");
  const [reviewResult, setReviewResult] = useState<UploadReviewResult | null>(null);
  const [task, setTask] = useState<DanceGenerationTask | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelUnlockPrompt, setModelUnlockPrompt] = useState<string | null>(null);
  const [sourceAssetTab, setSourceAssetTab] = useState<AssetTab>("library");
  const [templateAssetTab, setTemplateAssetTab] = useState<AssetTab>("library");
  const [sourceUrl, setSourceUrl] = useState("");
  const [templateUrl, setTemplateUrl] = useState("");

  const visibleTemplates = useMemo(() => getVisibleTemplateWindow(templates, templateWindowStart), [templateWindowStart, templates]);
  const visibleReferenceImages = useMemo(
    () => getVisibleReferenceImageWindow(referenceImages, referenceImageWindowStart),
    [referenceImageWindowStart],
  );
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId, templates],
  );
  const previewVideoPath = task?.previewUrl || task?.watermarkedUrl || selectedTemplate?.videoPath;

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
    setSelectedReferenceImageId(null);
    setLoadingReferenceImageId(null);
    setSourceAssetTab("upload");
    setReviewState("idle");
    setReviewResult(null);
    setTask(null);
    setGenerationState("idle");
    setError(null);
  }

  async function handleReferenceImageSelect(referenceImage: ReferenceImage) {
    setLoadingReferenceImageId(referenceImage.id);
    setError(null);

    try {
      const response = await fetch(referenceImage.src);

      if (!response.ok) {
        throw new Error("Reference image could not be loaded.");
      }

      const blob = await response.blob();
      const nextFile = new File([blob], referenceImage.filename, { type: blob.type || "image/png" });

      setFile(nextFile);
      setPreviewUrl(URL.createObjectURL(nextFile));
      setSelectedReferenceImageId(referenceImage.id);
      setSourceAssetTab("library");
      setReviewState("idle");
      setReviewResult(null);
      setTask(null);
      setGenerationState("idle");
      setError(null);
    } catch {
      setError("Reference image could not be loaded. Try uploading it manually.");
    } finally {
      setLoadingReferenceImageId(null);
    }
  }

  function handleModelSelect(modelId: DanceModelId) {
    setSelectedModelId(modelId);
    setReviewState("idle");
    setReviewResult(null);
    setTask(null);
    setGenerationState("idle");
    setError(null);
    setModelUnlockPrompt(null);
  }

  function promptModelSubscription(modelName: string) {
    setError(null);
    setModelUnlockPrompt(`Subscribe to Creator to unlock ${modelName}.`);
  }

  async function reviewUpload() {
    if (!file) {
      setError("Upload a clear solo photo first.");
      return null;
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
    return result;
  }

  async function submitGeneration() {
    const approvedReviewResult =
      reviewState === "passed" && reviewResult?.allowed ? reviewResult : await reviewUpload();

    if (!approvedReviewResult?.allowed) {
      return;
    }

    setGenerationState("submitting");
    setError(null);

    const formData = new FormData();
    formData.append("idempotencyKey", createIdempotencyKey());
    formData.append("templateId", selectedTemplateId);
    formData.append("aspectRatio", aspectRatio);
    formData.append("modelId", selectedModelId);
    formData.append("rightsConfirmed", String(rightsConfirmed));

    if (approvedReviewResult.uploadObjectKey) {
      formData.append("uploadObjectKey", approvedReviewResult.uploadObjectKey);
    }

    if (file) {
      formData.append("image", file);
    }

    const response = await fetch("/api/dance/generate", {
      method: "POST",
      body: formData,
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

  async function startCheckout(priceKey: PricingPlanKey = pricingPlans.singleUnlock.key) {
    const response = await fetch("/api/payments/creem/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceKey,
        taskId: priceKey === pricingPlans.singleUnlock.key ? task?.id : undefined,
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

  function showNextReferenceImageWindow() {
    setReferenceImageWindowStart((currentIndex) =>
      referenceImages.length ? (currentIndex + visibleReferenceImageCount) % referenceImages.length : 0,
    );
  }

  const isGenerating = generationState === "submitting" || generationState === "processing";
  const isGenerateBusy = reviewState === "reviewing" || isGenerating;
  const canGenerate = Boolean(file) && !isGenerateBusy && !loadingReferenceImageId;
  const canMoveReferenceImages = referenceImages.length > visibleReferenceImageCount;
  const canMoveTemplates = templates.length > visibleTemplateCount;

  return (
    <section
      className={cn(
        "mx-auto grid w-full gap-6 rounded-[28px] border border-ink/10 bg-white/82 p-4 shadow-studio-soft backdrop-blur md:grid-cols-[minmax(280px,380px)_1fr] md:p-6",
        compact && "shadow-none",
      )}
    >
      <div className="flex self-start rounded-[24px] border border-ink/10 bg-ink p-3 text-paper">
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[18px] bg-studio">
          {previewVideoPath ? (
            <video
              key={previewVideoPath}
              autoPlay
              className="h-full w-full object-cover"
              loop
              muted
              playsInline
              preload="metadata"
              src={previewVideoPath}
            />
          ) : (
            <div className="studio-grid flex h-full flex-col items-center justify-center px-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-acid text-ink">
                <Film aria-hidden="true" size={30} strokeWidth={1.9} />
              </div>
              <p className="text-2xl font-black leading-tight">Video preview</p>
              <p className="mt-3 max-w-xs text-sm leading-6 text-paper/58">Choose a template to preview the motion.</p>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-full border border-paper/10 bg-ink/72 px-4 py-2 text-xs font-bold text-paper/76 backdrop-blur">
            <span>{generationState === "succeeded" ? "Generated preview" : selectedTemplate?.name || "Template preview"}</span>
            <span>{aspectRatio}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <input
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          id="source-photo-input"
          onChange={handleFileChange}
          type="file"
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-[22px] bg-ink p-3 text-paper">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-black">Reference Image</p>
            </div>
            <AssetTabs activeTab={sourceAssetTab} onChange={setSourceAssetTab} />
            <div className="mt-3">
              {sourceAssetTab === "library" ? (
                referenceImages.length ? (
                  <div className="flex items-center gap-2">
                    <div className="grid flex-1 grid-cols-4 gap-1.5">
                      {visibleReferenceImages.map((referenceImage) => {
                        const isSelected = selectedReferenceImageId === referenceImage.id;
                        const isLoading = loadingReferenceImageId === referenceImage.id;

                        return (
                          <button
                            aria-label={`Select ${referenceImage.label}`}
                            aria-pressed={isSelected}
                            className={cn(
                              "relative aspect-[3/4] overflow-hidden rounded-[12px] border-2 border-paper/16 bg-black transition hover:border-paper/44 disabled:cursor-wait disabled:opacity-75",
                              isSelected && "border-[3px] border-acid shadow-acid-ring",
                            )}
                            disabled={Boolean(loadingReferenceImageId)}
                            key={referenceImage.id}
                            onClick={() => handleReferenceImageSelect(referenceImage)}
                            type="button"
                          >
                            <img
                              alt={referenceImage.label}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              src={referenceImage.src}
                            />
                            {isLoading ? (
                              <span className="absolute inset-0 flex items-center justify-center bg-ink/58 text-acid backdrop-blur-sm">
                                <Loader2 aria-hidden="true" className="animate-spin" size={22} />
                              </span>
                            ) : null}
                            {isSelected ? (
                              <span
                                aria-hidden="true"
                                className="absolute right-2 top-2 h-3 w-3 rounded-full border border-ink/30 bg-acid shadow-[0_0_0_3px_rgba(198,255,0,0.28)]"
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      aria-label="Show next reference images"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-paper/12 bg-white/8 text-paper shadow-sm transition hover:border-acid hover:bg-acid hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
                      disabled={!canMoveReferenceImages || Boolean(loadingReferenceImageId)}
                      onClick={showNextReferenceImageWindow}
                      type="button"
                    >
                      <ChevronRight aria-hidden="true" size={18} strokeWidth={2.4} />
                    </button>
                  </div>
                ) : (
                  <AssetPlaceholder
                    body="Choose from library"
                    icon={<ImageUp aria-hidden="true" size={22} strokeWidth={1.9} />}
                    title="Select Reference"
                  />
                )
              ) : null}
              {sourceAssetTab === "upload" ? (
                <label
                  className="flex min-h-[136px] cursor-pointer items-center gap-3 rounded-[18px] border border-dashed border-paper/24 bg-[#111110] p-3 transition hover:border-acid/70"
                  htmlFor="source-photo-input"
                >
                  {previewUrl ? (
                    <img
                      alt="Uploaded reference"
                      className="aspect-[3/4] w-20 shrink-0 rounded-[14px] object-cover"
                      src={previewUrl}
                    />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-white/10 text-paper/66">
                      <Upload aria-hidden="true" size={24} strokeWidth={1.9} />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-paper">
                      {file ? file.name : "Upload reference photo"}
                    </span>
                    <span className="mt-1 block text-xs font-semibold leading-5 text-paper/42">
                      Full-body, front-facing photos work best for smooth AI dance motion.
                    </span>
                  </span>
                </label>
              ) : null}
              {sourceAssetTab === "url" ? (
                <div className="flex min-h-[136px] items-center gap-3 rounded-[18px] border border-dashed border-paper/24 bg-[#111110] p-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-white/10 text-paper/66">
                    <LinkIcon aria-hidden="true" size={24} strokeWidth={1.9} />
                  </span>
                  <label className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-paper">Reference image URL</span>
                    <input
                      className="mt-2 w-full rounded-full border border-paper/14 bg-black/30 px-4 py-2 text-sm font-semibold text-paper outline-none transition placeholder:text-paper/28 focus:border-acid"
                      onChange={(event) => setSourceUrl(event.target.value)}
                      placeholder="Paste image URL"
                      type="url"
                      value={sourceUrl}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[22px] bg-ink p-3 text-paper">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-black">Video Template</p>
            </div>
            <AssetTabs activeTab={templateAssetTab} onChange={setTemplateAssetTab} />
            <div className="mt-3">
              {templateAssetTab === "library" ? (
                <div className="flex items-center gap-2">
                  <div className="grid flex-1 grid-cols-4 gap-1.5">
                    {visibleTemplates.map((template) => (
                      <button
                        aria-label={`Select ${template.name} template`}
                        className={cn(
                          "relative aspect-[9/16] overflow-hidden rounded-[12px] border-2 border-paper/16 bg-black transition hover:border-paper/44",
                          selectedTemplateId === template.id && "border-[3px] border-acid shadow-acid-ring",
                        )}
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplateId(template.id);
                          setTemplateAssetTab("library");
                        }}
                        type="button"
                      >
                        <video
                          autoPlay
                          className="h-full w-full object-cover"
                          loop
                          muted
                          playsInline
                          preload="metadata"
                          src={template.videoPath}
                        />
                        {selectedTemplateId === template.id ? (
                          <span
                            aria-hidden="true"
                            className="absolute right-2 top-2 h-3 w-3 rounded-full border border-ink/30 bg-acid shadow-[0_0_0_3px_rgba(198,255,0,0.28)]"
                          />
                        ) : null}
                      </button>
                    ))}
                  </div>
                  <button
                    aria-label="Show next video templates"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-paper/12 bg-white/8 text-paper shadow-sm transition hover:border-acid hover:bg-acid hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
                    disabled={!canMoveTemplates}
                    onClick={showNextTemplateWindow}
                    type="button"
                  >
                    <ChevronRight aria-hidden="true" size={18} strokeWidth={2.4} />
                  </button>
                </div>
              ) : null}
              {templateAssetTab === "upload" ? (
                <AssetPlaceholder
                  body="Upload a driving video"
                  icon={<Film aria-hidden="true" size={22} strokeWidth={1.9} />}
                  title="Upload Template"
                />
              ) : null}
              {templateAssetTab === "url" ? (
                <div className="flex min-h-[136px] items-center gap-3 rounded-[18px] border border-dashed border-paper/24 bg-[#111110] p-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-white/10 text-paper/66">
                    <LinkIcon aria-hidden="true" size={24} strokeWidth={1.9} />
                  </span>
                  <label className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-paper">Video template URL</span>
                    <input
                      className="mt-2 w-full rounded-full border border-paper/14 bg-black/30 px-4 py-2 text-sm font-semibold text-paper outline-none transition placeholder:text-paper/28 focus:border-acid"
                      onChange={(event) => setTemplateUrl(event.target.value)}
                      placeholder="Paste video URL"
                      type="url"
                      value={templateUrl}
                    />
                  </label>
                </div>
              ) : null}
            </div>
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
                  aria-label={isLocked ? `Subscribe to unlock ${model.name}` : `Select ${model.name}`}
                  aria-pressed={isSelected}
                  className={cn(
                    "relative flex min-h-[96px] flex-col items-start rounded-[18px] border border-ink/10 bg-paper p-4 text-left transition hover:border-ink/28",
                    isSelected && "border-ink bg-acid text-ink shadow-acid-ring",
                    isLocked && "pr-12",
                  )}
                  key={model.id}
                  onClick={() => (isLocked ? promptModelSubscription(model.name) : handleModelSelect(model.id))}
                  title={isLocked ? "Subscribe to unlock this model" : model.name}
                  type="button"
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-black">{model.name}</span>
                  </span>
                  {isLocked ? (
                    <span
                      aria-hidden="true"
                      className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-ink/12 bg-white text-ink shadow-sm"
                    >
                      <LockKeyhole size={15} strokeWidth={2.1} />
                    </span>
                  ) : null}
                  <span className="mt-auto pt-2 text-xs font-semibold leading-5 text-ink/58">{model.description}</span>
                </button>
              );
            })}
          </div>
          {modelUnlockPrompt ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-paper p-3 text-sm font-semibold text-ink/72">
              <span>{modelUnlockPrompt}</span>
              <Button onClick={() => startCheckout(pricingPlans.creatorMonthly.key)} size="sm" type="button" variant="dark">
                Subscribe
              </Button>
            </div>
          ) : null}
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

        <div>
          <Button className="w-full" disabled={!canGenerate} onClick={submitGeneration} type="button">
            {isGenerateBusy ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={18} />
            ) : (
              <LockKeyhole aria-hidden="true" size={18} />
            )}
            {reviewState === "reviewing" ? "Checking" : isGenerating ? "Generating" : "Generate"}
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
            <Button className="mt-4 w-full" onClick={() => startCheckout()} type="button" variant="dark">
              <Download aria-hidden="true" size={18} />
              Unlock HD
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
