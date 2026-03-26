import { createHmac, timingSafeEqual } from "node:crypto";

const runpodApiBase = process.env.RUNPOD_API_BASE;
const runpodApiKey = process.env.RUNPOD_API_KEY;
const runpodEndpointId = process.env.RUNPOD_ENDPOINT_ID;
const appBaseUrl = process.env.APP_BASE_URL;

function requireRunpodConfig() {
  if (!runpodApiBase || !runpodApiKey || !runpodEndpointId) {
    throw new Error("Runpod configuration is missing");
  }
}

export async function queueRunpodJob(payload: object) {
  requireRunpodConfig();

  const webhook = `${appBaseUrl}/api/runpod/webhook`;
  const response = await fetch(`${runpodApiBase}/${runpodEndpointId}/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runpodApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: payload,
      webhook,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Runpod queue failed (${response.status}): ${body}`);
  }

  return response.json();
}

export async function cancelRunpodJob(runpodJobId: string) {
  requireRunpodConfig();

  const response = await fetch(`${runpodApiBase}/${runpodEndpointId}/cancel/${runpodJobId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${runpodApiKey}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Runpod cancel failed (${response.status}): ${body}`);
  }

  return response.json();
}

export function verifyRunpodWebhookSignature(rawBody: string, signature?: string | null) {
  const secret = process.env.RUNPOD_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;

  const computed = createHmac("sha256", secret).update(rawBody).digest("hex");
  const left = Buffer.from(computed);
  const right = Buffer.from(signature);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
