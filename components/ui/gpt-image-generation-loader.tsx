"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type GPTImageGenerationLoaderProps = {
  size?: number;
  dotGap?: number;
  speed?: number;
  className?: string;
  variant?: "card" | "field";
};

type BlobConfig = {
  baseX: number;
  baseY: number;
  driftX: number;
  driftY: number;
  radius: number;
  radiusDrift: number;
  phase: number;
  xSpeed: number;
  ySpeed: number;
  pulseSpeed: number;
  weight: number;
};

const DOT_COLOR = "42, 42, 38";
const CARD_BACKGROUND = "#f7f7f5";
const CARD_BORDER = "rgba(9, 9, 7, 0.08)";
const BLOB_CONFIGS: BlobConfig[] = [
  { baseX: 0.5, baseY: 0.46, driftX: 0.2, driftY: 0.13, radius: 0.34, radiusDrift: 0.08, phase: 0.2, xSpeed: 0.23, ySpeed: 0.19, pulseSpeed: 0.31, weight: 0.95 },
  { baseX: 0.33, baseY: 0.36, driftX: 0.17, driftY: 0.16, radius: 0.28, radiusDrift: 0.07, phase: 1.7, xSpeed: 0.18, ySpeed: 0.26, pulseSpeed: 0.22, weight: 0.72 },
  { baseX: 0.66, baseY: 0.61, driftX: 0.18, driftY: 0.18, radius: 0.32, radiusDrift: 0.09, phase: 3.1, xSpeed: 0.21, ySpeed: 0.16, pulseSpeed: 0.27, weight: 0.78 },
  { baseX: 0.44, baseY: 0.7, driftX: 0.16, driftY: 0.12, radius: 0.26, radiusDrift: 0.08, phase: 4.4, xSpeed: 0.25, ySpeed: 0.2, pulseSpeed: 0.34, weight: 0.58 },
  { baseX: 0.72, baseY: 0.33, driftX: 0.13, driftY: 0.15, radius: 0.24, radiusDrift: 0.06, phase: 5.6, xSpeed: 0.17, ySpeed: 0.28, pulseSpeed: 0.24, weight: 0.5 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getBlob(config: BlobConfig, time: number, width: number, height: number) {
  const scale = Math.min(width, height);

  return {
    x: (config.baseX + Math.sin(time * config.xSpeed + config.phase) * config.driftX) * width,
    y: (config.baseY + Math.cos(time * config.ySpeed + config.phase * 0.73) * config.driftY) * height,
    radius: (config.radius + Math.sin(time * config.pulseSpeed + config.phase) * config.radiusDrift) * scale,
    weight: config.weight,
  };
}

function drawCardFrame(ctx: CanvasRenderingContext2D, width: number, height: number, dotGap: number, time: number) {
  const padding = Math.max(18, Math.min(width, height) * 0.045);
  const cornerRadius = Math.max(24, Math.min(width, height) * 0.067);
  const centerX = width / 2;
  const centerY = height / 2;
  const blobs = BLOB_CONFIGS.map((blob) => getBlob(blob, time, width, height));

  ctx.clearRect(0, 0, width, height);

  roundedRectPath(ctx, 0.5, 0.5, width - 1, height - 1, cornerRadius);
  ctx.fillStyle = CARD_BACKGROUND;
  ctx.fill();

  ctx.save();
  roundedRectPath(ctx, 0.5, 0.5, width - 1, height - 1, cornerRadius);
  ctx.clip();

  for (let y = padding; y <= height - padding; y += dotGap) {
    for (let x = padding; x <= width - padding; x += dotGap) {
      let intensity = 0;

      for (const blob of blobs) {
        const dx = x - blob.x;
        const dy = y - blob.y;
        intensity += Math.exp(-(dx * dx + dy * dy) / (blob.radius * blob.radius)) * blob.weight;
      }

      const radialDistance = Math.hypot(x - centerX, y - centerY) / (Math.min(width, height) * 0.66);
      const edgeFade = 1 - smoothstep(0.48, 1, radialDistance);
      const distanceFromCenter = Math.hypot(x - centerX, y - centerY);
      const centerBias = Math.exp(-(distanceFromCenter * distanceFromCenter) / (Math.min(width, height) ** 2 * 0.18));
      const mapped = smoothstep(0.16, 1.16, intensity);
      const alpha = clamp((mapped * 0.33 + centerBias * 0.07) * edgeFade, 0.015, 0.42);
      const radius = 0.35 + smoothstep(0.08, 1.22, intensity) * 1 + centerBias * 0.18;

      ctx.beginPath();
      ctx.fillStyle = `rgba(${DOT_COLOR}, ${alpha})`;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const vignette = ctx.createRadialGradient(centerX, centerY, Math.min(width, height) * 0.2, centerX, centerY, Math.min(width, height) * 0.7);
  vignette.addColorStop(0, "rgba(247, 247, 245, 0)");
  vignette.addColorStop(1, "rgba(247, 247, 245, 0.62)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();

  roundedRectPath(ctx, 0.5, 0.5, width - 1, height - 1, cornerRadius);
  ctx.strokeStyle = CARD_BORDER;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawFieldFrame(ctx: CanvasRenderingContext2D, width: number, height: number, dotGap: number, time: number) {
  const padding = dotGap * 1.5;
  const centerX = width * 0.56;
  const centerY = height * 0.5;
  const scale = Math.min(width, height);
  const blobs = BLOB_CONFIGS.map((blob) => getBlob(blob, time, width, height));

  ctx.clearRect(0, 0, width, height);

  for (let y = padding; y <= height - padding; y += dotGap) {
    for (let x = padding; x <= width - padding; x += dotGap) {
      let intensity = 0;

      for (const blob of blobs) {
        const dx = x - blob.x;
        const dy = y - blob.y;
        intensity += Math.exp(-(dx * dx + dy * dy) / (blob.radius * blob.radius)) * blob.weight;
      }

      const distanceFromCenter = Math.hypot((x - centerX) / 1.18, y - centerY);
      const centerBias = Math.exp(-(distanceFromCenter * distanceFromCenter) / (scale * scale * 0.38));
      const mapped = smoothstep(0.08, 1.04, intensity);
      const alpha = clamp(mapped * 0.28 + centerBias * 0.045, 0.012, 0.34);
      const radius = 0.35 + smoothstep(0.08, 1.12, intensity) * 0.95 + centerBias * 0.12;

      ctx.beginPath();
      ctx.fillStyle = `rgba(${DOT_COLOR}, ${alpha})`;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawLoaderFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  dotGap: number,
  time: number,
  variant: "card" | "field",
) {
  if (variant === "card") {
    drawCardFrame(ctx, width, height, dotGap, time);
    return;
  }

  drawFieldFrame(ctx, width, height, dotGap, time);
}

export function GPTImageGenerationLoader({
  size = 420,
  dotGap = 7,
  speed = 1,
  className,
  variant = "field",
}: GPTImageGenerationLoaderProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) {
      return undefined;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return undefined;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame: number | undefined;
    let isVisible = false;
    let width = size;
    let height = size;

    const resizeCanvas = () => {
      const rect = wrapper.getBoundingClientRect();
      width = Math.max(1, variant === "field" ? rect.width : size);
      height = Math.max(1, variant === "field" ? rect.height : size);

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const cancelCurrentFrame = () => {
      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = undefined;
      }
    };

    const render = (timestamp: number) => {
      const time = media.matches ? 18 : timestamp * 0.001 * speed;

      drawLoaderFrame(context, width, height, dotGap, time, variant);

      if (isVisible && !media.matches) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    const restart = () => {
      cancelCurrentFrame();
      render(performance.now());
    };

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting && entry.boundingClientRect.width > 0 && entry.boundingClientRect.height > 0;
      restart();
    });
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
      restart();
    });

    resizeCanvas();
    drawLoaderFrame(context, width, height, dotGap, 18, variant);
    resizeObserver.observe(wrapper);
    visibilityObserver.observe(wrapper);
    media.addEventListener("change", restart);

    return () => {
      cancelCurrentFrame();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      media.removeEventListener("change", restart);
    };
  }, [dotGap, size, speed, variant]);

  const fixedSizeStyle = variant === "card" ? { height: size, width: size } : undefined;

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "pointer-events-none overflow-hidden",
        variant === "card" && "rounded-[28px] shadow-[0_28px_90px_rgba(9,9,7,0.18)]",
        className,
      )}
      style={fixedSizeStyle}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="block h-full w-full"
        height={size}
        width={size}
      />
    </div>
  );
}
