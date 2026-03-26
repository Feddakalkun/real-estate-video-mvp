# Contributing

## Branch Strategy

- `main` is protected and release-ready.
- All changes go through Pull Requests.
- Branch naming:
  - `feat/ui-*` for design/frontend work
  - `feat/api-*` for backend/API work
  - `fix/*` for bug fixes

## Local Development

```bash
npm install
npm run dev
```

## Required Checks Before PR

```bash
npm run lint
npm run build
```

## Pull Request Rules

1. Keep PR scope focused (one feature/fix at a time).
2. Attach Vercel preview URL and screenshots.
3. Describe risk (auth, billing, render, wallet) if changed.
4. At least one teammate review before merge.

## Preview/Production Safety

- Preview should keep live integrations disabled by default:
  - `FEATURE_STRIPE_LIVE=false`
  - `FEATURE_RUNPOD_LIVE=false`
- Production enables live integrations only after validation.
