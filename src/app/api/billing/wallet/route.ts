import { requireUser } from "@/lib/auth-helpers";
import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ensureDefaults } from "@/lib/bootstrap";
import { grantWelcomeBonusIfNeeded } from "@/lib/wallet";
import { isAdminUser } from "@/lib/admin";

export async function GET() {
  try {
    await ensureDefaults();
    const userId = await requireUser();
    await grantWelcomeBonusIfNeeded(userId);

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    const pricing = await prisma.pricingConfig.findUnique({
      where: { id: "global" },
    });

    const admin = await isAdminUser(userId);
    if (admin && wallet) {
      wallet.balanceCredits = 999999999;
      wallet.welcomeGranted = true;
    }

    return ok({ wallet, pricing });
  } catch (error) {
    return fail((error as Error).message, (error as Error & { status?: number }).status || 500);
  }
}
