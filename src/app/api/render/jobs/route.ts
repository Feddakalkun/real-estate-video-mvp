import path from "node:path";
import { z } from "zod";
import { WalletTransactionType } from "@prisma/client";
import { requireUser } from "@/lib/auth-helpers";
import { fail, ok } from "@/lib/api";
import { ensureDefaults } from "@/lib/bootstrap";
import { getRuntimeMode } from "@/lib/features";
import { prisma } from "@/lib/prisma";
import { estimateJobCredits } from "@/lib/pricing";
import { queueRunpodJob } from "@/lib/runpod";
import { uploadBuffer } from "@/lib/storage";
import { getOrCreateWallet, grantWelcomeBonusIfNeeded } from "@/lib/wallet";
import { isAdminUser } from "@/lib/admin";

const metadataSchema = z.object({
  durationSec: z.number().int().positive().max(30).optional(),
  aspectRatio: z.string().optional(),
  qualityTier: z.string().optional(),
});

export async function GET() {
  try {
    const userId = await requireUser();
    const jobs = await prisma.renderJob.findMany({
      where: { userId },
      include: {
        cameraPreset: true,
        assets: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({ jobs });
  } catch (error) {
    return fail((error as Error).message, (error as Error & { status?: number }).status || 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDefaults();
    const userId = await requireUser();
    await grantWelcomeBonusIfNeeded(userId);

    const formData = await request.formData();
    const cameraPresetId = String(formData.get("cameraPresetId") || "");
    const metadataRaw = String(formData.get("metadata") || "{}");
    const file = formData.get("image");

    if (!cameraPresetId) return fail("cameraPresetId is required", 400);
    if (!(file instanceof File)) return fail("image file is required", 400);
    const mode = getRuntimeMode();
    if (!mode.runpodLiveEnabled) {
      return fail(
        "Runpod live queue is disabled in this environment. Enable FEATURE_RUNPOD_LIVE for real render execution.",
        503,
      );
    }

    const metadata = metadataSchema.parse(JSON.parse(metadataRaw));
    const preset = await prisma.cameraPreset.findUnique({ where: { id: cameraPresetId } });
    if (!preset || !preset.isActive) return fail("Camera preset not found", 404);
    const admin = await isAdminUser(userId);

    const pricing = await prisma.pricingConfig.findUniqueOrThrow({ where: { id: "global" } });
    const economics = estimateJobCredits({
      runtimeEstimateS: preset.runtimeEstimateS,
      pricing,
    });

    const wallet = await getOrCreateWallet(userId);
    if (!admin && wallet.balanceCredits < economics.heldCredits) {
      return fail("Insufficient credits", 402);
    }

    const ext = path.extname(file.name || ".jpg") || ".jpg";
    const buffer = Buffer.from(await file.arrayBuffer());
    const inputAsset = await uploadBuffer({
      folder: "inputs",
      buffer,
      extension: ext,
      contentType: file.type || "image/jpeg",
    });

    const createdJob = await prisma.$transaction(async (tx) => {
      const walletFresh = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      if (!admin && walletFresh.balanceCredits < economics.heldCredits) {
        throw new Error("Insufficient credits");
      }

      const job = await tx.renderJob.create({
        data: {
          userId,
          cameraPresetId: preset.id,
          status: "queued",
          inputImageUrl: inputAsset.url,
          costUsdEstimate: economics.estimatedCostUsd,
          heldCredits: admin ? 0 : economics.heldCredits,
          runpodRequestBody: {
            cameraPresetKey: preset.key,
            workflowRef: preset.workflowRef,
            presetParams: preset.paramsJson,
            inputImageUrl: inputAsset.url,
            requestMetadata: metadata,
          },
        },
      });

      await tx.renderAsset.create({
        data: {
          renderJobId: job.id,
          kind: "input_image",
          storageKey: inputAsset.storageKey,
          url: inputAsset.url,
          mimeType: file.type || "image/jpeg",
          sizeBytes: file.size,
        },
      });

      if (!admin) {
        await tx.wallet.update({
          where: { id: walletFresh.id },
          data: {
            balanceCredits: { decrement: economics.heldCredits },
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: walletFresh.id,
            userId,
            type: WalletTransactionType.hold,
            creditsDelta: -economics.heldCredits,
            note: `Hold for render job ${job.id}`,
            referenceId: job.id,
            metadata: {
              cameraPresetKey: preset.key,
              costUsdEstimate: economics.estimatedCostUsd,
            },
          },
        });
      }

      return job;
    });

    try {
      const runpodResponse = await queueRunpodJob({
        jobId: createdJob.id,
        inputImageUrl: inputAsset.url,
        cameraPreset: {
          id: preset.id,
          key: preset.key,
          workflowRef: preset.workflowRef,
          durationSec: metadata.durationSec ?? preset.durationSec,
          aspectRatio: metadata.aspectRatio ?? preset.aspectRatio,
          qualityTier: metadata.qualityTier ?? preset.qualityTier,
          params: preset.paramsJson,
        },
      });

      const runpodJobId = String(runpodResponse.id || runpodResponse.jobId || "");
      const updated = await prisma.renderJob.update({
        where: { id: createdJob.id },
        data: {
          status: runpodJobId ? "running" : "queued",
          runpodJobId: runpodJobId || null,
          runpodResponseBody: runpodResponse,
        },
        include: { cameraPreset: true, assets: true },
      });

      return ok({ job: updated });
    } catch (queueError) {
      await prisma.$transaction(async (tx) => {
        const failedJob = await tx.renderJob.update({
          where: { id: createdJob.id },
          data: {
            status: "refunded",
            errorMessage: (queueError as Error).message,
            completedAt: new Date(),
          },
        });

        const walletRow = await tx.wallet.findUniqueOrThrow({ where: { userId } });
        await tx.wallet.update({
          where: { id: walletRow.id },
          data: { balanceCredits: { increment: failedJob.heldCredits } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: walletRow.id,
            userId,
            type: WalletTransactionType.refund,
            creditsDelta: failedJob.heldCredits,
            note: "Refunded because Runpod queue failed",
            referenceId: failedJob.id,
          },
        });
      });
      throw queueError;
    }
  } catch (error) {
    const message = error instanceof z.ZodError ? error.message : (error as Error).message;
    return fail(message, (error as Error & { status?: number }).status || 500);
  }
}
