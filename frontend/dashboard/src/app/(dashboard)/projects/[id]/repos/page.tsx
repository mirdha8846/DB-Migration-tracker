"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api } from "@/lib/api";

type Props = { params: { id: string } };

type WebhookInfo = { success: boolean; webhookUrl?: string; error?: string; alreadyExists?: boolean; webhookId?: number };

type Repo = {
  id: string;
  service_name: string;
  github_repo_url: string;
  primary_language: string;
  last_scanned_at: string | null;
  webhook?: WebhookInfo;
};

const WEBHOOK_PATH = "/webhook/github";

export default function ProjectReposPage({ params }: Props) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [lang, setLang] = useState("java");
  const [addResult, setAddResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const backendUrl = typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || ""
    : "";
  const webhookFullUrl = backendUrl ? `${backendUrl}${WEBHOOK_PATH}` : "Not configured — set NEXT_PUBLIC_API_URL";

  const load = async () => {
    try {
      const res = await api.get<Repo[]>(`/api/projects/${params.id}/repos`);
      setRepos(res.data);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { void load(); }, [params.id]);

  const addRepo = async () => {
    if (!url.trim() || !name.trim()) return;
    setAddResult(null);
    try {
      const res = await api.post<Repo>(`/api/projects/${params.id}/repos`, {
        githubRepoUrl: url.trim(), serviceName: name.trim(), language: lang,
      });
      setUrl(""); setName("");
      await load();

      const d = res.data;
      const wh = d.webhook as WebhookInfo | undefined;
      if (wh?.success) {
        setAddResult({ ok: true, msg: `✅ Repo added + webhook ${wh.alreadyExists ? "already exists" : "auto-created"}` });
      } else if (wh?.error) {
        setAddResult({ ok: false, msg: `Repo added. Webhook: ${wh.error}. Add manually in GitHub → Settings → Webhooks → ${webhookFullUrl}` });
      } else {
        setAddResult({ ok: true, msg: "Repo added. Webhook not set — add GITHUB_TOKEN in backend .env for auto-setup" });
      }
    } catch {
      setAddResult({ ok: false, msg: "Failed to add repo" });
    }
    setTimeout(() => setAddResult(null), 10000);
  };

  const retryWebhook = async (repoId: string) => {
    try {
      const res = await api.post(`/api/projects/${params.id}/repos/${repoId}/webhook`);
      await load();
      setAddResult({ ok: res.data.success, msg: res.data.success ? "Webhook created ✅" : `Failed: ${res.data.error}` });
    } catch {
      setAddResult({ ok: false, msg: "Webhook setup failed" });
    }
    setTimeout(() => setAddResult(null), 8000);
  };

  return (
    <DashboardShell
      variant="detail" active="schema-security"
      pageTitle="Registered Repos" pageSubtitle={params.id}
      mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop"
    >
      <div className="mx-auto max-w-[1440px]">
        <h1 className="font-headline-lg text-headline-lg text-primary">Registered Repositories</h1>
        <p className="mt-1 font-body-md text-on-surface-variant/80">
          Add your GitHub repos here. When a PR with SQL migration files is opened, SchemaGuard auto-analyzes it.
        </p>

        {/* Webhook URL Info */}
        <div className="glass-card mt-stack-lg mb-stack-lg rounded-2xl p-6 border border-primary-fixed/20">
          <div className="flex items-center gap-3 mb-2">
            <MaterialIcon name="link" className="text-primary" size={24} />
            <h3 className="font-headline-md text-headline-md text-primary">Your Webhook URL</h3>
          </div>
          <p className="font-body-md text-on-surface-variant/70 mb-2">
            Use this URL in GitHub repo → Settings → Webhooks for ALL repos:
          </p>
          <code className="block rounded-lg bg-primary/10 px-4 py-3 font-mono text-sm text-primary break-all">
            {webhookFullUrl}
          </code>
          <p className="mt-2 text-xs text-on-surface-variant/50">
            Secret: {process.env.NEXT_PUBLIC_API_URL ? "Set in backend .env as GITHUB_WEBHOOK_SECRET" : "Not configured"}
          </p>
        </div>

        {/* Add Repo Form */}
        <div className="glass-panel mb-stack-lg rounded-2xl p-6">
          <h3 className="mb-4 font-headline-md text-headline-md text-primary">Register a Repository</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input placeholder="GitHub URL (e.g. https://github.com/you/repo)" value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-2.5 font-body-md placeholder:text-on-surface-variant/40 focus:border-primary/30 focus:outline-none" />
            <input placeholder="Service Name" value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-2.5 font-body-md placeholder:text-on-surface-variant/40 focus:border-primary/30 focus:outline-none" />
            <select value={lang} onChange={(e) => setLang(e.target.value)}
              className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-2.5 font-body-md focus:border-primary/30 focus:outline-none">
              <option value="java">Java</option><option value="python">Python</option>
              <option value="typescript">TypeScript</option><option value="go">Go</option>
            </select>
            <button onClick={addRepo} className="rounded-xl bg-primary px-6 py-2.5 font-label-md text-label-md text-on-primary hover:brightness-110">
              Add Repository
            </button>
          </div>
          {addResult && (
            <p className={`mt-3 rounded-lg px-4 py-2 text-sm ${addResult.ok ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"}`}>
              {addResult.msg}
            </p>
          )}
        </div>

        {/* Repo List */}
        {loading ? (
          <p className="py-8 text-center text-on-surface-variant/60">Loading...</p>
        ) : repos.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <MaterialIcon name="folder_open" className="mx-auto mb-4 text-[48px] text-primary/30" />
            <p className="text-on-surface-variant/60">No repos registered. Add one above.</p>
          </div>
        ) : (
          <div className="glass-panel overflow-hidden rounded-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-primary/5 bg-primary/5">
                  <th className="px-6 py-4 font-label-sm text-label-sm uppercase text-on-surface-variant">Service</th>
                  <th className="px-6 py-4 font-label-sm text-label-sm uppercase text-on-surface-variant">Repo</th>
                  <th className="px-6 py-4 font-label-sm text-label-sm uppercase text-on-surface-variant">Language</th>
                  <th className="px-6 py-4 font-label-sm text-label-sm uppercase text-on-surface-variant">Webhook</th>
                  <th className="px-6 py-4 font-label-sm text-label-sm uppercase text-on-surface-variant">Scanned</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {repos.map((r) => {
                  const whOk = r.webhook?.success || r.webhook?.alreadyExists;
                  const whIcon = whOk ? "✅" : r.webhook?.error ? "⚠️" : "—";
                  const whText = whOk ? "Auto" : r.webhook?.error ? r.webhook.error.substring(0, 50) : "Manual";

                  return (
                    <tr key={r.id} className="transition-colors hover:bg-primary/5">
                      <td className="px-6 py-4 font-body-md font-semibold text-on-surface">{r.service_name}</td>
                      <td className="px-6 py-4 font-code-sm text-primary max-w-[200px] truncate">{r.github_repo_url}</td>
                      <td className="px-6 py-4">
                        <span className="rounded bg-surface-variant/30 px-3 py-1 text-[11px] font-bold uppercase text-on-surface-variant">{r.primary_language}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${whOk ? "bg-secondary/10 text-secondary" : "bg-tertiary-fixed/30 text-on-tertiary-fixed-variant"}`}>
                          {whIcon} {whText}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-body-md text-on-surface-variant/70">
                        {r.last_scanned_at ? new Date(r.last_scanned_at).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!whOk && (
                          <button onClick={() => retryWebhook(r.id)} className="font-label-sm font-bold text-primary hover:underline mr-3">
                            Setup Webhook
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
