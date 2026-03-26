import { WalletTransactionType } from "@prisma/client";
import { requireUser } from "@/lib/auth-helpers";
import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { cancelRunpodJob } from "@/lib/runpod";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUser();
    const { id } = await context.params;
    const job = await prisma.renderJob.findFirst({
      where: { id, userId },
    });
    if (!job) return fail("Not found", 404);
    if (!["queued", "running"].includes(job.status)) {
      return fail(`Cannot cancel job in status ${job.status}`, 409);
    }

    if (job.runpodJobId) {
      try {
        await cancelRunpodJob(job.runpodJobId);
      } catch {
        // Keep cancel flow resilient even if Runpod already completed.
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceCredits: { increment: job.heldCredits } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type: WalletTransactionType.refund,
          creditsDelta: job.heldCredits,
          note: "Refund after user canceled render job",
          referenceId: job.id,
        },
      });

      return tx.renderJob.update({
        where: { id: job.id },
        data: {
          status: "refunded",
          errorMessage: "Canceled by user",
          completedAt: new Date(),
        },
      });
    });

    return ok({ job: result });
  } catch (error) {
    return fail((error as Error).message, (error as Error & { status?: number }).status || 500);
  }
}
