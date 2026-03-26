# Real Estate Video MVP

Collaborative SaaS MVP for brokers:

- Image upload -> camera preset -> render request
- Wallet + credits
- Stripe top-up (feature-flagged)
- Runpod render queue (feature-flagged)
- Team workflow with PR + Vercel preview

## Stack

- Next.js 16 + TypeScript
- Prisma (current local dev uses SQLite file)
- Auth.js / NextAuth
- Stripe
- Runpod
- S3-compatible storage (with local fallback)

## Team Workflow (Locked)

- Branches:
  - `feat/ui-*`
  - `feat/api-*`
  - `fix/*`
- `main` should be protected in GitHub.
- All merges through PR.
- Each PR must pass:
  - `npm run lint`
  - `npm run build`
- Each PR should include Vercel preview URL + screenshots.

See [CONTRIBUTING.md](/H:/00001.app/real-estate-video-mvp/CONTRIBUTING.md).

## Scripts

```bash
npm install
npm run dev
npm run lint
npm run build
npm run prisma:generate
npm run prisma:push
npm run db:seed
```

## Local Setup

1. Create `.env.local` from `.env.example`
2. Install dependencies
3. Run Prisma push + seed
4. Start dev server

```bash
copy .env.example .env.local
npm install
npm run prisma:push
npm run db:seed
npm run dev
```

Open:
- `http://localhost:3000`
- `http://localhost:3000/dashboard`

## Preview/Production Safety

Feature flags control live integrations:

- `FEATURE_STRIPE_LIVE`
- `FEATURE_RUNPOD_LIVE`

Recommended:
- Preview: both `false`
- Production: both `true` only after validation

Capability endpoint:
- `GET /api/system/capabilities`

## Core API

### Billing
- `POST /api/billing/checkout-session`
- `POST /api/billing/webhook/stripe`
- `GET /api/billing/wallet`
- `GET /api/billing/transactions`

### Render
- `POST /api/render/jobs`
- `GET /api/render/jobs`
- `GET /api/render/jobs/:id`
- `POST /api/render/jobs/:id/cancel`
- `GET /api/render/presets`

### Runtime
- `POST /api/runpod/webhook`
- `GET /api/system/capabilities`

## Design Direction

UI should follow FeddaHub-quality polish:
- Intentional hierarchy
- Bold but clean visual language
- Strong status clarity
- Mobile + desktop parity

## Docs

- [Vercel preview setup](/H:/00001.app/real-estate-video-mvp/docs/VERCEL_PREVIEW_SETUP.md)
- [C mindset map](/H:/00001.app/real-estate-video-mvp/docs/C_MINDSET_MAP.md)
