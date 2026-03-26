import { prisma } from "@/lib/prisma";

export const ADMIN_USERNAME = "admin";
export const ADMIN_PASSWORD = "feddakalkun2026";
export const ADMIN_EMAIL = "admin@real-estate-video.local";

export async function ensureAdminUser() {
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { name: ADMIN_USERNAME },
    create: {
      name: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
    },
  });

  await prisma.wallet.upsert({
    where: { userId: user.id },
    update: { welcomeGranted: true, balanceCredits: 999999999 },
    create: {
      userId: user.id,
      welcomeGranted: true,
      balanceCredits: 999999999,
    },
  });

  return user;
}

export async function isAdminUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email === ADMIN_EMAIL;
}
