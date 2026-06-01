"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api } from "@/lib/api";

type Props = { params: { id: string } };

type ProjectDetail = {
  id: string;
  name: string;
  db_type: string;
  created_at: string;
  repoCount: number;
  migrationCount: number;
  repos: Array<{
    id: string;
    service_name: string;
    github_repo_url: string;
    primary_language: string;
    last_scanned_at: string | null;
  }>;
};

export default function ProjectDetailPage({ params }: Props) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<ProjectDetail>(`/api/projects/${params.id}`);
        setProject(res.data);
      } catch {
        /* empty */
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  if (loading) {
    return (
      <DashboardShell variant="detail" active="schema-security" mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop">
        <p className="py-8 text-center text-on-surface-variant/60">Loading project...</p>
      </DashboardShell>
    );
  }

  if (!project) {
    return (
      <DashboardShell variant="detail" active="schema-security" mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop">
        <p className="py-8 text-center text-on-surface-variant/60">Project not found.</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      variant="detail"
      active="schema-security"
      pageTitle={project.name}
      pageSubtitle={`${project.db_type} • ${project.repoCount} repos • ${project.migrationCount} migrations`}
      mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-stack-lg grid grid-cols-1 gap-gutter md:grid-cols-3">
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-sm text-on-surface-variant">Repositories</p>
            <p className="font-display-lg text-display-lg text-primary">{project.repoCount}</p>
          </div>
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-sm text-on-surface-variant">Migrations</p>
            <p className="font-display-lg text-display-lg text-primary">{project.migrationCount}</p>
          </div>
          <Link
            href={`/projects/${params.id}/graph`}
            className="glass-card rounded-2xl p-6 text-center transition-all hover:shadow-lg group"
          >
            <p className="text-sm text-on-surface-variant">Dependency Graph</p>
            <p className="mt-2 flex items-center justify-center gap-1 text-primary font-bold">
              View Graph <MaterialIcon name="arrow_forward" size={18} className="transition-transform group-hover:translate-x-1" />
            </p>
          </Link>
        </div>

        <div className="mb-stack-lg grid grid-cols-1 gap-gutter lg:grid-cols-2">
          <div className="glass-panel rounded-2xl p-6">
            <h2 className="mb-4 font-headline-md text-headline-md text-primary">Registered Repos</h2>
            {project.repos.length === 0 ? (
              <p className="py-4 text-center text-sm text-on-surface-variant/60">No repos registered.</p>
            ) : (
              <div className="space-y-2">
                {project.repos.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-primary/5 bg-primary/5 px-4 py-3">
                    <div>
                      <p className="font-body-md font-semibold text-on-surface">{r.service_name}</p>
                      <p className="text-xs text-on-surface-variant/60">{r.github_repo_url}</p>
                    </div>
                    <span className="rounded bg-surface-variant/30 px-2 py-1 text-[10px] font-bold uppercase text-on-surface-variant">
                      {r.primary_language}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md text-primary">Recent Migrations</h2>
              <Link href={`/projects/${params.id}/migrations`} className="text-sm font-bold text-primary hover:underline">
                View All
              </Link>
            </div>
            <Link
              href={`/migrations/${params.id}`}
              className="block rounded-xl border border-primary/5 bg-primary/5 px-4 py-4 transition-all hover:bg-primary/10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MaterialIcon name="swap_horiz" className="text-primary" size={20} />
                  <span className="font-body-md font-semibold text-on-surface">v1.2.4 Migration</span>
                </div>
                <MaterialIcon name="chevron_right" className="text-on-surface-variant" />
              </div>
            </Link>
          </div>
        </div>

        <div className="flex gap-4">
          <Link
            href={`/projects/${params.id}/graph`}
            className="rounded-xl bg-primary px-6 py-3 font-label-md text-label-md text-on-primary transition-all hover:brightness-110"
          >
            View Dependency Graph
          </Link>
          <Link
            href={`/projects/${params.id}/migrations`}
            className="rounded-xl border border-primary/10 px-6 py-3 font-label-md text-label-md text-primary transition-all hover:bg-primary/5"
          >
            View All Migrations
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
