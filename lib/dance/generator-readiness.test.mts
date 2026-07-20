import assert from "node:assert/strict";
import test from "node:test";

import { getGeneratorReadiness } from "./generator-readiness.ts";

test("explains the first blocking condition", () => {
  assert.deepEqual(
    getGeneratorReadiness({
      hasImage: false,
      isBusy: false,
      templateState: "platform",
      signedIn: true,
      hasCreatorAccess: true,
    }),
    {
      ready: false,
      message: "Upload or choose a reference image.",
    },
  );

  assert.equal(
    getGeneratorReadiness({
      hasImage: true,
      isBusy: false,
      templateState: "reviewing",
      signedIn: true,
      hasCreatorAccess: true,
    }).message,
    "Your custom video is still being reviewed.",
  );
});

test("requires account access before a custom video can generate", () => {
  assert.deepEqual(
    getGeneratorReadiness({
      hasImage: true,
      isBusy: false,
      templateState: "ready",
      signedIn: false,
      hasCreatorAccess: false,
    }),
    {
      ready: false,
      message: "Continue with Google to use a custom video.",
    },
  );

  assert.equal(
    getGeneratorReadiness({
      hasImage: true,
      isBusy: false,
      templateState: "ready",
      signedIn: true,
      hasCreatorAccess: false,
    }).message,
    "Upgrade to Creator to use a custom video.",
  );
});

test("describes custom-template progress, rights, model, and busy states", () => {
  const base = {
    hasImage: true,
    isBusy: false,
    signedIn: true,
    hasCreatorAccess: true,
  } as const;

  assert.equal(
    getGeneratorReadiness({ ...base, templateState: "idle" }).message,
    "Upload or import a custom video.",
  );
  assert.equal(
    getGeneratorReadiness({ ...base, templateState: "validating" }).message,
    "Checking your custom video details.",
  );
  assert.equal(
    getGeneratorReadiness({ ...base, templateState: "transferring" }).message,
    "Your custom video is still transferring.",
  );
  assert.equal(
    getGeneratorReadiness({ ...base, templateState: "failed" }).message,
    "Retry or choose another custom video.",
  );
  assert.equal(
    getGeneratorReadiness({ ...base, templateState: "ready", rightsConfirmed: false }).message,
    "Confirm that you have the right to use this content.",
  );
  assert.equal(
    getGeneratorReadiness({ ...base, templateState: "ready", compatibleModelSelected: false }).message,
    "Custom videos require the Viggle model.",
  );
  assert.equal(
    getGeneratorReadiness({ ...base, templateState: "ready", isBusy: true }).message,
    "Please wait for the current check or generation.",
  );
  assert.deepEqual(getGeneratorReadiness({ ...base, templateState: "ready" }), {
    ready: true,
    message: null,
  });
});

test("requires sign-in for platform generation without requiring Creator", () => {
  assert.equal(
    getGeneratorReadiness({
      hasImage: true,
      isBusy: false,
      templateState: "platform",
      signedIn: false,
      hasCreatorAccess: false,
    }).message,
    "Continue with Google to generate your dance video.",
  );

  assert.deepEqual(
    getGeneratorReadiness({
      hasImage: true,
      isBusy: false,
      templateState: "platform",
      signedIn: true,
      hasCreatorAccess: false,
    }),
    { ready: true, message: null },
  );
});

test("explains when new custom templates are disabled by the feature flag", () => {
  assert.equal(
    getGeneratorReadiness({
      hasImage: false,
      isBusy: false,
      templateState: "idle",
      signedIn: true,
      hasCreatorAccess: true,
      customTemplatesEnabled: false,
    }).message,
    "Custom video templates are currently unavailable.",
  );
});

test("prevents reusing a consumed custom video without blocking platform templates", () => {
  const base = {
    hasImage: true,
    isBusy: false,
    signedIn: true,
    hasCreatorAccess: true,
    customTemplateUsed: true,
  } as const;

  assert.deepEqual(
    getGeneratorReadiness({ ...base, templateState: "ready" }),
    {
      ready: false,
      message: "This custom video has already been used. Replace it to generate again.",
    },
  );

  assert.deepEqual(
    getGeneratorReadiness({ ...base, templateState: "platform" }),
    { ready: true, message: null },
  );
});
