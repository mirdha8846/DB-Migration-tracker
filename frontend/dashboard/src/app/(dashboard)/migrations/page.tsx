"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api } from "@/lib/api";

type MigrationRow = {
  id: string;
  serviceName: string;
  riskLevel: string;
  status: string;
  createdAt: string;
};

const riskMap: Record<string, string> = {
  LOW: "bg-secondary/10 text-secondary border-secondary/20",
  MEDIUM: "bg-tertiary-fixed/30 text-on-tertiary-fixed-variant border-tertiary/20",
  HIGH: "bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary/20",
  CRITICAL: "bg-error/10 text-error border-error/20",
};

export default function MigrationsPage() {
  const [migrations, setMigrations] = useState<MigrationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<MigrationRow[]>("/api/migrations/recent", { params: { limit: 50 } });
        setMigrations(res.data);
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
      active="migration-risk"
      pageTitle="Migration Risk"
      pageSubtitle="All Migrations"
      mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-stack-lg">
          <h1 className="font-headline-lg text-headline-lg text-primary">Migration Risk</h1>
          <p className="mt-1 font-body-md text-on-surface-variant/80">
            Review and manage all detected schema migrations across your projects.
          </p>
        </div>

        {loading ? (
          <p className="py-8 text-center text-on-surface-variant/60">Loading migrations...</p>
        ) : migrations.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <MaterialIcon name="history" className="mx-auto mb-4 text-[48px] text-primary/30" />
            <p className="text-on-surface-variant/60">No migrations found.</p>
          </div>
        ) : (
          <div className="glass-panel overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-primary/5 bg-primary/5">
                    <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Migration ID</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Service</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Risk Level</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Status</th>
                    <th className="px-6 py-4 font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Date</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {migrations.map((m) => {
                    const statusLabels: Record<string, string> = {
                      PENDING_REVIEW: "Pending Review",
                      APPROVED: "Approved",
                      REJECTED: "Rejected",
                    };
                    const status = m.status || "PENDING_REVIEW";
                    const statusClass =
                      status === "APPROVED" ? "text-secondary" : status === "REJECTED" ? "text-error" : "text-on-surface";
                    const statusIcon =
                      status === "APPROVED" ? "check_circle" : status === "REJECTED" ? "cancel" : "history";
                    return (
                      <tr key={m.id} className="group transition-colors hover:bg-primary/5">
                        <td className="px-6 py-4 font-code-sm text-primary">
                          <Link href={`/migrations/${m.id}`} className="hover:underline">
                            {m.id.substring(0, 8)}...
                          </Link>
                        </td>
                        <td className="px-6 py-4 font-body-md text-on-surface">{m.serviceName}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${riskMap[m.riskLevel] || riskMap.LOW}`}>
                            {m.riskLevel}
                          </span>
                        </td>
                        <td className={`flex items-center gap-2 px-6 py-4 ${statusClass}`}>
                          <MaterialIcon name={statusIcon} className={`text-[18px] ${statusClass}`} />
                          <span className="font-body-md">{statusLabels[status] || status}</span>
                        </td>
                        <td className="px-6 py-4 font-body-md text-on-surface-variant/70">{m.createdAt}</td>
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
