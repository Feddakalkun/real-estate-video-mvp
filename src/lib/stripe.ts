import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  console.warn("STRIPE_SECRET_KEY is missing.");
}

export const stripe = new Stripe(secretKey || "sk_test_placeholder", {
  apiVersion: "2026-03-25.dahlia",
});

export const creditPackages: Record<
  string,
  { label: string; credits: number; amountUsd: number }
> = {
  starter: { label: "Starter", credits: 200, amountUsd: 19 },
  growth: { label: "Growth", credits: 600, amountUsd: 49 },
  pro: { label: "Pro", credits: 1500, amountUsd: 99 },
};
