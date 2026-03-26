import { WalletTransactionType } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) return fail("Webhook not configured", 400);

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, webhookSecret);
  } catch (error) {
    return fail(`Stripe signature verification failed: ${(error as Error).message}`, 400);
  }

  try {
    await prisma.stripeWebhookEvent.create({
      data: {
        eventId: event.id,
        eventType: event.type,
      },
    });
  } catch {
    return ok({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const dbSession = await prisma.stripeCheckoutSession.findUnique({
      where: { stripeSessionId: session.id },
    });

    if (dbSession && dbSession.status !== "completed") {
      await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUniqueOrThrow({
          where: { userId: dbSession.userId },
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balanceCredits: {
              increment: dbSession.creditsToGrant,
            },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            userId: dbSession.userId,
            type: WalletTransactionType.topup,
            creditsDelta: dbSession.creditsToGrant,
            note: `Stripe top-up (${dbSession.packageCode})`,
            referenceId: dbSession.id,
            metadata: {
              stripeSessionId: session.id,
              amountTotal: session.amount_total,
            },
          },
        });

        await tx.stripeCheckoutSession.update({
          where: { id: dbSession.id },
          data: {
            status: "completed",
            stripePaymentIntentId:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
          },
        });
      });
    }
  }

  return ok({ received: true });
}
