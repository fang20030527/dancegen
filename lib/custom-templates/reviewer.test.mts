import assert from "node:assert/strict";
import test from "node:test";

import { CustomTemplateValidationError } from "./validation.ts";
import {
  CustomTemplateReviewError,
  reviewCustomTemplate,
} from "./reviewer.ts";

const input = {
  ingestId: "ingest-1",
  objectKey: "custom-template-quarantine/user/ingest-1",
  storedMime: "video/mp4",
  signatureMime: "video/mp4",
};

test("reviews a private object with a five-minute URL and fixed policy", async () => {
  const calls = [];
  const storage = {
    async createReadUrl(objectKey, expiresInSeconds) {
      assert.equal(objectKey, input.objectKey);
      assert.equal(expiresInSeconds, 300);
      return "https://private.example.test/signed";
    },
  };

  const result = await reviewCustomTemplate(input, {
    storage,
    config: {
      reviewUrl: "https://review.example.test/video",
      reviewApiKey: "review-secret",
    },
    fetch: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse({
        allowed: true,
        durationSeconds: 8.5,
        detectedMime: "video/mp4",
      });
    },
  });

  assert.deepEqual(result, { durationSeconds: 8.5, detectedMime: "video/mp4" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://review.example.test/video");
  assert.equal(calls[0].init.headers.authorization, "Bearer review-secret");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    mediaUrl: "https://private.example.test/signed",
    ingestId: "ingest-1",
    declaredMime: "video/mp4",
    policy: "danceclip-custom-template-v1",
  });
});

test("fails closed for blocked, malformed, unavailable, and inconsistent reviews", async () => {
  const dependencies = (responseOrError) => ({
    storage: { createReadUrl: async () => "https://private.example.test/signed" },
    config: { reviewUrl: "https://review.example.test/video", reviewApiKey: "secret" },
    fetch: async () => {
      if (responseOrError instanceof Error) throw responseOrError;
      return jsonResponse(responseOrError);
    },
  });

  await assert.rejects(
    reviewCustomTemplate(input, dependencies({
      allowed: false,
      durationSeconds: 8,
      detectedMime: "video/mp4",
      reasonCodes: ["sensitive-detail-must-not-leak"],
    })),
    (error) => error instanceof CustomTemplateReviewError && error.code === "REVIEW_BLOCKED",
  );
  await assert.rejects(
    reviewCustomTemplate(input, dependencies({ allowed: true, durationSeconds: "8" })),
    (error) => error instanceof CustomTemplateReviewError && error.code === "REVIEW_UNAVAILABLE",
  );
  await assert.rejects(
    reviewCustomTemplate(input, dependencies(new Error("network detail"))),
    (error) => error instanceof CustomTemplateReviewError && error.code === "REVIEW_UNAVAILABLE",
  );
  await assert.rejects(
    reviewCustomTemplate(input, dependencies({
      allowed: true,
      durationSeconds: 8,
      detectedMime: "video/webm",
    })),
    (error) =>
      error instanceof CustomTemplateValidationError && error.code === "INVALID_FORMAT",
  );
  await assert.rejects(
    reviewCustomTemplate(input, dependencies({
      allowed: true,
      durationSeconds: 15.01,
      detectedMime: "video/mp4",
    })),
    (error) =>
      error instanceof CustomTemplateValidationError && error.code === "INVALID_DURATION",
  );
});

test("applies a 30-second hard timeout and maps an aborted review to unavailable", async () => {
  const controller = new AbortController();
  let requestedTimeout;
  let receivedSignal;

  await assert.rejects(
    reviewCustomTemplate(input, {
      storage: { createReadUrl: async () => "https://private.example.test/signed" },
      config: { reviewUrl: "https://review.example.test/video", reviewApiKey: "secret" },
      createTimeoutSignal(timeoutMs) {
        requestedTimeout = timeoutMs;
        return controller.signal;
      },
      fetch: async (_url, init) => {
        receivedSignal = init.signal;
        throw new DOMException("review timed out", "AbortError");
      },
    }),
    (error) => error instanceof CustomTemplateReviewError && error.code === "REVIEW_UNAVAILABLE",
  );

  assert.equal(requestedTimeout, 30_000);
  assert.equal(receivedSignal, controller.signal);
});

function jsonResponse(body) {
  return {
    ok: true,
    async json() {
      return body;
    },
  };
}
