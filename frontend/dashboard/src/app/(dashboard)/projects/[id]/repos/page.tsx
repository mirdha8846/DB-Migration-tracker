"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api } from "@/lib/api";

type Props = { params: { id: string } };

type WebhookInfo = { success: boolean; webhookUrl?: string; error?: string; alreadyExists?: boolean };

type Repo = {
  id: string; service_name: string; github_repo_url: string;
  primary_language: string; last_scanned_at: string | null;
  webhook?: WebhookInfo;
};

type WebhookSetupInfo = {
  webhookUrl: string | null; webhookSecret: string; backendConfigured: boolean;
  canAutoCreate: boolean; missingConfig: string[];
  manualSetupSteps: Array<{ step: number; text: string; value?: string; copy?: boolean }>;
};

export default function ProjectReposPage({ params }: Props) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState(""); const [name, setName] = useState(""); const [lang, setLang] = useState("java");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [setupInfo, setSetupInfo] = useState<WebhookSetupInfo | null>(null);
  const [checkingRepo, setCheckingRepo] = useState<string | null>(null);
  const [repoStatuses, setRepoStatuses] = useState<Record<string, { exists: boolean; active: boolean; lastResponse?: number }>>({});

  const load = async () => {
    try { setRepos((await api.get(`/api/projects/${params.id}/repos`)).data); } catch { }
    try { setSetupInfo((await api.get(`/api/projects/${params.id}/webhook-info`)).data); } catch { }
    setLoading(false);
  };
  useEffect(() => { void load(); }, [params.id]);

  const addRepo = async () => {
    if (!url.trim() || !name.trim()) return;
    setMsg(null);
    try {
      const res = await api.post(`/api/projects/${params.id}/repos`, { githubRepoUrl: url.trim(), serviceName: name.trim(), language: lang });
      setUrl(""); setName("");
      await load();
      const wh = res.data.webhook as WebhookInfo | undefined;
      if (wh?.success) setMsg({ ok: true, text: wh.alreadyExists ? "✅ Repo added + webhook already exists" : "✅ Repo added + webhook auto-created" });
      else if (wh?.error) setMsg({ ok: false, text: `Repo added. Webhook setup failed: ${wh.error}` });
      else setMsg({ ok: true, text: "Repo added. Webhook auto-setup skipped (GITHUB_TOKEN not configured). Use manual setup below." });
    } catch { setMsg({ ok: false, text: "Failed to add repo" }); }
    setTimeout(() => setMsg(null), 12000);
  };

  const retryWebhook = async (repoId: string) => {
    try {
      const res = await api.post(`/api/projects/${params.id}/repos/${repoId}/webhook`);
      await load();
      setMsg({ ok: res.data.success, text: res.data.success ? "✅ Webhook created" : `Failed: ${res.data.error}` });
    } catch { setMsg({ ok: false, text: "Failed" }); }
    setTimeout(() => setMsg(null), 8000);
  };

  const checkRepoStatus = async (repoId: string) => {
    setCheckingRepo(repoId);
    try {
      const res = await api.get(`/api/projects/${params.id}/repos/${repoId}/check-webhook`);
      setRepoStatuses((prev) => ({ ...prev, [repoId]: res.data }));
    } catch { }
    setCheckingRepo(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMsg({ ok: true, text: "Copied!" });
    setTimeout(() => setMsg(null), 2000);
  };

  if (loading) return <DashboardShell variant="detail" active="schema-security" mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop"><p className="py-8 text-center text-on-surface-variant/60">Loading...</p></DashboardShell>;

  return (
    <DashboardShell variant="detail" active="schema-security" pageTitle="Repositories" pageSubtitle={params.id} mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop">
      <div className="mx-auto max-w-[1440px]">

        {/* ═══ Webhook Configuration Card ═══ */}
        <div className="glass-card rounded-2xl p-6 mb-stack-lg border-2 border-primary-fixed/30">
          <h2 className="font-headline-md text-headline-md text-primary mb-4 flex items-center gap-2">
            <MaterialIcon name="link" className="text-primary" /> Webhook Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Webhook URL + Secret Status */}
            <div>
              <p className="font-label-sm uppercase tracking-wider text-on-surface-variant mb-2">Webhook URL (Same for ALL repos)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-primary/10 px-4 py-3 font-mono text-sm text-primary break-all">
                  {setupInfo?.webhookUrl || "BACKEND_URL not set"}
                </code>
                {setupInfo?.webhookUrl && (
                  <button onClick={() => copyToClipboard(setupInfo.webhookUrl!)} className="rounded-lg bg-primary/10 p-3 hover:bg-primary/20">
                    <MaterialIcon name="content_copy" size={18} className="text-primary" />
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <p className="font-label-sm uppercase tracking-wider text-on-surface-variant">Configuration Status</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {setupInfo?.backendConfigured ? <MaterialIcon name="check_circle" className="text-secondary" size={18} /> : <MaterialIcon name="cancel" className="text-error" size={18} />}
                    <span>Webhook URL + Secret {setupInfo?.backendConfigured ? "configured ✅" : "not configured ⚠️"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {setupInfo?.canAutoCreate ? <MaterialIcon name="check_circle" className="text-secondary" size={18} /> : <MaterialIcon name="info" className="text-tertiary-fixed" size={18} />}
                    <span>Auto-create webhook {setupInfo?.canAutoCreate ? "enabled ✅" : "disabled — add GITHUB_TOKEN in backend .env"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Manual Setup Steps */}
            <div>
              <p className="font-label-sm uppercase tracking-wider text-on-surface-variant mb-2">
                {setupInfo?.canAutoCreate ? "Auto-setup enabled. If it fails, use manual steps:" : "Manual Webhook Setup — Copy these values:"}
              </p>
              <div className="rounded-xl bg-primary/5 p-4 space-y-3 text-sm">
                {setupInfo?.manualSetupSteps.map((s) => (
                  <div key={s.step} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold mt-0.5">{s.step}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-on-surface-variant">{s.text}</span>
                      {s.value && (
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-white/50 rounded px-2 py-1 text-primary break-all">{s.value}</code>
                          {s.copy && (
                            <button onClick={() => copyToClipboard(s.value!)}
                              className="flex-shrink-0 text-primary hover:text-primary/70">
                              <MaterialIcon name="content_copy" size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!setupInfo?.manualSetupSteps.length && (
                  <p className="text-on-surface-variant/50">BACKEND_URL not configured</p>
                )}
              </div>
              <p className="mt-2 text-xs text-on-surface-variant/40">
                Webhook Secret: <code className="bg-primary/5 px-1 rounded">{setupInfo?.webhookSecret?.substring(0, 20)}...</code>
                <button onClick={() => setupInfo?.webhookSecret && copyToClipboard(setupInfo.webhookSecret)} className="ml-1 text-primary hover:underline text-xs">Copy</button>
              </p>
            </div>
          </div>
        </div>

        {/* ═══ Add Repo Form ═══ */}
        <div className="glass-panel rounded-2xl p-6 mb-stack-lg">
          <h3 className="mb-4 font-headline-md text-headline-md text-primary">Register a Repository</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input placeholder="GitHub URL (https://github.com/you/repo)" value={url} onChange={(e) => setUrl(e.target.value)}
              className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-2.5 font-body-md text-sm placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none" />
            <input placeholder="Service Name" value={name} onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-2.5 font-body-md text-sm placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none" />
            <select value={lang} onChange={(e) => setLang(e.target.value)}
              className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-2.5 font-body-md text-sm focus:border-primary focus:outline-none">
              <option value="java">Java</option><option value="python">Python</option><option value="typescript">TypeScript</option><option value="go">Go</option>
            </select>
            <button onClick={addRepo} className="rounded-xl bg-primary px-6 py-2.5 font-label-md text-sm text-on-primary hover:brightness-110">
              Add Repository
            </button>
          </div>
          {msg && (
            <p className={`mt-3 rounded-lg px-4 py-2 text-sm ${msg.ok ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"}`}>{msg.text}</p>
          )}
        </div>

        {/* ═══ Repo List ═══ */}
        {repos.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <MaterialIcon name="link_off" className="mx-auto mb-4 text-[48px] text-primary/20" />
            <p className="text-on-surface-variant/60">No repos registered. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {repos.map((r) => {
              const st = repoStatuses[r.id];
              return (
                <div key={r.id} className="glass-panel rounded-2xl p-5 transition-all hover:shadow-md">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 className="font-body-md font-bold text-on-surface truncate">{r.service_name}</h4>
                        <span className="rounded bg-surface-variant/30 px-2 py-0.5 text-[10px] font-bold uppercase text-on-surface-variant whitespace-nowrap">{r.primary_language}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant/60 mt-1 truncate">{r.github_repo_url}</p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Webhook Status */}
                      {st?.active ? (
                        <span className="flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-1 text-[11px] font-bold text-secondary">
                          <MaterialIcon name="check_circle" size={14} /> Webhook Active
                        </span>
                      ) : r.webhook?.success || r.webhook?.alreadyExists ? (
                        <span className="flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-1 text-[11px] font-bold text-secondary">
                          ✅ Webhook Set
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-tertiary-fixed/20 px-3 py-1 text-[11px] font-bold text-on-tertiary-fixed-variant">
                          ⚠️ Needs Setup
                        </span>
                      )}

                      {/* Scanned */}
                      <span className="text-xs text-on-surface-variant/50 whitespace-nowrap">
                        Scanned: {r.last_scanned_at ? new Date(r.last_scanned_at).toLocaleDateString() : "Never"}
                      </span>

                      {/* Actions */}
                      <button onClick={() => checkRepoStatus(r.id)} disabled={checkingRepo === r.id}
                        className="rounded-lg border border-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 disabled:opacity-50">
                        {checkingRepo === r.id ? "Checking..." : "Check Status"}
                      </button>
                      {!r.webhook?.success && !r.webhook?.alreadyExists && (
                        <button onClick={() => retryWebhook(r.id)}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-on-primary hover:brightness-110">
                          Setup Webhook
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
