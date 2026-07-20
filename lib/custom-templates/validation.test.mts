import assert from "node:assert/strict";
import test from "node:test";

import { getCustomTemplateConfig } from "./config.ts";
import { validateCustomTemplateDeclaration } from "./validation.ts";

test("accepts an MP4 inside the member limits", () => {
  assert.deepEqual(
    validateCustomTemplateDeclaration({ contentType: "video/mp4", sizeBytes: 5_000_000 }),
    { contentType: "video/mp4", sizeBytes: 5_000_000 },
  );
});

test("rejects unsupported content types and files above 50 MB", () => {
  assert.throws(() => validateCustomTemplateDeclaration({ contentType: "video/quicktime", sizeBytes: 1 }));
  assert.throws(() => validateCustomTemplateDeclaration({ contentType: "video/mp4", sizeBytes: 52_428_801 }));
});

test("keeps custom templates disabled without requiring production services", () => {
  assert.deepEqual(getCustomTemplateConfig({ CUSTOM_TEMPLATE_FEATURE_ENABLED: " false " }), {
    enabled: false,
    uploadUrlExpiresInSeconds: 600,
  });
});

test("trims and returns all production settings when custom templates are enabled", () => {
  assert.deepEqual(
    getCustomTemplateConfig({
      CUSTOM_TEMPLATE_FEATURE_ENABLED: " true ",
      CUSTOM_TEMPLATE_REVIEW_URL: " https://review.example.com/v1/videos ",
      CUSTOM_TEMPLATE_REVIEW_API_KEY: " review-secret ",
      S3_REGION: " auto ",
      S3_ENDPOINT: " https://storage.example.com ",
      S3_ACCESS_KEY_ID: " access-key ",
      S3_SECRET_ACCESS_KEY: " storage-secret ",
      S3_BUCKET: " private-quarantine ",
    }),
    {
      enabled: true,
      uploadUrlExpiresInSeconds: 600,
      reviewUrl: "https://review.example.com/v1/videos",
      reviewApiKey: "review-secret",
      s3Region: "auto",
      s3Endpoint: "https://storage.example.com",
      s3AccessKeyId: "access-key",
      s3SecretAccessKey: "storage-secret",
      s3Bucket: "private-quarantine",
    },
  );
});

test("requires production services only when custom templates are enabled", () => {
  assert.throws(
    () => getCustomTemplateConfig({ CUSTOM_TEMPLATE_FEATURE_ENABLED: "true" }),
    /CUSTOM_TEMPLATE_REVIEW_URL/,
  );
});
