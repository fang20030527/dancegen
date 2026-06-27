# DanceGen AI

DanceGen AI is an MVP web framework for a conservative AI dance video generator. The product flow follows `mvp PRD.md`: upload one clear adult solo photo, choose a low-risk template, generate a 5-second silent watermarked preview, then pay to unlock HD/no-watermark download.

## Current Scope

- Next.js App Router + TypeScript + Tailwind web shell
- Public pages: `/`, `/ai-dance-generator`, `/ai-twerk-generator`, `/pricing`, `/terms`, `/privacy`, `/refund-policy`, `/payment/success`, `/payment/cancel`
- Internal scaffold: `/admin`
- API stubs for Google login gate, upload pre-check, generation submission/status, Creem checkout/webhook, templates, and complaints
- `ModelProvider` abstraction with a mock Seedance/EvoLink implementation
- Conservative template catalog with public low-risk templates and internal-only twerk block
- Task status machine matching the PRD lifecycle

## Not Connected Yet

API keys, database persistence, real Google OAuth, real Creem payments, model calls, R2 transfer, and real safety classifiers are intentionally stubbed. Fill `.env.local` from `.env.example` when integrating those services.

## Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```

## Template Decisions

The `liuxiaopai-demo` template is used as the architectural reference, not copied wholesale. This project keeps the SaaS layers that match the PRD and removes generic chat, image generation, docs, newsletter, credit packs, annual billing, password auth, and full i18n from the first version.
