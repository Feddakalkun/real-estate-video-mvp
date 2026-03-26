function parseBooleanEnv(value: string | undefined, defaultValue: boolean) {
  if (value == null) return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getRuntimeMode() {
  const vercelEnv = process.env.VERCEL_ENV || "local";
  const isPreview = vercelEnv === "preview";
  const isProduction = vercelEnv === "production";

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const runpodConfigured =
    Boolean(process.env.RUNPOD_API_BASE) &&
    Boolean(process.env.RUNPOD_API_KEY) &&
    Boolean(process.env.RUNPOD_ENDPOINT_ID);

  const stripeLiveEnabled = parseBooleanEnv(
    process.env.FEATURE_STRIPE_LIVE,
    isProduction && stripeConfigured,
  );
  const runpodLiveEnabled = parseBooleanEnv(
    process.env.FEATURE_RUNPOD_LIVE,
    isProduction && runpodConfigured,
  );

  return {
    vercelEnv,
    isPreview,
    isProduction,
    stripeConfigured,
    runpodConfigured,
    stripeLiveEnabled,
    runpodLiveEnabled,
  };
}
