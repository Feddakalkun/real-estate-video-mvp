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

function formatTransactionType(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
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
    <div className="site-shell">
      <div className="dashboard-shell">
        <header className="dashboard-top">
          <div className="dashboard-title">
            <p className="badge">Fedda Real Estate Studio</p>
            <h1>Render Console</h1>
            <p className="small-muted">
              Upload image, choose camera move, monitor job lifecycle, and ship client-ready clips.
            </p>
          </div>
          <button className="button-secondary" onClick={() => signOut({ callbackUrl: "/" })}>
            Sign out
          </button>
        </header>

        {!capabilities?.runpodLiveEnabled || !capabilities?.stripeLiveEnabled ? (
          <p className="safemode-banner">
            Preview Safe Mode: {capabilities?.vercelEnv || "local"} with one or more live connectors
            disabled.
          </p>
        ) : null}

        <div className="dashboard-grid" style={{ marginTop: "0.9rem" }}>
          <main style={{ display: "grid", gap: "1rem" }}>
            <section className="panel builder-panel">
              <h2 className="panel-title">Build New Clip</h2>
              <p className="small-muted">Select camera movement and upload one property still image.</p>
              <div className="workflow-grid">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    className={`workflow-chip ${selectedPresetId === preset.id ? "active" : ""}`}
                    onClick={() => setSelectedPresetId(preset.id)}
                    type="button"
                  >
                    <p className="workflow-title">{preset.label}</p>
                    <p className="small-muted">
                      {preset.durationSec}s • {preset.aspectRatio} • ~{preset.runtimeEstimateS}s
                    </p>
                  </button>
                ))}
              </div>

              <div className="uploader-block">
                <label htmlFor="image-upload" style={{ fontWeight: 650 }}>
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
                  <p className="alert-error">
                    Runpod live is disabled. Enable `FEATURE_RUNPOD_LIVE=true` for real generation.
                  </p>
                ) : null}
                {statusText ? <p className="small-muted">{statusText}</p> : null}
              </div>
            </section>

            <section className="panel jobs-panel">
              <h2 className="panel-title">Job Tracker</h2>
              <p className="small-muted">Realtime queue and output download history.</p>
              <div className="jobs-list">
                {jobs.length === 0 ? (
                  <p className="small-muted">No jobs yet. Your first render will appear here.</p>
                ) : (
                  jobs.map((job) => (
                    <article key={job.id} className="job-card">
                      <div className="job-head">
                        <div>
                          <p style={{ fontWeight: 700 }}>{job.cameraPreset.label}</p>
                          <p className="small-muted">
                            Hold {job.heldCredits} credits • {new Date(job.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <span className={statusClass(job.status)}>{job.status}</span>
                      </div>
                      <div className="job-actions">
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
                      {job.errorMessage ? <p className="alert-error">{job.errorMessage}</p> : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          </main>

          <aside style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
            <section className="panel wallet-panel">
              <h3 className="panel-title">Wallet</h3>
              <p className="small-muted">
                Balance: <strong>{wallet?.balanceCredits ?? 0}</strong> credits
              </p>
              <div className="wallet-pack-list">
                {creditPackages.map((pack) => (
                  <button
                    key={pack.code}
                    className="wallet-pack"
                    onClick={() => void handleTopUp(pack.code)}
                    disabled={!capabilities?.stripeLiveEnabled}
                  >
                    <strong>{pack.label}</strong>
                    <div className="small-muted">
                      {pack.credits} credits • ${pack.amountUsd}
                    </div>
                  </button>
                ))}
              </div>
              {!capabilities?.stripeLiveEnabled ? (
                <p className="alert-error">Stripe live checkout is disabled in this environment.</p>
              ) : null}
            </section>

            <section className="panel wallet-panel">
              <h3 className="panel-title">Recent Wallet Events</h3>
              <div className="wallet-events">
                {wallet?.transactions?.length ? (
                  wallet.transactions.slice(0, 8).map((transaction) => (
                    <div key={transaction.id} className="wallet-event">
                      <span>{formatTransactionType(transaction.type)}</span>
                      <strong>{transaction.creditsDelta > 0 ? "+" : ""}{transaction.creditsDelta}</strong>
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
    </div>
  );
}
