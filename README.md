# DanceClip AI

DanceClip AI is a web framework for a conservative AI dance video generator. The product flow follows `mvp PRD.md`: upload one clear adult solo photo, choose a low-risk template, generate a 5-second silent watermarked preview, then subscribe for HD/no-watermark downloads.

## Current Scope

- Next.js App Router + TypeScript + Tailwind web shell
- Public pages: `/`, `/ai-dance-generator`, `/ai-twerk-generator`, `/pricing`, `/terms`, `/privacy`, `/refund-policy`, `/payment/success`, `/payment/cancel`
- Internal scaffold: `/admin`
- API routes for Google login gate, upload pre-check, generation submission/status, Creem checkout/webhook, templates, and complaints
- `ModelProvider` abstraction with Viggle as the default public generator and EvoLink Seedance for member generation
- Conservative template catalog with public low-risk templates and internal-only twerk block
- Task status machine matching the PRD lifecycle

## Not Connected Yet

Database persistence, real Google OAuth, real Creem payment settlement, R2 transfer, and real safety classifiers are intentionally stubbed or pending production hardening. Fill `.env.local` from `.env.example` when integrating those services.

## Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

## Scheduled cleanup

Configure a Vercel Cron request to `GET /api/cron/custom-template-cleanup` and set
`CRON_SECRET` in the deployment environment. The route accepts only
`Authorization: Bearer $CRON_SECRET`, processes at most 100 expired or terminal
custom-template objects per run, and safely retries failed deletions on a later run.

## Member custom-template rollout

Custom driving videos are a Creator-member feature and are disabled by default. Keep
`CUSTOM_TEMPLATE_FEATURE_ENABLED=false` until PostgreSQL persistence, private object storage,
the safety-review service, Viggle transfer, and scheduled cleanup have all been verified in the
production environment. Disabling the flag blocks new prepare/import/finalize requests while
preserving owner status, preview, removal, and cron cleanup for existing ingests.

Required settings when enabling the feature are:

- `DATABASE_URL`
- `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_BUCKET`
- `CUSTOM_TEMPLATE_REVIEW_URL` and `CUSTOM_TEMPLATE_REVIEW_API_KEY`
- `CRON_SECRET`
- `VIGGLE_API_URL`, `VIGGLE_API_KEY`, and `VIGGLE_MODEL`

The custom-template bucket must be private. Its browser CORS policy must permit only the canonical
production origin, only `PUT`, and only the exact signed request header (`Content-Type`). Do not use
`*` for origins or headers. For the current canonical deployment:

```json
[
  {
    "AllowedOrigins": ["https://www.danceclip.org"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 600
  }
]
```

`S3_ENDPOINT` is normalized to an origin and added to the browser's `connect-src` policy so the
presigned `PUT` can run. No path, credentials, or query string is copied into the policy. The review
URL is deliberately excluded because review is server-to-server and must not become a browser
destination. Before enabling the feature, verify that a prepared upload URL uses that exact origin;
providers that rewrite signed requests to a bucket subdomain require an aligned endpoint or an
intentional CSP update.

### Review-service contract

DanceClip sends a server-side `POST` to `CUSTOM_TEMPLATE_REVIEW_URL` with
`Authorization: Bearer $CUSTOM_TEMPLATE_REVIEW_API_KEY` and JSON containing `mediaUrl` (a private
five-minute read URL), `ingestId`, `declaredMime`, and policy `danceclip-custom-template-v1`. The
service must answer within 30 seconds with strict JSON:

```json
{
  "allowed": true,
  "durationSeconds": 8.2,
  "detectedMime": "video/mp4",
  "reasonCodes": []
}
```

`detectedMime` must be `video/mp4` or `video/webm`; duration must be 3–15 seconds. Timeouts,
non-2xx responses, malformed JSON, MIME disagreement, and uncertain safety results fail closed.
Provider details and review signals must not be returned to the browser or analytics.

## Template Decisions

The `liuxiaopai-demo` template is used as the architectural reference, not copied wholesale. This project keeps the SaaS layers that match the PRD and removes generic chat, image generation, docs, newsletter, credit packs, annual billing, password auth, and full i18n from the first version.
