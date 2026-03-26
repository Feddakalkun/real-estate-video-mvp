import { prisma } from "@/lib/prisma";

const defaultPresets = [
  {
    key: "drone_reveal",
    label: "Drone Reveal",
    workflowRef: "realestate/drone_reveal_v1.json",
    durationSec: 6,
    aspectRatio: "16:9",
    qualityTier: "standard",
    runtimeEstimateS: 95,
    paramsJson: { cameraPath: "drone_reveal", smoothing: 0.8 },
  },
  {
    key: "slow_push_in",
    label: "Slow Push-In",
    workflowRef: "realestate/slow_push_in_v1.json",
    durationSec: 5,
    aspectRatio: "16:9",
    qualityTier: "standard",
    runtimeEstimateS: 80,
    paramsJson: { cameraPath: "push_in", smoothing: 0.9 },
  },
  {
    key: "orbit",
    label: "Orbit",
    workflowRef: "realestate/orbit_v1.json",
    durationSec: 6,
    aspectRatio: "16:9",
    qualityTier: "standard",
    runtimeEstimateS: 100,
    paramsJson: { cameraPath: "orbit", degrees: 180 },
  },
  {
    key: "walkthrough",
    label: "Walkthrough",
    workflowRef: "realestate/walkthrough_v1.json",
    durationSec: 7,
    aspectRatio: "16:9",
    qualityTier: "standard",
    runtimeEstimateS: 120,
    paramsJson: { cameraPath: "walkthrough", stabilization: "high" },
  },
  {
    key: "tilt_up",
    label: "Tilt-Up",
    workflowRef: "realestate/tilt_up_v1.json",
    durationSec: 5,
    aspectRatio: "16:9",
    qualityTier: "standard",
    runtimeEstimateS: 75,
    paramsJson: { cameraPath: "tilt_up", easing: "ease_in_out" },
  },
];

let bootstrapped = false;

export async function ensureDefaults() {
  if (bootstrapped) return;

  await prisma.pricingConfig.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      targetGrossMargin: 0.6,
      creditsPerUsd: 100,
      runpodCostPerSec: 0.0045,
      welcomeBonusMin: 20,
    },
  });

  for (const preset of defaultPresets) {
    await prisma.cameraPreset.upsert({
      where: { key: preset.key },
      update: preset,
      create: preset,
    });
  }

  bootstrapped = true;
}
