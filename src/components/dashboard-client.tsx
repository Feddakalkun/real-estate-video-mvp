"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";

type WalletTransaction = {
  id: string;
  type: string;
  creditsDelta: number;
  createdAt: string;
};

type Wallet = {
  balanceCredits: number;
  transactions: WalletTransaction[];
};

type CameraPreset = {
  id: string;
  key: string;
  label: string;
  workflowRef: string;
  durationSec: number;
  aspectRatio: string;
  qualityTier: string;
  runtimeEstimateS: number;
};

type RenderJob = {
  id: string;
  status: string;
  heldCredits: number;
  inputImageUrl: string;
  outputVideoUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  cameraPreset: CameraPreset;
};

type Capabilities = {
  vercelEnv: string;
  stripeLiveEnabled: boolean;
  runpodLiveEnabled: boolean;
};

const creditPackages = [
  { code: "starter", label: "Starter", credits: 200, amountUsd: 19 },
  { code: "growth", label: "Growth", credits: 600, amountUsd: 49 },
  { code: "pro", label: "Pro", credits: 1500, amountUsd: 99 },
];

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "running") return "status-pill running";
  if (normalized === "succeeded") return "status-pill succeeded";
  if (normalized === "queued") return "status-pill queued";
  return `status-pill ${normalized}`;
}

export function DashboardClient() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [presets, setPresets] = useState<CameraPreset[]>([]);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [statusText, setStatusText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);

  const activePreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId) || null,
    [presets, selectedPresetId],
  );

  const loadData = useCallback(async () => {
    const [walletRes, presetsRes, jobsRes] = await Promise.all([
      fetch("/api/billing/wallet", { cache: "no-store" }),
      fetch("/api/render/presets", { cache: "no-store" }),
      fetch("/api/render/jobs", { cache: "no-store" }),
    ]);
    const capabilitiesRes = await fetch("/api/system/capabilities", { cache: "no-store" });

    if (walletRes.ok) {
      const walletJson = await walletRes.json();
      setWallet(walletJson.wallet);
    }
    if (presetsRes.ok) {
      const presetsJson = await presetsRes.json();
      const list = presetsJson.presets || [];
      setPresets(list);
      if (!selectedPresetId && list.length) {
        setSelectedPresetId(list[0].id);
      }
    }
    if (jobsRes.ok) {
      const jobsJson = await jobsRes.json();
      setJobs(jobsJson.jobs || []);
    }
    if (capabilitiesRes.ok) {
      const c = await capabilitiesRes.json();
      setCapabilities(c.mode);
    }
  }, [selectedPresetId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadData();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadData]);

  async function handleGenerate() {
    if (!selectedFile || !selectedPresetId) {
      setStatusText("Select a camera preset and image first.");
      return;
    }

    setIsSubmitting(true);
    setStatusText("Uploading image and creating render job...");
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("cameraPresetId", selectedPresetId);
      formData.append("metadata", JSON.stringify({}));

      const response = await fetch("/api/render/jobs", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatusText(`Failed: ${payload.error || "Unknown error"}`);
        return;
      }
      setStatusText(`Queued job ${payload.job.id.slice(0, 8)}...`);
      setSelectedFile(null);
      await loadData();
    } catch (error) {
      setStatusText((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleTopUp(packageCode: string) {
    setStatusText("Preparing Stripe checkout...");
    const response = await fetch("/api/billing/checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageCode }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setStatusText(`Top-up error: ${payload.error || "Unknown error"}`);
      return;
    }
    if (payload.disabled) {
      setStatusText(payload.reason || "Stripe is disabled in this environment.");
      return;
    }
    if (payload.url) {
      window.location.href = payload.url;
    }
  }

  return (
    <div className="dashboard-shell">
      <section className="studio-hero">
        <p className="badge">Real Estate Video Studio</p>
        <h2>Cinematic property motion from one still image</h2>
        <p className="small-muted" style={{ color: "#d5e2e8", marginTop: "0.35rem" }}>
          Pick a movement style, upload the photo, and deliver client-ready clips in minutes.
        </p>
        {!capabilities?.runpodLiveEnabled || !capabilities?.stripeLiveEnabled ? (
          <p
            style={{
              marginTop: "0.7rem",
              fontSize: "0.82rem",
              background: "rgba(255,135,95,0.14)",
              border: "1px solid rgba(255,170,140,0.44)",
              borderRadius: "10px",
              padding: "0.45rem 0.6rem",
              display: "inline-block",
            }}
          >
            Preview Safe Mode: {capabilities?.vercelEnv || "local"} environment with live integrations
            partially disabled.
          </p>
        ) : null}
        <div className="studio-stats">
          <div className="studio-stat">
            <p>Wallet</p>
            <p>{wallet?.balanceCredits ?? 0} credits</p>
          </div>
          <div className="studio-stat">
            <p>Jobs</p>
            <p>{jobs.length} total</p>
          </div>
          <div className="studio-stat">
            <p>Output Ready</p>
            <p>{jobs.filter((job) => job.status === "succeeded").length}</p>
          </div>
        </div>
      </section>

      <div className="dashboard-grid" style={{ marginTop: "1rem" }}>
        <section className="panel" style={{ padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.8rem" }}>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Render Console</h3>
              <p className="small-muted">Step 1: choose movement. Step 2: upload. Step 3: generate.</p>
            </div>
            <button className="button-secondary" onClick={() => signOut({ callbackUrl: "/" })}>
              Sign out
            </button>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <p style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Camera movements</p>
            <div className="workflow-grid">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  className={`workflow-chip ${selectedPresetId === preset.id ? "active" : ""}`}
                  onClick={() => setSelectedPresetId(preset.id)}
                  type="button"
                >
                  <p style={{ fontWeight: 700 }}>{preset.label}</p>
                  <p className="small-muted">
                    {preset.durationSec}s • {preset.aspectRatio} • ~{preset.runtimeEstimateS}s
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "1rem", display: "grid", gap: "0.65rem" }}>
            <label htmlFor="image-upload" style={{ fontWeight: 700 }}>
              Property image
            </label>
            <input
              id="image-upload"
              className="field"
              type="file"
              accept="image/*"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
            <p className="small-muted">
              Workflow ref: {activePreset?.workflowRef || "Select a preset first"}
            </p>
            <button className="button-primary" onClick={handleGenerate} disabled={isSubmitting}>
              {isSubmitting ? "Queuing..." : "Generate video"}
            </button>
            {!capabilities?.runpodLiveEnabled ? (
              <p className="small-muted" style={{ color: "#9b1f2e" }}>
                Runpod live is disabled. Enable `FEATURE_RUNPOD_LIVE=true` to run real generations.
              </p>
            ) : null}
            {statusText ? <p className="small-muted">{statusText}</p> : null}
          </div>

          <div style={{ marginTop: "1rem", display: "grid", gap: "0.65rem" }}>
            {jobs.length === 0 ? (
              <p className="small-muted">No jobs yet. Your first render will appear here.</p>
            ) : (
              jobs.map((job) => (
                <article key={job.id} className="panel" style={{ padding: "0.75rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 700 }}>{job.cameraPreset.label}</p>
                      <p className="small-muted">
                        Hold {job.heldCredits} credits • {new Date(job.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={statusClass(job.status)}>{job.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
                    <a className="button-secondary" href={job.inputImageUrl} target="_blank" rel="noreferrer">
                      Input
                    </a>
                    {job.outputVideoUrl ? (
                      <a
                        className="button-primary"
                        href={job.outputVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download
                      </a>
                    ) : null}
                  </div>
                  {job.errorMessage ? (
                    <p style={{ marginTop: "0.45rem", color: "#9b1f2e", fontWeight: 600 }}>
                      {job.errorMessage}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>

        <aside style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          <section className="panel" style={{ padding: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Top Up</h3>
            <p className="small-muted">Buy credits through Stripe checkout.</p>
            <div style={{ display: "grid", gap: "0.55rem", marginTop: "0.7rem" }}>
              {creditPackages.map((pack) => (
                <button
                  key={pack.code}
                  className="button-secondary"
                  style={{ textAlign: "left", borderRadius: "14px" }}
                  onClick={() => void handleTopUp(pack.code)}
                  disabled={!capabilities?.stripeLiveEnabled}
                >
                  <strong>{pack.label}</strong>
                  <div className="small-muted">
                    {pack.credits} credits · ${pack.amountUsd}
                  </div>
                </button>
              ))}
            </div>
            {!capabilities?.stripeLiveEnabled ? (
              <p className="small-muted" style={{ marginTop: "0.6rem", color: "#9b1f2e" }}>
                Stripe live checkout is disabled in this environment.
              </p>
            ) : null}
          </section>

          <section className="panel" style={{ padding: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Recent Wallet Events</h3>
            <div style={{ marginTop: "0.7rem", display: "grid", gap: "0.5rem" }}>
              {wallet?.transactions?.length ? (
                wallet.transactions.slice(0, 8).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="panel"
                    style={{ padding: "0.55rem", borderRadius: "12px", background: "#f9fcff" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ textTransform: "capitalize", fontWeight: 600 }}>
                        {transaction.type.replace("_", " ")}
                      </span>
                      <strong>{transaction.creditsDelta > 0 ? "+" : ""}{transaction.creditsDelta}</strong>
                    </div>
                  </div>
                ))
              ) : (
                <p className="small-muted">No wallet activity yet.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
