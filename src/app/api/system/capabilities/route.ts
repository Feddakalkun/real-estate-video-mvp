import { ok } from "@/lib/api";
import { getRuntimeMode } from "@/lib/features";

export async function GET() {
  const mode = getRuntimeMode();
  return ok({
    mode: {
      vercelEnv: mode.vercelEnv,
      stripeLiveEnabled: mode.stripeLiveEnabled,
      runpodLiveEnabled: mode.runpodLiveEnabled,
    },
  });
}
