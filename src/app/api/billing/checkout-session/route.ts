import { requireUser } from "@/lib/auth-helpers";
import { fail, ok } from "@/lib/api";
import { getRuntimeMode } from "@/lib/features";
import { creditPackages, stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const userId = await requireUser();
    const body = (await request.json()) as { packageCode?: string };
    const packageCode = body.packageCode || "";
    const pkg = creditPackages[packageCode];
    if (!pkg) return fail("Invalid packageCode", 400);
    const mode = getRuntimeMode();

    if (!mode.stripeLiveEnabled) {
      return ok({
        disabled: true,
        reason:
          "Stripe live checkout is disabled in this environment. Enable FEATURE_STRIPE_LIVE to test real checkout.",
        mode: mode.vercelEnv,
      });
    }

    let customer = await prisma.stripeCustomer.findFirst({
      where: { userId },
    });

    if (!customer) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const stripeCustomer = await stripe.customers.create({
        email: user?.email ?? undefined,
        metadata: { userId },
      });
      customer = await prisma.stripeCustomer.create({
        data: {
          userId,
          stripeCustomerId: stripeCustomer.id,
        },
      });
    }

    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customer.stripeCustomerId,
      success_url: `${appBaseUrl}/dashboard?checkout=success`,
      cancel_url: `${appBaseUrl}/dashboard?checkout=cancel`,
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(pkg.amountUsd * 100),
            product_data: {
              name: `${pkg.label} Credit Pack`,
              description: `${pkg.credits} credits`,
            },
          },
        },
      ],
      metadata: {
        packageCode,
        creditsToGrant: String(pkg.credits),
        userId,
      },
    });

    await prisma.stripeCheckoutSession.create({
      data: {
        userId,
        stripeSessionId: session.id,
        packageCode,
        creditsToGrant: pkg.credits,
        amountUsd: pkg.amountUsd,
        status: "created",
      },
    });

    return ok({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    return fail((error as Error).message, (error as Error & { status?: number }).status || 500);
  }
}
