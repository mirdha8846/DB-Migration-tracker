"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api } from "@/lib/api";

type Props = { params: { id: string } };

type Repo = {
  id: string; service_name: string; github_repo_url: string;
  primary_language: string; last_scanned_at: string | null;
};

type WebhookInfo = {
  webhookUrl: string | null; webhookSecret: string; configured: boolean;
  manualSetupSteps: Array<{ step: number; text: string; value?: string; copy?: boolean }>;
};

export default function ProjectReposPage({ params }: Props) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState(""); const [name, setName] = useState(""); const [lang, setLang] = useState("java");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [whInfo, setWhInfo] = useState<WebhookInfo | null>(null);

  const load = async () => {
    try { setRepos((await api.get(`/api/projects/${params.id}/repos`)).data); } catch { }
    try { setWhInfo((await api.get(`/api/projects/${params.id}/webhook-info`)).data); } catch { }
    setLoading(false);
  };
  useEffect(() => { void load(); }, [params.id]);

  const addRepo = async () => {
    if (!url.trim() || !name.trim()) return;
    try {
      await api.post(`/api/projects/${params.id}/repos`, { githubRepoUrl: url.trim(), serviceName: name.trim(), language: lang });
      setUrl(""); setName(""); await load();
      setMsg({ ok: true, text: "✅ Repo added. Now set up the webhook (see steps above)." });
    } catch { setMsg({ ok: false, text: "Failed to add repo" }); }
    setTimeout(() => setMsg(null), 8000);
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

        {/* ═══ Webhook Setup Card ═══ */}
        <div className="glass-card rounded-2xl p-6 mb-stack-lg border-2 border-primary-fixed/30">
          <h2 className="font-headline-md text-headline-md text-primary mb-4 flex items-center gap-2">
            <MaterialIcon name="link" className="text-primary" /> Webhook Setup
          </h2>

          {!whInfo?.configured ? (
            <p className="text-error text-sm">BACKEND_URL not set in backend .env — webhook URL cannot be generated.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="font-label-sm uppercase text-on-surface-variant text-xs mb-1">Payload URL</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-primary/10 px-4 py-3 font-mono text-sm text-primary break-all">{whInfo.webhookUrl}</code>
                    <button onClick={() => copyToClipboard(whInfo.webhookUrl!)} className="rounded-lg bg-primary/10 p-3 hover:bg-primary/20"><MaterialIcon name="content_copy" size={18} className="text-primary" /></button>
                  </div>
                </div>
                <div>
                  <p className="font-label-sm uppercase text-on-surface-variant text-xs mb-1">Secret</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg bg-primary/10 px-4 py-3 font-mono text-sm text-primary break-all">{whInfo.webhookSecret}</code>
                    <button onClick={() => copyToClipboard(whInfo.webhookSecret)} className="rounded-lg bg-primary/10 p-3 hover:bg-primary/20"><MaterialIcon name="content_copy" size={18} className="text-primary" /></button>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-primary/5 p-4 space-y-2 text-sm">
                <p className="font-label-sm uppercase text-on-surface-variant text-xs mb-2">Steps to add webhook in GitHub</p>
                {whInfo.manualSetupSteps.map((s) => (
                  <div key={s.step} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold mt-0.5">{s.step}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-on-surface-variant">{s.text}</span>
                      {s.value && (
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-white/50 rounded px-2 py-1 text-primary break-all">{s.value}</code>
                          {s.copy && <button onClick={() => copyToClipboard(s.value!)} className="text-primary hover:text-primary/70"><MaterialIcon name="content_copy" size={14} /></button>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            <button onClick={addRepo} className="rounded-xl bg-primary px-6 py-2.5 font-label-md text-sm text-on-primary hover:brightness-110">Add Repository</button>
          </div>
          {msg && <p className={`mt-3 rounded-lg px-4 py-2 text-sm ${msg.ok ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"}`}>{msg.text}</p>}
        </div>

        {/* ═══ Repo List ═══ */}
        {repos.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <MaterialIcon name="folder_open" className="mx-auto mb-4 text-[48px] text-primary/20" />
            <p className="text-on-surface-variant/60">No repos registered. Add one above.</p>
          </div>
        ) : (
          <div className="glass-panel overflow-hidden rounded-2xl">
            <table className="w-full text-left">
              <thead><tr className="border-b border-primary/5 bg-primary/5">
                <th className="px-6 py-4 font-label-sm text-xs uppercase text-on-surface-variant">Service</th>
                <th className="px-6 py-4 font-label-sm text-xs uppercase text-on-surface-variant">Repo URL</th>
                <th className="px-6 py-4 font-label-sm text-xs uppercase text-on-surface-variant">Language</th>
                <th className="px-6 py-4 font-label-sm text-xs uppercase text-on-surface-variant">Scanned</th>
              </tr></thead>
              <tbody className="divide-y divide-primary/5">
                {repos.map((r) => (
                  <tr key={r.id} className="hover:bg-primary/5">
                    <td className="px-6 py-4 font-body-md font-semibold text-on-surface">{r.service_name}</td>
                    <td className="px-6 py-4 font-code-sm text-primary text-xs max-w-[300px] truncate">{r.github_repo_url}</td>
                    <td className="px-6 py-4"><span className="rounded bg-surface-variant/30 px-2 py-1 text-[10px] font-bold uppercase">{r.primary_language}</span></td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant/70">{r.last_scanned_at ? new Date(r.last_scanned_at).toLocaleDateString() : "Never"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
