"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api } from "@/lib/api";

type Props = { params: { id: string } };

type ProjectDetail = {
  id: string; name: string; db_type: string; created_at: string;
  repoCount: number; migrationCount: number;
  repos: Array<{ id: string; service_name: string; github_repo_url: string; primary_language: string; last_scanned_at: string | null }>;
};

export default function ProjectDetailPage({ params }: Props) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<ProjectDetail>(`/api/projects/${params.id}`);
        setProject(res.data);
      } catch { /* empty */ } finally { setLoading(false); }
    })();
  }, [params.id]);

  if (loading) {
    return <DashboardShell variant="detail" active="schema-security" mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop"><p className="py-8 text-center text-on-surface-variant/60">Loading project...</p></DashboardShell>;
  }
  if (!project) {
    return <DashboardShell variant="detail" active="schema-security" mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop"><p className="py-8 text-center text-on-surface-variant/60">Project not found.</p></DashboardShell>;
  }

  return (
    <DashboardShell
      variant="detail" active="schema-security"
      pageTitle={project.name}
      pageSubtitle={`${project.db_type} • ${project.repoCount} repos • ${project.migrationCount} migrations`}
      mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop"
    >
      <div className="mx-auto max-w-[1440px]">

        {/* Quick Action Buttons */}
        <div className="mb-stack-lg flex flex-wrap gap-3">
          <Link href={`/projects/${params.id}/repos`}
            className="rounded-xl bg-primary px-6 py-3 font-label-md text-label-md text-on-primary transition-all hover:brightness-110 flex items-center gap-2">
            <MaterialIcon name="add" size={18} />
            Add Repository
          </Link>
          <Link href={`/projects/${params.id}/graph`}
            className="rounded-xl border border-primary/10 px-6 py-3 font-label-md text-label-md text-primary transition-all hover:bg-primary/5 flex items-center gap-2">
            <MaterialIcon name="account_tree" size={18} />
            Dependency Graph
          </Link>
          <Link href={`/projects/${params.id}/migrations`}
            className="rounded-xl border border-primary/10 px-6 py-3 font-label-md text-label-md text-primary transition-all hover:bg-primary/5 flex items-center gap-2">
            <MaterialIcon name="swap_horiz" size={18} />
            View Migrations
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="mb-stack-lg grid grid-cols-1 gap-gutter md:grid-cols-3">
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-sm text-on-surface-variant">Repositories</p>
            <p className="font-display-lg text-display-lg text-primary">{project.repoCount}</p>
          </div>
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-sm text-on-surface-variant">Migrations</p>
            <p className="font-display-lg text-display-lg text-primary">{project.migrationCount}</p>
          </div>
          <Link href={`/projects/${params.id}/graph`}
            className="glass-card rounded-2xl p-6 text-center transition-all hover:shadow-lg group">
            <p className="text-sm text-on-surface-variant">Dependency Graph</p>
            <p className="mt-2 flex items-center justify-center gap-1 text-primary font-bold">
              View Graph <MaterialIcon name="arrow_forward" size={18} className="transition-transform group-hover:translate-x-1" />
            </p>
          </Link>
        </div>

        {/* Registered Repos Section */}
        <div className="glass-panel rounded-2xl p-6 mb-stack-lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-primary">Registered Repositories</h2>
            <Link href={`/projects/${params.id}/repos`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary hover:brightness-110 flex items-center gap-1">
              <MaterialIcon name="add" size={16} /> Add Repo
            </Link>
          </div>
          {project.repos.length === 0 ? (
            <div className="py-8 text-center">
              <MaterialIcon name="link_off" className="mx-auto mb-3 text-[40px] text-primary/20" />
              <p className="text-sm text-on-surface-variant/60 mb-3">No repositories registered yet.</p>
              <Link href={`/projects/${params.id}/repos`}
                className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/20">
                <MaterialIcon name="add" size={16} /> Add Your First Repository
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {project.repos.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-primary/5 bg-primary/5 px-4 py-3">
                  <div>
                    <p className="font-body-md font-semibold text-on-surface">{r.service_name}</p>
                    <p className="text-xs text-on-surface-variant/60">{r.github_repo_url}</p>
                  </div>
                  <span className="rounded bg-surface-variant/30 px-2 py-1 text-[10px] font-bold uppercase text-on-surface-variant">{r.primary_language}</span>
                </div>
              ))}
              {project.repos.length > 5 && (
                <Link href={`/projects/${params.id}/repos`} className="block text-center text-sm font-bold text-primary hover:underline py-2">
                  View all {project.repos.length} repos →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Migrations Section */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-primary">Migrations</h2>
            <Link href={`/projects/${params.id}/migrations`} className="text-sm font-bold text-primary hover:underline">
              View All
            </Link>
          </div>
          {project.migrationCount === 0 ? (
            <div className="py-8 text-center">
              <MaterialIcon name="history" className="mx-auto mb-3 text-[40px] text-primary/20" />
              <p className="text-sm text-on-surface-variant/60">No migrations yet. Open a PR with SQL files to trigger analysis.</p>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-on-surface-variant/60">
              {project.migrationCount} migration(s) found.
              <Link href={`/projects/${params.id}/migrations`} className="ml-1 font-bold text-primary hover:underline">View details →</Link>
            </p>
          )}
        </div>

      </div>
    </DashboardShell>
  );
}
