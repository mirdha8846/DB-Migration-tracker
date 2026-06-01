"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api } from "@/lib/api";

type Props = { params: { id: string } };

type MigrationRow = {
  id: string;
  file_path: string;
  status: string;
  riskLevel: string;
  pr_number: number | null;
  created_at: string;
};

export default function ProjectMigrationsPage({ params }: Props) {
  const [migrations, setMigrations] = useState<MigrationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<MigrationRow[]>(`/api/projects/${params.id}/migrations`);
        setMigrations(res.data);
      } catch {
        /* empty */
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  const statusMap: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-surface-variant/30 text-on-surface-variant" },
    analyzing: { label: "Analyzing", className: "bg-tertiary-fixed/30 text-on-tertiary-fixed-variant" },
    analyzed: { label: "Analyzed", className: "bg-secondary/10 text-secondary" },
    applied: { label: "Applied", className: "bg-secondary/20 text-secondary" },
    failed: { label: "Failed", className: "bg-error/10 text-error" },
    approved: { label: "Approved", className: "bg-secondary/20 text-secondary" },
    rejected: { label: "Rejected", className: "bg-error/10 text-error" },
  };

  const riskMap: Record<string, string> = {
    low: "bg-secondary/10 text-secondary",
    medium: "bg-tertiary-fixed/30 text-on-tertiary-fixed-variant",
    high: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
    critical: "bg-error/10 text-error",
  };

  return (
    <DashboardShell
      variant="detail"
      active="migration-risk"
      pageTitle="Migrations"
      pageSubtitle={params.id}
      mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-stack-lg flex items-center justify-between">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary">Migrations</h1>
            <p className="mt-1 font-body-md text-on-surface-variant/80">
              Migration history for project {params.id}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-on-surface-variant/60">Loading migrations...</p>
        ) : migrations.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <MaterialIcon name="history" className="mx-auto mb-4 text-[48px] text-primary/30" />
            <p className="text-on-surface-variant/60">No migrations found for this project.</p>
          </div>
        ) : (
          <div className="glass-panel overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-primary/5 bg-primary/5">
                    <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">File</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Risk</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Status</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">PR</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Date</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {migrations.map((m) => {
                    const status = statusMap[m.status] || statusMap.pending;
                    const riskLevel = (m.riskLevel || "low").toLowerCase();
                    return (
                      <tr key={m.id} className="group transition-colors hover:bg-primary/5">
                        <td className="px-6 py-4 font-body-md font-semibold text-on-surface">
                          <Link href={`/migrations/${m.id}`} className="hover:text-primary">
                            {m.file_path}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${riskMap[riskLevel] || riskMap.low}`}>
                            {riskLevel}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-code-sm text-on-surface-variant">
                          {m.pr_number ? `#${m.pr_number}` : "—"}
                        </td>
                        <td className="px-6 py-4 font-body-md text-on-surface-variant/70">
                          {new Date(m.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/migrations/${m.id}`}>
                            <MaterialIcon name="chevron_right" className="text-primary opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
