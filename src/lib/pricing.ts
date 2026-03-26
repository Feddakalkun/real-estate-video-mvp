import { PricingConfig } from "@prisma/client";

export function estimateJobCredits(params: {
  runtimeEstimateS: number;
  pricing: Pick<PricingConfig, "runpodCostPerSec" | "targetGrossMargin" | "creditsPerUsd">;
}) {
  const { runtimeEstimateS, pricing } = params;
  const rawCostUsd = runtimeEstimateS * pricing.runpodCostPerSec;
  const safeMargin = Math.min(0.9, Math.max(0, pricing.targetGrossMargin));
  const saleUsd = rawCostUsd / (1 - safeMargin);
  const credits = Math.max(1, Math.ceil(saleUsd * pricing.creditsPerUsd));
  return {
    estimatedCostUsd: Number(rawCostUsd.toFixed(4)),
    heldCredits: credits,
  };
}

export function computeDynamicWelcomeBonus(params: {
  pricing: Pick<PricingConfig, "runpodCostPerSec" | "targetGrossMargin" | "creditsPerUsd" | "welcomeBonusMin">;
  starterRuntimeEstimateS: number;
}) {
  const { pricing, starterRuntimeEstimateS } = params;
  const estimate = estimateJobCredits({
    runtimeEstimateS: starterRuntimeEstimateS,
    pricing,
  });

  return Math.max(pricing.welcomeBonusMin, estimate.heldCredits);
}
