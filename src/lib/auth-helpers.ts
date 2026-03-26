import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function requireUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    const err = new Error("Unauthorized");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  return userId;
}
