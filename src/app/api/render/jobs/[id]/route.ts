import { requireUser } from "@/lib/auth-helpers";
import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await requireUser();
    const { id } = await context.params;
    const job = await prisma.renderJob.findFirst({
      where: { id, userId },
      include: { cameraPreset: true, assets: true },
    });
    if (!job) return fail("Not found", 404);
    return ok({ job });
  } catch (error) {
    return fail((error as Error).message, (error as Error & { status?: number }).status || 500);
  }
}
