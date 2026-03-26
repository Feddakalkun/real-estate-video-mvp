# Vercel Preview Setup

## Goal

Every PR gets its own preview URL so collaborators can test without local setup.

## Steps

1. Import this repo in Vercel.
2. Ensure GitHub integration is enabled.
3. Keep auto-preview deployments enabled.

## Environment Variables

Configure separate vars for **Preview** and **Production**.

### Preview (safe defaults)

- `NEXTAUTH_SECRET` = preview-secret
- `APP_BASE_URL` = auto from Vercel URL (or set explicitly)
- `FEATURE_STRIPE_LIVE=false`
- `FEATURE_RUNPOD_LIVE=false`

Optional: dummy values for Stripe/Runpod keys to avoid runtime missing-env noise.

### Production

- Real secrets and API keys
- `FEATURE_STRIPE_LIVE=true`
- `FEATURE_RUNPOD_LIVE=true`

## Validation

For each PR:

1. Open preview URL.
2. Confirm dashboard loads.
3. Confirm top-up shows safe disabled mode unless explicitly enabled.
4. Confirm render queue shows safe disabled message unless explicitly enabled.
