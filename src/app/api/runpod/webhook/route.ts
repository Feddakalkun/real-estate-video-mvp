import path from "node:path";
import { WalletTransactionType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { verifyRunpodWebhookSignature } from "@/lib/runpod";
import { uploadBuffer } from "@/lib/storage";

function extractRunpodJobId(payload: Record<string, unknown>) {
  return String(payload.id || payload.jobId || payload.requestId || "");
}

function extractStatus(payload: Record<string, unknown>) {
  return String(payload.status || payload.state || "").toLowerCase();
}

function findVideoUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;
  const directCandidates = ["videoUrl", "video_url", "outputUrl", "url"];
  for (const key of directCandidates) {
    const value = obj[key];
    if (typeof value === "string" && /^https?:\/\//.test(value)) return value;
  }

  for (const value of Object.values(obj)) {
    if (typeof value === "string" && /^https?:\/\//.test(value) && value.includes(".mp4")) {
      return value;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = findVideoUrl(item);
        if (nested) return nested;
      }
    } else if (typeof value === "object" && value !== null) {
      const nested = findVideoUrl(value);
      if (nested) return nested;
    }
  }

  return null;
}

async function downloadVideo(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch output video: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-runpod-signature");
  if (!verifyRunpodWebhookSignature(rawBody, signature)) {
    return fail("Invalid webhook signature", 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return fail("Invalid JSON payload", 400);
  }
  const payloadJson = payload as Prisma.JsonObject;

  const runpodJobId = extractRunpodJobId(payload);
  if (!runpodJobId) return fail("Missing runpod job id", 400);

  const job = await prisma.renderJob.findUnique({ where: { runpodJobId } });
  if (!job) return fail("Render job not found", 404);

  if (["succeeded", "failed", "refunded", "canceled"].includes(job.status)) {
    return ok({ received: true, ignored: true });
  }

  const status = extractStatus(payload);
  const isSuccess = ["completed", "succeeded", "success"].includes(status);
  const isFailure = ["failed", "cancelled", "canceled", "error", "timeout"].includes(status);

  if (isSuccess) {
    const videoUrl = findVideoUrl(payload);
    if (!videoUrl) {
      await prisma.renderJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorMessage: "Runpod finished without output video URL",
          runpodResponseBody: payloadJson,
          completedAt: new Date(),
        },
      });
      return ok({ received: true, outputMissing: true });
    }

    const videoBuffer = await downloadVideo(videoUrl);
    const uploaded = await uploadBuffer({
      folder: "outputs",
      buffer: videoBuffer,
      extension: path.extname(videoUrl) || ".mp4",
      contentType: "video/mp4",
    });

    const result = await prisma.$transaction(async (tx) => {
      const updatedJob = await tx.renderJob.update({
        where: { id: job.id },
        data: {
          status: "succeeded",
          outputVideoUrl: uploaded.url,
          finalCredits: job.heldCredits,
          runpodResponseBody: payloadJson,
          completedAt: new Date(),
        },
      });

      await tx.renderAsset.create({
        data: {
          renderJobId: job.id,
          kind: "output_video",
          storageKey: uploaded.storageKey,
          url: uploaded.url,
          mimeType: "video/mp4",
          sizeBytes: videoBuffer.length,
        },
      });

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: job.userId } });
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: job.userId,
          type: WalletTransactionType.capture,
          creditsDelta: 0,
          note: "Render completed. Held credits captured.",
          referenceId: job.id,
          metadata: { heldCredits: job.heldCredits },
        },
      });

      return updatedJob;
    });

    return ok({ received: true, job: result });
  }

  if (isFailure) {
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: job.userId } });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceCredits: { increment: job.heldCredits } },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId: job.userId,
          type: WalletTransactionType.refund,
          creditsDelta: job.heldCredits,
          note: "Render failed. Held credits refunded.",
          referenceId: job.id,
        },
      });

      return tx.renderJob.update({
        where: { id: job.id },
        data: {
          status: "refunded",
          errorMessage: String(payload.error || "Runpod render failed"),
          runpodResponseBody: payloadJson,
          completedAt: new Date(),
        },
      });
    });
    return ok({ received: true, job: result });
  }

  await prisma.renderJob.update({
    where: { id: job.id },
    data: {
      status: "running",
      runpodResponseBody: payloadJson,
    },
  });

  return ok({ received: true, stateUpdated: true });
}
