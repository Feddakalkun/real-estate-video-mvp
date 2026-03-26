import { ensureDefaults } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/api";

export async function GET() {
  await ensureDefaults();
  const presets = await prisma.cameraPreset.findMany({
    where: { isActive: true },
    orderBy: { label: "asc" },
  });
  return ok({ presets });
}
