import { requireUser } from "@/lib/auth-helpers";
import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const userId = await requireUser();
    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 30)));

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return ok({ transactions: [] });

    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return ok({ transactions });
  } catch (error) {
    return fail((error as Error).message, (error as Error & { status?: number }).status || 500);
  }
}
