import assert from "node:assert/strict";
import test from "node:test";

import {
  getAnalyticsDurationBucket,
  getAnalyticsGenerationFailureReason,
  getAnalyticsSizeBucket,
  sanitizeAnalyticsProperties,
  trackProductEvent,
} from "./client.ts";

test("drops media URLs, tokens, filenames, object keys, signed fields, and unknowns", () => {
  assert.deepEqual(
    sanitizeAnalyticsProperties({
      source: "upload",
      url: "https://signed.example/video.mp4",
      token: "secret",
      fileName: "person.mp4",
      objectKey: "private/person.mp4",
      signedPreviewUrl: "https://signed.example/preview",
      sizeBucket: "10-50mb",
      arbitrary: "must-not-pass",
    }),
    { source: "upload", sizeBucket: "10-50mb" },
  );
});

test("preserves enumerated generation failures and redacts unknown server codes", () => {
  const stableCodes = [
    "TEMPLATE_SELECTION_INVALID",
    "TEMPLATE_NOT_AVAILABLE",
    "CUSTOM_TEMPLATE_MEMBER_REQUIRED",
    "CUSTOM_TEMPLATE_MODEL_REQUIRED",
    "CUSTOM_TEMPLATE_EXPIRED",
    "CUSTOM_TEMPLATE_ALREADY_CONSUMED",
    "CUSTOM_TEMPLATE_ALREADY_RESERVED",
    "CUSTOM_TEMPLATE_NOT_READY",
    "CUSTOM_TEMPLATE_NOT_AVAILABLE",
    "MEMBER_MODEL_REQUIRED",
    "SOURCE_UPLOAD_REQUIRED",
    "SOURCE_IMAGE_REQUIRED",
    "GENERATION_BLOCKED_BY_MODERATION",
    "GENERATION_MODERATION_UNAVAILABLE",
    "MODEL_PROVIDER_FAILED",
  ] as const;

  for (const code of stableCodes) {
    assert.equal(getAnalyticsGenerationFailureReason(code), code);
  }

  assert.equal(getAnalyticsGenerationFailureReason("provider-secret-detail"), "GENERATION_FAILED");
  assert.equal(getAnalyticsGenerationFailureReason("https://private.example/failure"), "GENERATION_FAILED");
  assert.equal(getAnalyticsGenerationFailureReason({ code: "MODEL_PROVIDER_FAILED" }), "GENERATION_FAILED");
});

test("buckets custom-template sizes without exposing exact byte counts", () => {
  assert.equal(getAnalyticsSizeBucket(10 * 1024 * 1024 - 1), "under-10mb");
  assert.equal(getAnalyticsSizeBucket(10 * 1024 * 1024), "10-50mb");
  assert.equal(getAnalyticsSizeBucket(50 * 1024 * 1024 + 1), "over-50mb");
});

test("buckets approved-video durations without exposing exact timing", () => {
  assert.equal(getAnalyticsDurationBucket(5), "3-5s");
  assert.equal(getAnalyticsDurationBucket(5.1), "6-10s");
  assert.equal(getAnalyticsDurationBucket(10.1), "11-15s");
});

test("is a no-op when rendered on the server or before gtag loads", () => {
  assert.doesNotThrow(() => trackProductEvent("generate_click", { source: "platform" }));

  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  try {
    assert.doesNotThrow(() => trackProductEvent("generate_click", { source: "platform" }));
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});

test("sends a typed event with only safe enum dimensions when gtag is loaded", () => {
  const calls: unknown[][] = [];
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { gtag: (...args: unknown[]) => calls.push(args) },
  });

  try {
    trackProductEvent("generate_start", {
      source: "custom",
      state: "processing",
      model: "viggle-v4-preview",
    });
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }

  assert.deepEqual(calls, [[
    "event",
    "generate_start",
    { source: "custom", state: "processing", model: "viggle-v4-preview" },
  ]]);
});
