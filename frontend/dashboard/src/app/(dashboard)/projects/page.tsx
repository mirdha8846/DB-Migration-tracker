"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api } from "@/lib/api";

type ProjectRow = {
  id: string;
  name: string;
  dbType: string;
  createdAt: string;
  repoCount: number;
  migrationCount: number;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<ProjectRow[]>("/api/projects");
        setProjects(res.data);
      } catch {
        /* empty */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardShell
      variant="detail"
      active="schema-security"
      pageTitle="Schema Security"
      pageSubtitle="Projects"
      mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-stack-lg">
          <h1 className="font-headline-lg text-headline-lg text-primary">Schema Security</h1>
          <p className="mt-1 font-body-md text-on-surface-variant/80">
            Manage your database projects and monitor schema changes.
          </p>
        </div>

        {loading ? (
          <p className="py-8 text-center text-on-surface-variant/60">Loading projects...</p>
        ) : projects.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <MaterialIcon name="folder_open" className="mx-auto mb-4 text-[48px] text-primary/30" />
            <p className="text-on-surface-variant/60">No projects yet. Create your first project to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="glass-card group rounded-2xl p-6 transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-container">
                    <MaterialIcon name="database" className="text-primary" size={24} />
                  </div>
                  <span className="rounded bg-surface-variant/50 px-2 py-1 text-[10px] font-bold uppercase text-on-surface-variant">
                    {p.dbType}
                  </span>
                </div>
                <h3 className="mb-1 font-headline-md text-headline-md text-primary">{p.name}</h3>
                <div className="mt-4 flex gap-4 text-sm text-on-surface-variant/70">
                  <span className="flex items-center gap-1">
                    <MaterialIcon name="hub" size={14} /> {p.repoCount} repos
                  </span>
                  <span className="flex items-center gap-1">
                    <MaterialIcon name="swap_horiz" size={14} /> {p.migrationCount} migrations
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-primary/5 pt-4">
                  <span className="text-xs text-on-surface-variant/50">{new Date(p.createdAt).toLocaleDateString()}</span>
                  <MaterialIcon name="arrow_forward" className="text-primary opacity-0 transition-opacity group-hover:opacity-100" size={18} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
