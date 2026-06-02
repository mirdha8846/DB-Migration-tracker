"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api } from "@/lib/api";

type Props = { params: { id: string } };

type Repo = {
  id: string;
  service_name: string;
  github_repo_url: string;
  primary_language: string;
  last_scanned_at: string | null;
  webhook?: { success: boolean; webhookUrl?: string; error?: string; alreadyExists?: boolean };
};

export default function ProjectReposPage({ params }: Props) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [lang, setLang] = useState("java");

  const load = async () => {
    try {
      const res = await api.get<Repo[]>(`/api/projects/${params.id}/repos`);
      setRepos(res.data);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { void load(); }, [params.id]);

  const [addResult, setAddResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const addRepo = async () => {
    if (!url.trim() || !name.trim()) return;
    setAddResult(null);
    try {
      const res = await api.post<Repo>(`/api/projects/${params.id}/repos`, {
        githubRepoUrl: url.trim(),
        serviceName: name.trim(),
        language: lang,
      });
      const data = res.data;
      setUrl("");
      setName("");
      await load();

      if (data.webhook?.success) {
        setAddResult({ ok: true, msg: `Repo added + GitHub webhook ${data.webhook.alreadyExists ? "already exists" : "created"} ✅` });
      } else if (data.webhook?.error) {
        setAddResult({ ok: false, msg: `Repo added but webhook failed: ${data.webhook.error}. Add manually: Settings → Webhooks → ${data.webhook.webhookUrl || "your-backend/webhook/github"}` });
      } else {
        setAddResult({ ok: true, msg: "Repo added successfully" });
      }
    } catch {
      setAddResult({ ok: false, msg: "Failed to add repo" });
    }
    setTimeout(() => setAddResult(null), 8000);
  };

  return (
    <DashboardShell
      variant="detail"
      active="schema-security"
      pageTitle="Registered Repos"
      pageSubtitle={params.id}
      mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop"
    >
      <div className="mx-auto max-w-[1440px]">
        <h1 className="font-headline-lg text-headline-lg text-primary">Registered Repositories</h1>
        <p className="mt-1 font-body-md text-on-surface-variant/80">
          These are the GitHub repos SchemaGuard will scan when a PR contains SQL migration files.
        </p>

        {/* Add Repo Form */}
        <div className="glass-panel mb-stack-lg mt-stack-lg rounded-2xl p-6">
          <h3 className="mb-4 font-headline-md text-headline-md text-primary">Register a New Repository</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <input
              placeholder="GitHub URL (e.g. https://github.com/org/repo)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-2.5 font-body-md placeholder:text-on-surface-variant/40 focus:border-primary/30 focus:outline-none"
            />
            <input
              placeholder="Service Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-2.5 font-body-md placeholder:text-on-surface-variant/40 focus:border-primary/30 focus:outline-none"
            />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-2.5 font-body-md focus:border-primary/30 focus:outline-none"
            >
              <option value="java">Java</option>
              <option value="python">Python</option>
              <option value="typescript">TypeScript</option>
              <option value="go">Go</option>
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

        {loading ? (
          <p className="py-8 text-center text-on-surface-variant/60">Loading...</p>
        ) : repos.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <MaterialIcon name="folder_open" className="mx-auto mb-4 text-[48px] text-primary/30" />
            <p className="text-on-surface-variant/60">No repos registered yet. Add one above to start scanning.</p>
          </div>
        ) : (
          <div className="glass-panel overflow-hidden rounded-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-primary/5 bg-primary/5">
                  <th className="px-6 py-4 font-label-sm text-label-sm uppercase text-on-surface-variant">Service</th>
                  <th className="px-6 py-4 font-label-sm text-label-sm uppercase text-on-surface-variant">Repository URL</th>
                  <th className="px-6 py-4 font-label-sm text-label-sm uppercase text-on-surface-variant">Language</th>
                  <th className="px-6 py-4 font-label-sm text-label-sm uppercase text-on-surface-variant">Last Scanned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {repos.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-primary/5">
                    <td className="px-6 py-4 font-body-md font-semibold text-on-surface">{r.service_name}</td>
                    <td className="px-6 py-4 font-code-sm text-primary">{r.github_repo_url}</td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-surface-variant/30 px-3 py-1 text-[11px] font-bold uppercase text-on-surface-variant">
                        {r.primary_language}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-body-md text-on-surface-variant/70">
                      {r.last_scanned_at ? new Date(r.last_scanned_at).toLocaleDateString() : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* How it works */}
        <div className="glass-card mt-stack-lg rounded-2xl p-8">
          <h3 className="mb-4 font-headline-md text-headline-md text-primary">How It Works</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {[
              { step: "1", title: "Register Repo", desc: "Add your GitHub repo URL + service name above" },
              { step: "2", title: "Set Webhook", desc: "In GitHub repo → Settings → Webhooks → Add your Render URL" },
              { step: "3", title: "Open PR", desc: "Create a PR with SQL migration files in /migrations/ folder" },
              { step: "4", title: "Auto Analyze", desc: "SchemaGuard parses SQL, scans code, AI explains risks" },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-primary font-bold text-lg">
                  {s.step}
                </div>
                <h4 className="font-body-md font-bold text-on-surface">{s.title}</h4>
                <p className="mt-1 text-sm text-on-surface-variant/70">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
