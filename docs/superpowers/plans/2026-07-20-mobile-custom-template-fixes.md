# Mobile Interaction and Member Custom Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the Clarity mobile interaction defects and add a production-gated, member-only, one-time custom driving-video workflow for local MP4/WebM uploads and safe HTTPS direct-file imports.

**Architecture:** Browser uploads use a ten-minute presigned PUT into a private S3-compatible quarantine bucket, while URL imports use a bounded SSRF-resistant downloader. A PostgreSQL ingest record owns the state machine and opaque custom token; a configured video-review service supplies authoritative duration and safety decisions. Only approved, unexpired, unconsumed custom sources can reach the Viggle adapter.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Node 22 test runner, Neon PostgreSQL, AWS SDK v3 for R2/S3-compatible storage, Undici for pinned DNS fetching, Zod, Tailwind CSS.

## Global Constraints

- Custom templates require a signed-in user with an active Creator subscription.
- Direct URL import supports HTTPS MP4/WebM file URLs only; social page parsing is excluded.
- Accepted size is 1 through 52,428,800 bytes and accepted duration is 3 through 15 seconds inclusive.
- Custom templates are one-generation assets and expire 24 hours after approval.
- Custom templates always use `viggle-v4-preview`; Seedance must reject them.
- Review, validation, transfer, timeout, and safety failures occur before any generation allowance reservation.
- Uploaded media stays private, Clarity must not capture media URLs, and analytics must not include user media or signed credentials.
- The feature flag defaults off and cannot be enabled without database, private object storage, bucket CORS, and a video-capable review service.
- Existing platform-template generation and the restricted non-generative `/ai-twerk-generator` route remain unchanged.

---

### Task 1: Establish test, dependency, configuration, and domain contracts

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Create: `lib/custom-templates/types.ts`
- Create: `lib/custom-templates/config.ts`
- Create: `lib/custom-templates/validation.ts`
- Create: `lib/custom-templates/validation.test.mts`

**Interfaces:**
- Produces: `CustomTemplateIngest`, `CustomTemplatePublicState`, `TemplateSource`, `customTemplateLimits`, `getCustomTemplateConfig()`, `validateCustomTemplateDeclaration()`.
- Consumes: no earlier task interfaces.

- [ ] **Step 1: Add the failing declaration-validation tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";

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
```

- [ ] **Step 2: Run the focused test and verify the missing-module failure**

Run: `node --test lib/custom-templates/validation.test.mts`
Expected: FAIL because `lib/custom-templates/validation.ts` does not exist.

- [ ] **Step 3: Define the domain and validation boundary**

```ts
// lib/custom-templates/types.ts
export const customTemplateStates = [
  "awaiting_upload", "transferring", "reviewing", "ready", "reserved", "rejected", "failed", "consumed", "deleted",
] as const;
export type CustomTemplateState = (typeof customTemplateStates)[number];
export type CustomTemplateMime = "video/mp4" | "video/webm";
export type TemplateSource =
  | { kind: "platform"; templateId: string }
  | { kind: "custom"; ingestId: string; objectKey: string; mimeType: CustomTemplateMime };

export type CustomTemplateIngest = {
  id: string;
  userId: string;
  idempotencyKey: string;
  sourceKind: "upload" | "url";
  objectKey: string;
  mimeType: CustomTemplateMime;
  sizeBytes: number;
  durationSeconds: number | null;
  state: CustomTemplateState;
  tokenHash: string | null;
  reasonCode: string | null;
  createdAt: string;
  approvedAt: string | null;
  expiresAt: string | null;
  consumedAt: string | null;
  deletedAt: string | null;
};

export type CustomTemplatePublicState = Pick<
  CustomTemplateIngest,
  "id" | "state" | "mimeType" | "sizeBytes" | "durationSeconds" | "expiresAt" | "reasonCode"
> & { customTemplateToken?: string; previewUrl?: string };
```

```ts
// lib/custom-templates/validation.ts
import { z } from "zod";
import type { CustomTemplateMime } from "./types";

export const customTemplateLimits = { maxBytes: 50 * 1024 * 1024, minDurationSeconds: 3, maxDurationSeconds: 15 } as const;
const declarationSchema = z.object({
  contentType: z.enum(["video/mp4", "video/webm"]),
  sizeBytes: z.number().int().positive().max(customTemplateLimits.maxBytes),
});

export function validateCustomTemplateDeclaration(input: unknown): { contentType: CustomTemplateMime; sizeBytes: number } {
  return declarationSchema.parse(input);
}

export function assertDurationAllowed(durationSeconds: number) {
  if (durationSeconds < customTemplateLimits.minDurationSeconds || durationSeconds > customTemplateLimits.maxDurationSeconds) {
    throw new CustomTemplateValidationError("INVALID_DURATION");
  }
}

export class CustomTemplateValidationError extends Error {
  constructor(readonly code: "INVALID_DURATION" | "INVALID_FORMAT" | "FILE_TOO_LARGE") {
    super(code);
    this.name = "CustomTemplateValidationError";
  }
}
```

- [ ] **Step 4: Add production configuration and dependencies**

Add `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, and `undici` to dependencies. Add `"test": "node --test lib/*.test.mts lib/**/*.test.mts"` to scripts. Add these documented variables:

```dotenv
CUSTOM_TEMPLATE_FEATURE_ENABLED="false"
CUSTOM_TEMPLATE_REVIEW_URL=""
CUSTOM_TEMPLATE_REVIEW_API_KEY=""
S3_REGION="auto"
```

`getCustomTemplateConfig()` must trim values, require all storage/review settings only when the flag is on, return `enabled: false` without throwing when the flag is off, and fix upload URL lifetime at 600 seconds.

- [ ] **Step 5: Run tests and static checks**

Run: `pnpm install && pnpm test && pnpm typecheck`
Expected: all existing and new tests pass; TypeScript exits 0.

- [ ] **Step 6: Commit the contracts**

```bash
git add package.json pnpm-lock.yaml .env.example lib/custom-templates
git commit -m "feat: define custom template contracts"
```

---

### Task 2: Add private object storage and persistent ingest records

**Files:**
- Create: `lib/custom-templates/storage.ts`
- Create: `lib/custom-templates/repository.ts`
- Create: `lib/custom-templates/repository.test.mts`

**Interfaces:**
- Consumes: `CustomTemplateIngest`, `CustomTemplateMime`, configuration from Task 1.
- Produces: `CustomTemplateStorage`, `customTemplateStorage`, `CustomTemplateRepository`, `customTemplateRepository`, `hashCustomTemplateToken()`.

- [ ] **Step 1: Write failing tests for state ownership and token hashing**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { hashCustomTemplateToken, isOwnedUsableIngest } from "./repository.ts";

test("hashes tokens deterministically without storing the plaintext token", () => {
  assert.equal(hashCustomTemplateToken("token-a"), hashCustomTemplateToken("token-a"));
  assert.notEqual(hashCustomTemplateToken("token-a"), hashCustomTemplateToken("token-b"));
});

test("accepts only ready, owned, unexpired, unconsumed ingests", () => {
  const now = new Date("2026-07-20T00:00:00.000Z");
  assert.equal(isOwnedUsableIngest({ userId: "u1", state: "ready", expiresAt: "2026-07-21T00:00:00.000Z", consumedAt: null }, "u1", now), true);
  assert.equal(isOwnedUsableIngest({ userId: "u2", state: "ready", expiresAt: "2026-07-21T00:00:00.000Z", consumedAt: null }, "u1", now), false);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test lib/custom-templates/repository.test.mts`
Expected: FAIL because the repository module is missing.

- [ ] **Step 3: Implement the object-store interface and S3 adapter**

```ts
export type StoredObjectHead = { contentType: string; sizeBytes: number };
export interface CustomTemplateStorage {
  createUploadUrl(input: { objectKey: string; contentType: string; sizeBytes: number }): Promise<{ url: string; headers: Record<string, string> }>;
  createReadUrl(objectKey: string, expiresInSeconds: number): Promise<string>;
  getHead(objectKey: string): Promise<StoredObjectHead>;
  getPrefix(objectKey: string, byteCount: number): Promise<Uint8Array>;
  putBytes(input: { objectKey: string; contentType: string; bytes: Uint8Array }): Promise<void>;
  deleteObject(objectKey: string): Promise<void>;
  getObjectBytes(objectKey: string): Promise<Uint8Array>;
}
```

Use `PutObjectCommand`, `HeadObjectCommand`, ranged `GetObjectCommand`, `DeleteObjectCommand`, and `getSignedUrl`. Object keys must be generated internally as `custom-template-quarantine/<userHash>/<ingestId>`; no route accepts an object key from the browser.

- [ ] **Step 4: Implement the PostgreSQL repository**

Create `custom_template_ingests` on first use with a unique `(user_id, idempotency_key)` constraint, indexed expiry/state columns, and all fields listed in the design. The repository interface must expose:

```ts
export interface CustomTemplateRepository {
  createOrGet(input: CreateIngestInput): Promise<CustomTemplateIngest>;
  findOwned(id: string, userId: string): Promise<CustomTemplateIngest | null>;
  findByTokenHash(tokenHash: string): Promise<CustomTemplateIngest | null>;
  markReviewing(id: string, userId: string): Promise<CustomTemplateIngest>;
  markReady(input: { id: string; userId: string; durationSeconds: number; tokenHash: string; expiresAt: string }): Promise<CustomTemplateIngest>;
  markFailed(input: { id: string; userId: string; state: "failed" | "rejected"; reasonCode: string }): Promise<CustomTemplateIngest>;
  reserve(id: string, userId: string): Promise<boolean>;
  releaseReservation(id: string, userId: string): Promise<boolean>;
  consume(id: string, userId: string, providerTaskId: string): Promise<boolean>;
  markDeleted(id: string, userId: string): Promise<void>;
  listCleanupCandidates(now: Date, limit: number): Promise<CustomTemplateIngest[]>;
}
```

State-changing SQL must include the expected current state in `WHERE` clauses so duplicate finalize, consume, and delete calls are idempotent.

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm test && pnpm typecheck`
Expected: token/state tests and all existing tests pass.

- [ ] **Step 6: Commit storage and persistence**

```bash
git add lib/custom-templates/storage.ts lib/custom-templates/repository.ts lib/custom-templates/repository.test.mts
git commit -m "feat: persist private custom templates"
```

---

### Task 3: Build SSRF-safe import, media signature checks, and fail-closed review

**Files:**
- Create: `lib/custom-templates/remote-video.ts`
- Create: `lib/custom-templates/remote-video.test.mts`
- Create: `lib/custom-templates/media.ts`
- Create: `lib/custom-templates/media.test.mts`
- Create: `lib/custom-templates/reviewer.ts`
- Create: `lib/custom-templates/reviewer.test.mts`
- Create: `lib/custom-templates/service.ts`

**Interfaces:**
- Consumes: storage/repository and domain contracts from Tasks 1-2.
- Produces: `downloadRemoteVideo()`, `detectVideoMime()`, `reviewCustomTemplate()`, `CustomTemplateService`.

- [ ] **Step 1: Write failing URL and signature tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicHttpsUrl, isForbiddenAddress } from "./remote-video.ts";

test("allows canonical HTTPS and rejects credentials, ports, and private IPs", () => {
  assert.equal(assertPublicHttpsUrl("https://cdn.example.com/video.mp4").hostname, "cdn.example.com");
  assert.throws(() => assertPublicHttpsUrl("http://cdn.example.com/video.mp4"));
  assert.throws(() => assertPublicHttpsUrl("https://user:pass@cdn.example.com/video.mp4"));
  assert.throws(() => assertPublicHttpsUrl("https://cdn.example.com:8443/video.mp4"));
  assert.equal(isForbiddenAddress("127.0.0.1"), true);
  assert.equal(isForbiddenAddress("169.254.169.254"), true);
  assert.equal(isForbiddenAddress("10.1.2.3"), true);
  assert.equal(isForbiddenAddress("2606:4700:4700::1111"), false);
});
```

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { detectVideoMime } from "./media.ts";

test("detects MP4 ftyp and WebM EBML signatures", () => {
  assert.equal(detectVideoMime(Uint8Array.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70])), "video/mp4");
  assert.equal(detectVideoMime(Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3])), "video/webm");
  assert.throws(() => detectVideoMime(Uint8Array.from([1, 2, 3, 4])));
});
```

- [ ] **Step 2: Run the focused tests and verify missing-module failures**

Run: `node --test lib/custom-templates/remote-video.test.mts lib/custom-templates/media.test.mts`
Expected: FAIL because both implementation modules are missing.

- [ ] **Step 3: Implement pinned DNS and bounded download**

`assertPublicHttpsUrl()` must require HTTPS, port 443/default, no credentials, and a hostname. `isForbiddenAddress()` must reject IPv4/IPv6 unspecified, loopback, private, link-local, multicast, reserved, documentation, and IPv4-mapped private ranges.

`downloadRemoteVideo()` must use an Undici `Agent` whose custom lookup returns only addresses already resolved and validated by `dns.promises.lookup({ all: true, verbatim: true })`. Handle at most three redirects manually, rebuild the pinned dispatcher for every target, set 5-second header/connect and 30-second body timeouts, and stop collecting bytes once the next chunk would exceed 52,428,800 bytes.

```ts
export type DownloadedRemoteVideo = {
  bytes: Uint8Array;
  contentType: string | null;
  finalUrl: URL;
};

export async function downloadRemoteVideo(
  rawUrl: string,
  dependencies: { lookup?: typeof dnsLookup; request?: typeof undiciRequest } = {},
): Promise<DownloadedRemoteVideo>;
```

- [ ] **Step 4: Implement authoritative review and media validation**

The review adapter creates a five-minute signed read URL and sends only that URL, ingest ID, declared MIME, and the fixed policy identifier to `CUSTOM_TEMPLATE_REVIEW_URL`. Require this response:

```ts
type ReviewResponse = {
  allowed: boolean;
  durationSeconds: number;
  detectedMime: "video/mp4" | "video/webm";
  reasonCodes?: string[];
};
```

Reject unknown shapes and network failures as `REVIEW_UNAVAILABLE`. Require signature MIME, reviewer MIME, and stored MIME to agree; enforce 3-15 seconds after review. Map blocked content to `REVIEW_BLOCKED` without exposing detailed reason codes to the browser.

- [ ] **Step 5: Implement the ingest coordinator**

`CustomTemplateService` coordinates only: it creates upload records and signed PUTs, finalizes stored objects, imports remote bytes, runs review, emits an opaque 32-byte base64url token, stores only its SHA-256 hash, and deletes objects after any terminal pre-generation failure. Each acquisition/review/storage operation remains in its own module.

- [ ] **Step 6: Run tests and checks**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: URL, signature, reviewer, and existing tests pass; lint/typecheck exit 0.

- [ ] **Step 7: Commit the secure ingest service**

```bash
git add lib/custom-templates
git commit -m "feat: validate and review custom videos"
```

---

### Task 4: Expose member-gated ingest, preview, deletion, and cleanup routes

**Files:**
- Create: `lib/custom-templates/route-guards.ts`
- Create: `app/api/templates/custom/upload/prepare/route.ts`
- Create: `app/api/templates/custom/upload/[ingestId]/finalize/route.ts`
- Create: `app/api/templates/custom/import/route.ts`
- Create: `app/api/templates/custom/[ingestId]/route.ts`
- Create: `app/api/templates/custom/[ingestId]/preview/route.ts`
- Create: `app/api/cron/custom-template-cleanup/route.ts`
- Create: `lib/custom-templates/routes.test.mts`

**Interfaces:**
- Consumes: `CustomTemplateService` and existing `auth`/`userHasActiveCreatorSubscription`.
- Produces: JSON route contracts used by the generator UI.

- [ ] **Step 1: Write failing guard and response-mapping tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { mapCustomTemplateError } from "./route-guards.ts";

test("maps stable custom-template failures without leaking details", () => {
  assert.deepEqual(mapCustomTemplateError({ code: "REVIEW_BLOCKED" }), {
    status: 403,
    body: { code: "REVIEW_BLOCKED", message: "This video could not be used because it does not meet our content policy." },
  });
  assert.equal(mapCustomTemplateError({ code: "UNSAFE_URL" }).status, 400);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test lib/custom-templates/routes.test.mts`
Expected: FAIL because `route-guards.ts` is missing.

- [ ] **Step 3: Implement the shared route guard**

The guard must return `404 FEATURE_DISABLED` when the server flag is off, `401 GOOGLE_AUTH_REQUIRED` without a session, and `402 CREATOR_REQUIRED` without the active Creator entitlement. Every route calls it before parsing or fetching user media.

- [ ] **Step 4: Implement prepare, finalize, and import routes**

Use Zod schemas with literal `rightsConfirmed: true` and idempotency keys of at least 12 characters. Prepare returns `201` with `{ ingestId, uploadUrl, uploadHeaders, expiresInSeconds: 600 }`. Finalize/import return `202` with `CustomTemplatePublicState`. Duplicate idempotency keys return the same owned ingest rather than creating a second object.

- [ ] **Step 5: Implement status, preview, delete, and cleanup**

`GET /api/templates/custom/:ingestId` returns only an owned record and a five-minute preview URL when ready. The plaintext custom token is returned exactly once by the successful finalize/import response and is never persisted or regenerated; only its hash is stored. `DELETE` is idempotent and deletes the private object before marking the record deleted.

The cron route requires `Authorization: Bearer ${CRON_SECRET}`, processes at most 100 cleanup candidates, and returns counts for deleted and failed deletions. Add the route to the existing deployment cron configuration if present; otherwise document the Vercel Cron path in `README.md`.

- [ ] **Step 6: Run tests and static checks**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: route mapping, existing unit tests, lint, and typecheck pass.

- [ ] **Step 7: Commit the route layer**

```bash
git add app/api/templates/custom app/api/cron/custom-template-cleanup lib/custom-templates README.md
git commit -m "feat: expose member custom template APIs"
```

---

### Task 5: Integrate approved custom sources with generation and Viggle

**Files:**
- Modify: `lib/providers/types.ts`
- Modify: `lib/providers/viggle-render.ts`
- Modify: `lib/providers/evolink-seedance.ts`
- Modify: `lib/providers/mock-seedance.ts`
- Modify: `app/api/dance/generate/route.ts`
- Modify: `lib/dance/types.ts`
- Create: `lib/providers/template-source.test.mts`
- Create: `lib/custom-templates/generation.ts`
- Create: `lib/custom-templates/generation.test.mts`

**Interfaces:**
- Consumes: `TemplateSource`, repository, and storage from Tasks 1-2.
- Produces: `resolveGenerationTemplateSource()`, provider request support for platform/custom sources.

- [ ] **Step 1: Write failing provider-source tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { assertProviderSupportsTemplateSource } from "./types.ts";

test("allows Viggle custom sources and rejects Seedance custom sources", () => {
  const custom = { kind: "custom", ingestId: "i1", objectKey: "private/i1", mimeType: "video/mp4" } as const;
  assert.doesNotThrow(() => assertProviderSupportsTemplateSource("viggle-v4-preview", custom));
  assert.throws(() => assertProviderSupportsTemplateSource("seedance-2.0-mini-reference-to-video", custom));
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test lib/providers/template-source.test.mts`
Expected: FAIL because the provider assertion is not defined.

- [ ] **Step 3: Replace raw `templateId` with the discriminated source**

```ts
export type DanceVideoRequest = {
  idempotencyKey: string;
  userId: string;
  uploadObjectKey: string;
  sourceImageFile?: File;
  templateSource: TemplateSource;
  aspectRatio: AspectRatio;
  modelId: DanceModelId;
};
```

Keep `DanceGenerationTask.templateId` for platform compatibility; use the stable display value `custom-member-video` for a custom task and add optional `customTemplateIngestId`.

- [ ] **Step 4: Resolve one and only one generation source**

Change the route schema so `templateId` and `customTemplateToken` are optional, then enforce XOR. Platform IDs must still resolve to public templates. Custom tokens must resolve by hash, belong to the session user, be ready, unexpired, unconsumed, and require `viggle-v4-preview` plus an active Creator subscription.

All custom validation happens before prompt moderation and provider submission. Do not accept an object key, ingest ID, MIME, or URL from the generation request.

- [ ] **Step 5: Send custom bytes to Viggle and consume atomically**

`appendDrivingVideo()` switches on `templateSource.kind`. Platform sources read the existing public file. Custom sources read the private object through `CustomTemplateStorage`, build a Blob with the verified MIME, and use a neutral filename. Before provider submission, atomically move the ingest from `ready` to `reserved`; a concurrent request then fails without reaching Viggle. After Viggle returns a provider job ID, move it to `consumed` with that ID. If provider submission throws, atomically release the reservation back to `ready` until expiry.

- [ ] **Step 6: Run provider and route tests**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: custom source, XOR, ownership, expiry, provider compatibility, and existing tests pass.

- [ ] **Step 7: Commit generation integration**

```bash
git add lib/providers lib/custom-templates app/api/dance/generate/route.ts lib/dance/types.ts
git commit -m "feat: generate from approved member videos"
```

---

### Task 6: Build the member custom-template picker and explicit generator readiness

**Files:**
- Create: `components/generator/custom-template-picker.tsx`
- Create: `components/generator/custom-template-client.ts`
- Create: `lib/dance/generator-readiness.ts`
- Create: `lib/dance/generator-readiness.test.mts`
- Modify: `components/generator/generator-panel.tsx`
- Modify: `app/page.tsx`
- Modify: `app/ai-dance-generator/page.tsx`

**Interfaces:**
- Consumes: route responses from Task 4 and generation contract from Task 5.
- Produces: `CustomTemplatePicker`, `uploadCustomTemplate()`, `importCustomTemplate()`, `getGeneratorReadiness()`.

- [ ] **Step 1: Write failing readiness tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { getGeneratorReadiness } from "./generator-readiness.ts";

test("explains the first blocking condition", () => {
  assert.deepEqual(getGeneratorReadiness({ hasImage: false, isBusy: false, templateState: "platform", signedIn: true, hasCreatorAccess: true }), {
    ready: false,
    message: "Upload or choose a reference image.",
  });
  assert.equal(getGeneratorReadiness({ hasImage: true, isBusy: false, templateState: "reviewing", signedIn: true, hasCreatorAccess: true }).message, "Your custom video is still being reviewed.");
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test lib/dance/generator-readiness.test.mts`
Expected: FAIL because the readiness helper is missing.

- [ ] **Step 3: Implement the direct-upload client**

`uploadCustomTemplate()` validates type/size, calls prepare, performs an `XMLHttpRequest` PUT with the exact returned headers so progress can be reported, then calls finalize. It accepts an `AbortSignal`, aborts replacement uploads, and never sends a signed URL to analytics or console output.

`importCustomTemplate()` posts the direct HTTPS URL only after the user presses `Import video`. Both functions normalize stable API codes into a typed client error.

- [ ] **Step 4: Implement the focused picker component**

`CustomTemplatePicker` owns only custom-template form state and emits `onReady(selection)` or `onClear()`. It renders the six confirmed states, rights confirmation, file/URL validation, upload progress, review state, video metadata, expiry, preview controls, and Remove/Replace. Signed-out and non-member states render Google sign-in or Creator checkout actions instead of inactive upload decoration.

- [ ] **Step 5: Integrate the picker without growing the panel further**

Keep platform carousel state in `GeneratorPanel`; move custom state into the new component. Pass both `signedIn` and `hasCreatorMonthlyAccess` from the two server pages. Selecting a ready custom video fixes `selectedModelId` to `standardDanceModelId`, disables the model cards with an explanation, and submits `customTemplateToken` instead of `templateId`. Clearing it restores the last platform template and model.

- [ ] **Step 6: Show explicit readiness and prevent redundant updates**

Render `getGeneratorReadiness().message` below the Generate button whenever it is disabled. Tab, template, model, reference-image, and ratio handlers must return early when the requested value is already selected. Add `aria-selected`/`aria-pressed` consistently.

- [ ] **Step 7: Run tests and checks**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: readiness tests and all static checks pass.

- [ ] **Step 8: Commit the member UI**

```bash
git add components/generator app/page.tsx app/ai-dance-generator/page.tsx lib/dance
git commit -m "feat: add member custom video picker"
```

---

### Task 7: Fix the remaining Clarity dead clicks and Turnstile duplicate submission

**Files:**
- Modify: `components/sections/template-grid.tsx`
- Modify: `components/generator/generator-panel.tsx`
- Modify: `components/auth/register-turnstile-form.tsx`
- Modify: `app/api/auth/register/route.ts`
- Modify: `app/register/page.tsx`
- Modify: `lib/turnstile.ts`
- Modify: `lib/turnstile.test.mts`
- Create: `lib/dance/template-selection.ts`
- Create: `lib/dance/template-selection.test.mts`

**Interfaces:**
- Consumes: existing public templates and Turnstile errors.
- Produces: `getInitialTemplateId()`, `getTurnstileRegisterErrorCode()`.

- [ ] **Step 1: Add failing query-selection and Turnstile mapping tests**

```ts
test("accepts only an existing public query template", () => {
  assert.equal(getInitialTemplateId("k-pop", [{ id: "hip-hop" }, { id: "k-pop" }]), "k-pop");
  assert.equal(getInitialTemplateId("../../secret", [{ id: "hip-hop" }]), "hip-hop");
});

test("maps an expired or duplicate token to a retryable code", () => {
  assert.equal(getTurnstileRegisterErrorCode(new TurnstileVerificationError("failed", ["timeout-or-duplicate"])), "turnstile_expired");
});
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node --test lib/dance/template-selection.test.mts lib/turnstile.test.mts`
Expected: FAIL because the new helpers are absent.

- [ ] **Step 3: Turn every template CTA into navigation**

Wrap each full template card in `next/link` targeting `/ai-dance-generator?template=${encodeURIComponent(template.id)}#generator`. Remove `aria-hidden` from the CTA copy. Give the generator section `id="generator"`; initialize selection from the validated page search parameter and preserve platform-template fallback.

- [ ] **Step 4: Make the preview video honestly interactive**

Add `controls`, keep `playsInline`, remove forced `autoPlay` on the large preview, and leave muted looping autoplay only on passive thumbnail cards. Ensure the bottom metadata overlay has `pointer-events-none` so native controls remain reachable.

- [ ] **Step 5: Lock Turnstile immediately and map errors**

Use `onSubmit` to synchronously set `isSubmitting`; disable the form button and widget interaction, render a spinner plus `Continuing…`, and ignore later submits. Reset the lock only if the browser cancels submission without navigation.

Map `timeout-or-duplicate` to `turnstile_expired`, missing response to `turnstile_required`, transport/upstream failure to `turnstile_unavailable`, and missing configuration to `turnstile_not_configured`. Log known Cloudflare error codes server-side without token values.

- [ ] **Step 6: Run tests and static checks**

Run: `pnpm test && pnpm lint && pnpm typecheck`
Expected: template selection, Turnstile, lint, and typecheck pass.

- [ ] **Step 7: Commit the Clarity fixes**

```bash
git add components/sections/template-grid.tsx components/generator/generator-panel.tsx components/auth app/api/auth/register app/register lib/turnstile* lib/dance/template-selection*
git commit -m "fix: remove mobile dead clicks"
```

---

### Task 8: Add funnel analytics, privacy copy, rollout guardrails, and cleanup documentation

**Files:**
- Create: `lib/analytics/client.ts`
- Create: `lib/analytics/client.test.mts`
- Modify: `components/generator/custom-template-picker.tsx`
- Modify: `components/generator/generator-panel.tsx`
- Modify: `components/sections/pricing-checkout-button.tsx`
- Modify: `app/privacy/page.tsx`
- Modify: `app/terms/page.tsx`
- Modify: `app/acceptable-use/page.tsx`
- Modify: `README.md`
- Modify: `next.config.mjs`

**Interfaces:**
- Consumes: custom picker/generator state.
- Produces: `trackProductEvent(name, properties)` with a strict event-name union.

- [ ] **Step 1: Write the failing analytics redaction test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAnalyticsProperties } from "./client.ts";

test("drops media URLs, tokens, filenames, and object keys", () => {
  assert.deepEqual(
    sanitizeAnalyticsProperties({ source: "upload", url: "https://signed", token: "secret", fileName: "person.mp4", sizeBucket: "10-50mb" }),
    { source: "upload", sizeBucket: "10-50mb" },
  );
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test lib/analytics/client.test.mts`
Expected: FAIL because the analytics client is missing.

- [ ] **Step 3: Implement a single typed GA4 event adapter**

Declare the event union from the design and push via `window.gtag?.("event", name, safeProperties)`. Allow only enumerated dimensions such as `source`, `state`, `model`, `reasonCode`, `sizeBucket`, and `durationBucket`; discard every unknown key. Calls must be no-ops during SSR or before GA4 loads.

- [ ] **Step 4: Instrument the product funnel**

Emit upload/import start, transfer complete, review ready/failed, removed, template selected, generate click/start/success/failed, auth start, and checkout start at state-transition boundaries. Do not emit inside render functions or on repeated polling responses.

- [ ] **Step 5: Update legal and operational copy**

State that member-supplied driving videos require authorization, undergo automated safety review, are not used for training, remain private, and are deleted after removal, rejection, consumption, failure, or 24-hour expiry. Document required environment variables, private bucket CORS restricted to the canonical origin, cron cleanup, review-service contract, and the default-off feature flag.

- [ ] **Step 6: Add security headers and Clarity masking hooks**

Add only the required storage/review origins to `connect-src` through the existing security-header mechanism or a focused `headers()` entry. Apply `data-clarity-mask="true"` to URL, filename, preview, and status containers that could expose user media metadata.

- [ ] **Step 7: Run tests and production build**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: all commands exit 0.

- [ ] **Step 8: Commit analytics and policy updates**

```bash
git add lib/analytics components app/privacy app/terms app/acceptable-use README.md next.config.mjs
git commit -m "feat: measure and govern custom templates"
```

---

### Task 9: Verify mobile behavior and production gating end to end

**Files:**
- Modify only files required by defects found during verification.
- Update: `docs/superpowers/plans/2026-07-20-mobile-custom-template-fixes.md` checkboxes as tasks complete.

**Interfaces:**
- Consumes: the complete implementation.
- Produces: an evidence-backed release decision and the GA4/GSC optimization backlog requested by the user.

- [x] **Step 1: Run the complete automated suite**

Run: `pnpm test && pnpm lint && pnpm typecheck && pnpm build`
Expected: every command exits 0 with no new warnings attributable to this change.

- [x] **Step 2: Verify the feature-off production path**

With `CUSTOM_TEMPLATE_FEATURE_ENABLED=false`, open 390×844 and 412×915 viewports. Upload/URL tabs must show a clear unavailable state or remain hidden according to the final UI copy; platform generation, previews, links, login, and checkout must remain functional.

- [ ] **Step 3: Verify member upload and import with test infrastructure**

With a test Creator entitlement, private bucket, and stub review endpoint:

1. Upload valid MP4 and WebM files at 3-second, 15-second, and near-50-MB boundaries.
2. Confirm progress, review, preview, fixed Viggle model, single consumption, replacement, and deletion.
3. Import a public HTTPS direct file and reject HTTP, credentials, alternate ports, private/metadata hosts, fourth redirects, >50-MB streams, and 30-second timeouts.
4. Confirm signed-out and non-member sessions cannot create, inspect, preview, delete, or consume another user's ingest.

Expected: each approved case reaches one Viggle request; every rejected case stays out of Viggle and keeps generation allowance untouched.

- [ ] **Step 4: Re-run the exact Clarity interaction paths**

On mobile Safari and Chrome emulation, verify upload/URL tap targets, large preview playback, full-card `TRY NOW` navigation, selected controls, disabled-reason copy, and two rapid Turnstile taps. Expected: no actionable-looking no-ops and no duplicate network submissions.

- [ ] **Step 5: Inspect analytics and privacy behavior**

Use GA4 DebugView and browser network inspection. Confirm the event sequence is emitted once per transition and contains no URL, token, filename, object key, signed credential, or media payload. Confirm Clarity masks custom-template inputs and preview metadata.

- [x] **Step 6: Write the requested optimization backlog**

Create `docs/optimization/2026-07-20-ga4-gsc-backlog.md` with P0/P1/P2 items covering product-funnel events, homepage/tool-page deduplication, sitemap/indexing and redirects, generator-page depth, template hub, tutorial/comparison content, safe indexable twerk demand validation, mobile media performance, and GA4 attribution/session reconciliation. For every item include evidence, expected impact, owner type, success metric, and validation window.

- [ ] **Step 7: Commit verification fixes and backlog**

```bash
git add .env.example README.md next.config.mjs package.json pnpm-lock.yaml app components lib docs
git diff --cached --check
git commit -m "docs: add launch verification and optimization backlog"
```

- [ ] **Step 8: Push and update the draft pull request**

Run: `git push -u origin agent/member-custom-template-design`
Expected: the existing draft PR updates with all implementation commits; keep it draft until production storage, reviewer, and mobile verification evidence are complete.
