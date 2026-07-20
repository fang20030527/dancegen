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
pnpm lint
pnpm typecheck
pnpm build
```

## Scheduled cleanup

Configure a Vercel Cron request to `GET /api/cron/custom-template-cleanup` and set
`CRON_SECRET` in the deployment environment. The route accepts only
`Authorization: Bearer $CRON_SECRET`, processes at most 100 expired or terminal
custom-template objects per run, and safely retries failed deletions on a later run.

## Template Decisions

The `liuxiaopai-demo` template is used as the architectural reference, not copied wholesale. This project keeps the SaaS layers that match the PRD and removes generic chat, image generation, docs, newsletter, credit packs, annual billing, password auth, and full i18n from the first version.
