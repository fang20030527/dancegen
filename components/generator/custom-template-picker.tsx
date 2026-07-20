"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  FileVideo2,
  LinkIcon,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CustomTemplatePublicState } from "@/lib/custom-templates/types";
import type { GeneratorTemplateState } from "@/lib/dance/generator-readiness";
import { cn } from "@/lib/utils";

import {
  CustomTemplateClientError,
  deleteCustomTemplate,
  getCustomTemplateState,
  importCustomTemplate,
  uploadCustomTemplate,
} from "./custom-template-client";

export type CustomTemplateMode = "upload" | "url";

export type CustomTemplateSelection = {
  ingestId: string;
  customTemplateToken: string;
  previewUrl: string | null;
  mimeType: "video/mp4" | "video/webm";
  sizeBytes: number;
  durationSeconds: number;
  expiresAt: string;
};

type CustomTemplatePickerProps = {
  mode: CustomTemplateMode;
  enabled: boolean;
  signedIn: boolean;
  hasCreatorAccess: boolean;
  onReady: (selection: CustomTemplateSelection) => void;
  onClear: () => void;
  onStateChange: (state: GeneratorTemplateState) => void;
  onUpgrade: () => void;
};

const pollDelayMs = 1_500;
const maxPollAttempts = 20;

export function CustomTemplatePicker({
  mode,
  enabled,
  signedIn,
  hasCreatorAccess,
  onReady,
  onClear,
  onStateChange,
  onUpgrade,
}: CustomTemplatePickerProps) {
  const [pickerState, setPickerState] = useState<GeneratorTemplateState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [remoteUrl, setRemoteUrl] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ingest, setIngest] = useState<CustomTemplatePublicState | null>(null);
  const [selection, setSelection] = useState<CustomTemplateSelection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const abortController = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const urlInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onStateChange(pickerState);
  }, [onStateChange, pickerState]);

  useEffect(() => () => abortController.current?.abort(), []);

  const isWorking = pickerState === "validating" || pickerState === "transferring" || pickerState === "reviewing";

  function updateState(nextState: GeneratorTemplateState) {
    setPickerState((currentState) => currentState === nextState ? currentState : nextState);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    if (nextFile === file) {
      return;
    }
    resetPendingOperation();
    setFile(nextFile);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const nextFile = event.dataTransfer.files[0] ?? null;
    if (!nextFile || nextFile === file) {
      return;
    }
    resetPendingOperation();
    setFile(nextFile);
  }

  function resetPendingOperation() {
    abortController.current?.abort();
    abortController.current = null;
    setError(null);
    setProgress(0);
    updateState("idle");
  }

  async function startUpload() {
    if (!file || isWorking || isRemoving) {
      return;
    }
    const controller = beginOperation();
    try {
      const result = await uploadCustomTemplate({
        file,
        rightsConfirmed,
        signal: controller.signal,
        onTransferStart: () => updateState("transferring"),
        onProgress: setProgress,
        onReviewStart: () => updateState("reviewing"),
      });
      await resolveResult(result, controller.signal);
    } catch (caught) {
      handleOperationError(caught);
    } finally {
      if (abortController.current === controller) {
        abortController.current = null;
      }
    }
  }

  async function startImport() {
    if (!remoteUrl.trim() || isWorking || isRemoving) {
      return;
    }
    const controller = beginOperation();
    await Promise.resolve();
    updateState("transferring");
    try {
      const result = await importCustomTemplate({
        url: remoteUrl,
        rightsConfirmed,
        signal: controller.signal,
      });
      await resolveResult(result, controller.signal);
    } catch (caught) {
      handleOperationError(caught);
    } finally {
      if (abortController.current === controller) {
        abortController.current = null;
      }
    }
  }

  function beginOperation() {
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    setError(null);
    setProgress(0);
    updateState("validating");
    return controller;
  }

  async function resolveResult(initial: CustomTemplatePublicState, signal: AbortSignal) {
    let latest = initial;
    let token = initial.customTemplateToken;
    setIngest(initial);

    for (let attempt = 0; attempt <= maxPollAttempts; attempt += 1) {
      if (latest.state === "ready") {
        const previewState = await getCustomTemplateState(latest.id, signal);
        latest = { ...latest, ...previewState, customTemplateToken: token };
        setIngest(latest);
        const readySelection = toReadySelection(latest);
        setSelection(readySelection);
        updateState("ready");
        onReady(readySelection);
        return;
      }

      if (latest.state === "rejected" || latest.state === "failed" || latest.state === "deleted") {
        throw new CustomTemplateClientError(
          latest.state === "rejected" ? "REVIEW_BLOCKED" : "INGEST_FAILED",
          latest.state === "rejected"
            ? "This video could not be used because it does not meet our content policy."
            : "The custom video could not be prepared. Please try again.",
        );
      }

      updateState(latest.state === "transferring" || latest.state === "awaiting_upload" ? "transferring" : "reviewing");
      if (attempt === maxPollAttempts) {
        throw new CustomTemplateClientError("INGEST_FAILED", "Video review is taking longer than expected. Try again.");
      }
      await delay(pollDelayMs, signal);
      latest = await getCustomTemplateState(initial.id, signal);
      token ??= latest.customTemplateToken;
      setIngest(latest);
    }
  }

  function handleOperationError(caught: unknown) {
    if (caught instanceof CustomTemplateClientError && caught.code === "REQUEST_ABORTED") {
      return;
    }
    setSelection(null);
    onClear();
    updateState("failed");
    setError(caught instanceof CustomTemplateClientError ? caught.message : "The custom video could not be prepared.");
  }

  async function removeTemplate(shouldFocusReplacement = false) {
    if (isRemoving || isWorking) {
      return;
    }
    setIsRemoving(true);
    setError(null);
    try {
      if (ingest) {
        await deleteCustomTemplate(ingest.id);
      }
      setIngest(null);
      setSelection(null);
      setFile(null);
      setRemoteUrl("");
      if (fileInput.current) {
        fileInput.current.value = "";
      }
      setProgress(0);
      updateState("idle");
      onClear();
      if (shouldFocusReplacement) {
        window.setTimeout(() => mode === "upload" ? fileInput.current?.click() : urlInput.current?.focus(), 0);
      }
    } catch (caught) {
      setError(caught instanceof CustomTemplateClientError ? caught.message : "The custom video could not be removed.");
    } finally {
      setIsRemoving(false);
    }
  }

  if (!enabled) {
    return <GateMessage title="Custom videos are currently unavailable" body="The template library is still available while this member feature is being prepared." />;
  }

  if (!signedIn) {
    return (
      <GateMessage title="Sign in to use your own video" body="Custom driving videos are available to signed-in Creator members.">
        <Button asChild className="mt-3" size="sm">
          <a href="/register?redirectTo=/ai-dance-generator">Continue with Google</a>
        </Button>
      </GateMessage>
    );
  }

  if (!hasCreatorAccess) {
    return (
      <GateMessage title="Creator membership required" body="Upgrade to upload or import a one-time custom driving video.">
        <Button className="mt-3" onClick={onUpgrade} size="sm" type="button">Upgrade to Creator</Button>
      </GateMessage>
    );
  }

  if (pickerState === "ready" && selection) {
    return (
      <div className="rounded-[18px] border border-acid/35 bg-[#111110] p-3" data-clarity-mask="true">
        {selection.previewUrl ? (
          <video className="aspect-video w-full rounded-[14px] bg-black object-contain" controls playsInline preload="metadata" src={selection.previewUrl} />
        ) : null}
        <div className="mt-3 flex items-start gap-2 text-acid">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={18} />
          <div>
            <p className="text-sm font-black">Custom video ready</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-paper/48">
              {formatDuration(selection.durationSeconds)} · {formatBytes(selection.sizeBytes)} · Expires {formatExpiry(selection.expiresAt)}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button disabled={isRemoving} onClick={() => removeTemplate(true)} size="sm" type="button" variant="outline">
            <RefreshCw aria-hidden="true" size={15} /> Replace
          </Button>
          <Button disabled={isRemoving} onClick={() => removeTemplate()} size="sm" type="button" variant="outline">
            {isRemoving ? <Loader2 aria-hidden="true" className="animate-spin" size={15} /> : <Trash2 aria-hidden="true" size={15} />} Remove
          </Button>
        </div>
        {error ? <ErrorMessage message={error} /> : null}
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border border-dashed border-paper/24 bg-[#111110] p-3">
      {mode === "upload" ? (
        <>
          <input accept="video/mp4,video/webm" className="sr-only" id="custom-template-file" onChange={handleFileChange} ref={fileInput} type="file" />
          <label className={cn("flex min-h-[88px] cursor-pointer items-center gap-3 rounded-[14px] border border-paper/12 bg-black/25 p-3 transition hover:border-acid/60", isWorking && "pointer-events-none opacity-60")} htmlFor="custom-template-file" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-white/8 text-paper/65"><Upload aria-hidden="true" size={22} /></span>
            <span className="min-w-0"><span className="block truncate text-sm font-black text-paper">{file?.name ?? "Choose or drop a video"}</span><span className="mt-1 block text-xs font-semibold leading-5 text-paper/42">MP4 or WebM · 3–15 seconds · up to 50 MB</span></span>
          </label>
        </>
      ) : (
        <label className="block">
          <span className="flex items-center gap-2 text-sm font-black text-paper"><LinkIcon aria-hidden="true" size={16} />Direct video URL</span>
          <input aria-describedby="custom-url-help" className="mt-2 w-full rounded-full border border-paper/14 bg-black/30 px-4 py-2.5 text-sm font-semibold text-paper outline-none transition placeholder:text-paper/28 focus:border-acid" data-clarity-mask="true" disabled={isWorking} onChange={(event) => setRemoteUrl(event.target.value)} placeholder="https://example.com/video.mp4" ref={urlInput} type="url" value={remoteUrl} />
          <span className="mt-1.5 block text-xs font-semibold leading-5 text-paper/42" id="custom-url-help">HTTPS video-file links only. Social post pages are not supported.</span>
        </label>
      )}

      <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs font-semibold leading-5 text-paper/58">
        <input checked={rightsConfirmed} className="mt-1 accent-[#c6ff00]" disabled={isWorking} onChange={(event) => setRightsConfirmed(event.target.checked)} type="checkbox" />
        <span>I have permission to use this video and agree to safety review and 24-hour retention.</span>
      </label>

      {isWorking ? <ProgressState progress={progress} state={pickerState} /> : null}
      {error ? <ErrorMessage message={error} /> : null}

      <Button className="mt-3 w-full" disabled={isWorking || !rightsConfirmed || (mode === "upload" ? !file : !remoteUrl.trim())} onClick={mode === "upload" ? startUpload : startImport} size="sm" type="button">
        {isWorking ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : mode === "upload" ? <FileVideo2 aria-hidden="true" size={16} /> : <LinkIcon aria-hidden="true" size={16} />}
        {isWorking ? stateLabel(pickerState) : mode === "upload" ? "Upload video" : "Import video"}
      </Button>
    </div>
  );
}

function GateMessage({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return <div className="flex min-h-[136px] flex-col items-center justify-center rounded-[18px] border border-dashed border-paper/24 bg-[#111110] px-4 py-5 text-center"><p className="text-sm font-black text-paper">{title}</p><p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-paper/42">{body}</p>{children}</div>;
}

function ProgressState({ state, progress }: { state: GeneratorTemplateState; progress: number }) {
  return <div aria-live="polite" className="mt-3 rounded-[14px] bg-white/6 p-3 text-xs font-semibold text-paper/62"><div className="flex items-center justify-between gap-2"><span>{stateLabel(state)}</span>{state === "transferring" && progress > 0 ? <span>{progress}%</span> : null}</div>{state === "transferring" && progress > 0 ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-acid transition-[width]" style={{ width: `${progress}%` }} /></div> : null}</div>;
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="mt-3 rounded-[14px] border border-coral/25 bg-coral/10 p-3 text-xs font-semibold leading-5 text-[#ff9a8b]" role="alert">{message}</p>;
}

function toReadySelection(state: CustomTemplatePublicState): CustomTemplateSelection {
  if (!state.customTemplateToken || state.durationSeconds === null || !state.expiresAt) {
    throw new CustomTemplateClientError("INVALID_STATE", "The approved video token could not be loaded. Import the video again.");
  }
  return { ingestId: state.id, customTemplateToken: state.customTemplateToken, previewUrl: state.previewUrl ?? null, mimeType: state.mimeType, sizeBytes: state.sizeBytes, durationSeconds: state.durationSeconds, expiresAt: state.expiresAt };
}

function stateLabel(state: GeneratorTemplateState) {
  if (state === "validating") return "Checking details…";
  if (state === "transferring") return "Transferring…";
  if (state === "reviewing") return "Reviewing…";
  return "Working…";
}

function formatBytes(bytes: number) { return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
function formatDuration(seconds: number) { return `${seconds.toFixed(seconds % 1 ? 1 : 0)} sec`; }
function formatExpiry(value: string) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const finish = () => {
      signal.removeEventListener("abort", abort);
      resolve();
    };
    const abort = () => {
      window.clearTimeout(timer);
      reject(new CustomTemplateClientError("REQUEST_ABORTED", "The custom video request was canceled."));
    };
    const timer = window.setTimeout(finish, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}
