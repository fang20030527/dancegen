# Mobile Interaction and Member Custom Template Design

**Date:** 2026-07-20
**Status:** Approved implementation baseline
**Product:** DanceClip AI

## Objective

Fix the mobile dead-click and duplicate-submit behavior observed in Microsoft Clarity, while turning the currently non-functional custom video template controls into a production-oriented feature for active members.

The first release supports one-time custom driving videos through local upload or HTTPS video-file URL import. Custom driving videos are reviewed before generation, expire after 24 hours, and are submitted only to Viggle because the current Seedance integration does not accept a driving video.

## Confirmed Product Decisions

- Custom video templates are available only to signed-in users with an active Creator subscription, using the repository's existing member-entitlement check.
- URL import accepts direct HTTPS video-file URLs only. Social platform pages and link extraction are out of scope.
- Accepted formats are MP4 and WebM.
- Accepted duration is 3 through 15 seconds, inclusive.
- Maximum downloaded or uploaded size is 50 MB.
- Custom templates are single-generation assets, not reusable personal-library items.
- An approved custom template is valid for 24 hours.
- Custom templates use Viggle only in the first release.
- Platform templates retain the existing model-selection behavior.
- A custom template must pass validation, rights confirmation, and safety review before it can be used.
- Validation, review, download, transfer, provider, timeout, and safety failures do not consume generation allowance.

## Product Boundary Change

The product boundary expands from platform-curated motion templates to member-supplied driving videos. Public anonymous generation remains limited to platform-curated, low-risk templates. The restricted `/ai-twerk-generator` route remains non-generative; this work does not enable restricted public generation.

The acceptable-use policy, privacy policy, terms, and member-facing copy must describe member-supplied driving videos, the rights confirmation, safety review, 24-hour retention window, and enforcement behavior.

## Non-Goals

- Social URL parsing for TikTok, YouTube, Instagram, or similar platforms.
- A reusable personal template library.
- Anonymous or non-member custom-template generation.
- Free-text motion prompts.
- Custom-template use with Seedance until its provider contract supports a driving video.
- Public gallery, sharing, template publishing, or community discovery.
- Relaxing the existing source-image or output-safety policies.

## User Experience

### Template source controls

The Video Template section keeps three tabs: `Library`, `Upload`, and `URL`.

- `Library` lists the platform templates and behaves as it does today.
- `Upload` presents a real file picker and drop target for MP4 or WebM.
- `URL` presents a text input and explicit `Import video` action. Typing does not start a network request.
- Signed-out users selecting `Upload` or `URL` receive a Google sign-in prompt.
- Signed-in users without an active Creator subscription receive an upgrade prompt.
- Access checks also run on the server; the client gate is informational only.

The active tab, selected platform template, and selected aspect ratio expose selected state through both styling and accessibility attributes. Selecting the current value does not dispatch redundant state changes.

### Import state machine

Custom-template import has the following visible states:

1. `idle` — no custom template is selected.
2. `validating` — basic client validation and server request startup.
3. `transferring` — upload or bounded URL download is in progress.
4. `reviewing` — media metadata and safety review are running.
5. `ready` — the template is approved and can be previewed or generated.
6. `failed` — the operation ended with a recoverable, user-facing error.

Only one import request can be active at a time. The import action is disabled while work is active. A failure returns the UI to a retryable state without consuming generation allowance.

When ready, the UI shows the video preview, duration, size, expiry information, and `Remove` and `Replace` actions. Removing or replacing the template invalidates the prior token and schedules the prior object for deletion.

### Generation readiness

The Generate button is enabled only when all requirements are satisfied. When it is unavailable, the closest actionable reason is shown next to the button, including:

- upload a reference image;
- select or finish reviewing a template;
- confirm content rights;
- sign in;
- activate membership for a custom template; or
- select a compatible model.

Selecting a custom template automatically fixes the model to Viggle and explains why. Returning to a platform template restores the existing model selector.

### Clarity interaction fixes

- The main preview video receives real play/pause behavior and native-accessible controls.
- Every `TRY NOW` card becomes a real link to `/ai-dance-generator?template=<templateId>`.
- The generator reads and validates the template query parameter, selects an eligible platform template, and scrolls/focuses the relevant generator region without accepting arbitrary IDs.
- Already-selected tabs, templates, and ratios do not dispatch redundant updates.
- Turnstile registration locks immediately after form submission and shows `Continuing…`.
- Turnstile errors distinguish expired or duplicate tokens, transient verification failures, and missing configuration.

## Service Architecture

### Custom-template ingest boundary

Local upload and URL import use separate acquisition paths and then share the same service pipeline. Local files upload directly from the browser to the private quarantine bucket through a short-lived presigned PUT because the 50 MB product limit exceeds Vercel's function request-body limit. URL imports are downloaded by the server through the bounded downloader.

1. Authenticate the user.
2. Verify the active Creator subscription through the existing member-entitlement service.
3. Validate the declared request shape.
4. Acquire the file through a presigned private-object upload or bounded URL download.
5. Verify file signature, MIME, size, duration, and supported container.
6. Store the object in a non-public quarantine namespace.
7. Run template safety review.
8. Persist the review decision and audit metadata.
9. On approval, issue an opaque, short-lived `customTemplateToken` tied to the user and object.
10. On rejection or failure, delete or schedule deletion of the quarantined object.

The browser never receives a permanent public object URL. Preview access uses an authenticated, short-lived response or signed URL.

### API contracts

`POST /api/templates/custom/upload/prepare` accepts JSON:

- `fileName`: display-only source filename;
- `contentType`: `video/mp4` or `video/webm`;
- `sizeBytes`: integer from 1 through 52,428,800;
- `rightsConfirmed`: literal `true`;
- `idempotencyKey`: client-generated request identifier.

It returns an ingest identifier, a short-lived presigned PUT URL restricted to the ingest's private object key, and the exact upload headers. The browser uploads the bytes directly to that URL and never receives reusable storage credentials.

`POST /api/templates/custom/upload/:ingestId/finalize` accepts the idempotency key. It verifies object existence and authoritative size through the object store, then starts metadata validation and safety review. A client-reported filename, MIME, or size is never treated as authoritative.

`POST /api/templates/custom/import` accepts JSON:

- `url`: direct HTTPS video-file URL;
- `rightsConfirmed`: literal `true`;
- `idempotencyKey`: client-generated request identifier.

The finalize and URL-import endpoints return `202 Accepted` with an ingest identifier while processing. A status endpoint returns the state, safe user message, preview authorization when ready, media metadata, and expiry. A delete endpoint invalidates the ingest and schedules object deletion.

The generation endpoint accepts exactly one template selection:

- a platform `templateId`; or
- a `customTemplateToken`.

Requests containing both or neither are rejected. For a custom token, the generation endpoint revalidates ownership, membership, approval state, expiry, one-time-use state, and Viggle compatibility before reserving generation allowance.

### Provider boundary

The provider request uses a discriminated template source:

- `{ kind: "platform"; templateId: string }`; or
- `{ kind: "custom"; objectKey: string; mimeType: "video/mp4" | "video/webm" }`.

The Viggle adapter converts either source into its `driving_video` multipart field. Provider-specific file handling remains in `lib/providers/`. The Seedance adapter rejects custom sources at the type or provider-selection boundary rather than silently translating them to text.

## Persistence and Lifecycle

A persistent custom-template ingest record stores only operational metadata:

- ingest ID and user ID;
- idempotency key;
- source kind (`upload` or `url`);
- private object key;
- verified MIME, byte size, and duration;
- ingest and review state;
- normalized reason code;
- created, approved, expires, consumed, and deleted timestamps;
- provider task ID when consumed;
- audit references required for abuse investigation.

The record has a uniqueness constraint on user ID plus idempotency key. The token is opaque and resolves server-side to the record; it does not embed a user-controlled object URL.

Approved assets expire 24 hours after approval. A successful generation submission marks the asset consumed so it cannot start a second generation. Removed, rejected, failed, consumed, and expired objects are deleted by an idempotent cleanup operation. Cleanup failure is retried and recorded without exposing the object publicly.

## URL Import Security

URL import allows HTTPS only. Before every outbound request and after every redirect, the service resolves the hostname and rejects loopback, link-local, private, multicast, reserved, and cloud-metadata destinations for both IPv4 and IPv6. It also rejects credentials in URLs and non-standard destination ports.

The downloader applies:

- a 5-second connection timeout and 30-second total-download timeout;
- a maximum of three redirects;
- a hard 50 MB streaming byte limit independent of `Content-Length`;
- container-signature verification independent of response `Content-Type`;
- no forwarding of cookies, authorization headers, or user headers;
- no arbitrary response body in logs or error messages.

DNS resolution is checked again for each connection target to reduce DNS-rebinding risk. A URL that cannot be safely verified is rejected rather than fetched.

The private storage bucket must allow CORS PUT requests only from the canonical DanceClip origin with the required content headers. Presigned upload URLs expire after ten minutes, cannot select an arbitrary object key, and are unusable for reads.

## Safety and Rights Review

The user must confirm ownership or authorization for the driving video. The review conservatively blocks nudity or explicit sexual content, minors or suspected minors, public figures, unauthorized third parties, group content, violence, and uncertain cases. The driving video review supplements rather than replaces source-image and output review.

Rejected assets are not previewed, transferred to the generation provider, or counted against generation allowance. User-facing copy remains generic; detailed signals and reason codes are limited to audit logs.

This design requires a real video-capable safety reviewer before production enablement. If the reviewer is unavailable, imports fail closed with a retryable service-unavailable response.

## Error Model

API responses use stable codes and safe copy. Required categories include authentication, membership, invalid format, file too large, invalid duration, unsafe URL, download timeout, review unavailable, review blocked, token expired, token already consumed, and provider transfer failure.

The UI maps each category to one next action. Unexpected server errors use a request correlation ID and generic message. Detailed URLs, provider payloads, review signals, and stack traces are never sent to the browser.

Generation allowance is reserved only after the custom token passes all checks. Any failure after reservation follows the existing refund requirement for failure, timeout, transfer error, or output safety block.

## Analytics and Observability

The UI and server emit funnel events with source and state dimensions but no media URLs or user media:

- `custom_template_upload_start`
- `custom_template_import_start`
- `custom_template_transfer_complete`
- `custom_template_review_ready`
- `custom_template_review_failed`
- `custom_template_removed`
- `select_template`
- `generate_click`
- `generate_start`
- `generate_success`
- `generate_failed`
- `auth_start`
- `auth_success`
- `checkout_start`
- `purchase`

Operational metrics cover import latency, safety-review latency, rejection rate, expiry rate, cleanup lag, provider transfer failures, duplicate requests, and failures by stable reason code. Clarity must mask inputs and must not capture direct media URLs or signed preview credentials.

## Testing Strategy

### Unit tests

- File signature, MIME, size, and duration boundary validation.
- HTTPS URL normalization and rejection of unsafe host/address classes.
- Redirect revalidation, byte limit, timeout, and DNS-rebinding defenses.
- Custom token ownership, expiry, approval, and one-time consumption.
- Platform/custom discriminated template-source behavior.
- Turnstile error-code normalization.
- Generator readiness messages and query-template validation.

### Route and service tests

- Authentication and active-member enforcement on every custom-template route.
- Idempotent upload/import requests.
- Rejected and unavailable review flows fail closed and do not consume allowance.
- Generation rejects both/neither template source and invalid custom tokens.
- Viggle receives an approved driving video; Seedance cannot receive a custom source.
- Cleanup remains safe and repeatable for removed, rejected, consumed, and expired assets.

### Browser verification

Verify the recorded mobile paths on iOS Safari-sized and Android Chrome-sized viewports:

- Upload and URL controls respond and show progress.
- Repeat taps cannot submit multiple import or Turnstile requests.
- Preview video plays and pauses.
- `TRY NOW` navigates and selects the intended template.
- Selected controls do not behave like actionable no-op targets.
- Generate explains every disabled condition.
- Removing and replacing a custom template clears stale state.

Run `pnpm lint`, the repository test command established by the implementation plan, `pnpm typecheck`, and `pnpm build` before handoff.

## Rollout

Custom templates ship behind a server-side feature flag. Enable them only after storage, persistent ingest records, video safety review, authenticated preview delivery, cleanup, and provider transfer are verified in the production environment. Begin with a small member cohort, monitor safety and transfer failures, then expand. Disabling the flag hides new custom imports while preserving cleanup and status handling for existing ingests.

## Acceptance Criteria

- Every interactive element identified in the Clarity recordings either performs a real action or exposes a clear disabled state.
- An active member can upload or import an eligible driving video, pass review, preview it, and submit exactly one Viggle generation.
- A signed-out or non-member user cannot create, preview, or consume a custom-template token.
- Unsupported, oversized, out-of-duration, unsafe, expired, or already-consumed templates never reach Viggle.
- URL import cannot reach private or metadata-network destinations and cannot download more than 50 MB.
- Review and transfer failures do not consume generation allowance.
- Temporary objects are non-public and are deleted after removal, rejection, consumption, failure, or expiry.
- Turnstile and generator actions are protected against duplicate mobile submissions.
- Analytics expose the generator funnel without recording user media or secret URLs.
