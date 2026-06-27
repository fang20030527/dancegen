# CLAUDE.md

This file guides coding agents working in the DanceGen AI repository.

## Product Boundary

DanceGen AI is a creator-facing MVP for generating short AI dance videos from one uploaded adult solo photo. The MVP validates generation quality, safety, unit cost, and willingness to pay for HD/no-watermark unlocks.

Keep the product narrower than a generic AI SaaS template:

- Public generation is only for low-risk dance templates.
- `/ai-twerk-generator` is SEO/demand validation only. It must not expose public generation.
- MVP UI is English only.
- Google is the only planned login provider.
- No free prompt, BGM, public gallery, full history page, annual plans, credit packs, or email/password auth.

## Architecture

- Framework: Next.js App Router + React + TypeScript.
- Styling: Tailwind CSS with local components.
- Auth target: Better Auth + Google OAuth. Current route is a demo-session stub.
- Payment target: Creem checkout + webhook. Webhook is the production source of truth.
- Persistence target: PostgreSQL + Drizzle for users, tasks, entitlements, payments, audit logs, and templates.
- Storage target: R2 or S3-compatible storage for uploads, generated videos, and limited-time downloads.
- Model target: Seedance via EvoLink first, always behind `ModelProvider`.

## Core Domain Rules

- Use generation allowance, not public credits.
- Single-video unlock controls HD/no-watermark download for one successful task.
- Failures, timeouts, transfer errors, and output safety blocks refund reserved generation allowance.
- Generation tasks must be idempotent and recoverable.
- Valid task states are defined in `lib/dance/types.ts` and transitions in `lib/dance/state-machine.ts`.
- Provider-specific logic must stay in `lib/providers/`; pages and route handlers should depend on interfaces.

## Safety Rules

Input review must conservatively reject minors, suspected minors, public figures, unauthorized third parties, group images, anime/virtual characters, nude/explicit images, swimwear/underwear, severe face/body occlusion, and uncertain cases.

Output review failures must not show previews, frames, or downloads. They should return a generic safety failure and refund generation allowance.

## Public Routes

- `/`
- `/ai-dance-generator`
- `/ai-twerk-generator`
- `/pricing`
- `/terms`
- `/privacy`
- `/refund-policy`
- `/payment/success`
- `/payment/cancel`

Do not add `/admin` to public navigation, sitemap, or marketing links.

## Launch Blockers

Before production launch, complete the blocker list in `mvp PRD.md`, including 100-300 real sample evaluation, at least two provider evaluations, supplier data terms review, real input/output safety, resumable transfer, idempotent callbacks, deletion, complaints, admin tools, and blocked public twerk generation.

## Development Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
```
