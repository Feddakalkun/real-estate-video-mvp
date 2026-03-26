import { WalletTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeDynamicWelcomeBonus } from "@/lib/pricing";

export async function getOrCreateWallet(userId: string) {
  return prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function grantWelcomeBonusIfNeeded(userId: string) {
  const wallet = await getOrCreateWallet(userId);
  if (wallet.welcomeGranted) return wallet;

  const pricing = await prisma.pricingConfig.findUniqueOrThrow({
    where: { id: "global" },
  });

  const baselinePreset = await prisma.cameraPreset.findFirst({
    where: { isActive: true },
    orderBy: { runtimeEstimateS: "asc" },
  });

  const bonus = computeDynamicWelcomeBonus({
    pricing,
    starterRuntimeEstimateS: baselinePreset?.runtimeEstimateS ?? 75,
  });

  return prisma.$transaction(async (tx) => {
    const freshWallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    if (freshWallet.welcomeGranted) return freshWallet;

    await tx.walletTransaction.create({
      data: {
        walletId: freshWallet.id,
        userId,
        type: WalletTransactionType.welcome_bonus,
        creditsDelta: bonus,
        note: "Dynamic welcome bonus",
      },
    });

    return tx.wallet.update({
      where: { userId },
      data: {
        balanceCredits: { increment: bonus },
        welcomeGranted: true,
      },
    });
  });
}

export async function createWalletTransaction(params: {
  userId: string;
  walletId: string;
  type: WalletTransactionType;
  creditsDelta: number;
  note?: string;
  referenceId?: string;
  metadata?: object;
}) {
  const { userId, walletId, type, creditsDelta, note, referenceId, metadata } = params;
  return prisma.$transaction(async (tx) => {
    const updated = await tx.wallet.update({
      where: { id: walletId },
      data: { balanceCredits: { increment: creditsDelta } },
    });

    const row = await tx.walletTransaction.create({
      data: {
        userId,
        walletId,
        type,
        creditsDelta,
        note,
        referenceId,
        metadata,
      },
    });

    return { wallet: updated, transaction: row };
  });
}
