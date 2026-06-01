/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Spotlight } from "@/components/effects/Spotlight";
import { SteamParticles } from "@/components/effects/SteamParticles";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api } from "@/lib/api";
import { AdvisorInsight, OverviewStatsResponse, RecentMigration, RiskLevel } from "@/types";

function getRiskStyles(risk: RiskLevel) {
  if (risk === "CRITICAL") {
    return { riskClass: "bg-error/10 text-error border-error/20", dotClass: "glow-red" };
  }
  if (risk === "HIGH") {
    return { riskClass: "bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary/20", dotClass: "glow-orange" };
  }
  if (risk === "MEDIUM") {
    return { riskClass: "bg-secondary/10 text-secondary border-secondary/20", dotClass: "glow-orange" };
  }
  return { riskClass: "bg-secondary/10 text-secondary border-secondary/20", dotClass: "glow-green" };
}

export function OverviewPageContent() {
  const [stats, setStats] = useState<OverviewStatsResponse | null>(null);
  const [migrations, setMigrations] = useState<RecentMigration[]>([]);
  const [insights, setInsights] = useState<AdvisorInsight[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, m, i] = await Promise.all([
          api.get<OverviewStatsResponse>("/api/stats/overview"),
          api.get<RecentMigration[]>("/api/migrations/recent", { params: { limit: 10 } }),
          api.get<AdvisorInsight[]>("/api/advisor/insights"),
        ]);
        setStats(s.data);
        setMigrations(m.data);
        setInsights(i.data);
      } catch {
        /* ignore */
      }
    };
    void load();
  }, []);

  const statCards = useMemo(
    () =>
      stats
        ? [
            { icon: "database", label: "Total Migrations", value: String(stats.totalMigrations), valueClass: "text-primary", delay: "0.2s" },
            { icon: "warning", label: "Critical Risks", value: String(stats.criticalRisks).padStart(2, "0"), valueClass: "text-error", delay: "0.3s", pulse: true },
            { icon: "lan", label: "Affected Services", value: String(stats.affectedServices), valueClass: "text-on-surface", delay: "0.4s" },
            { icon: "task_alt", label: "Active Projects", value: String(stats.activeProjects), valueClass: "text-primary", delay: "0.5s" },
          ]
        : [],
    [stats],
  );

  return (
    <>
      <Spotlight />
      <SteamParticles />
      <DashboardShell
        variant="overview"
        active="overview"
        mainClassName="mx-auto ml-64 min-h-screen max-w-[1440px] px-gutter pb-gutter pt-20"
      >
        <div className="mb-stack-lg animate-fade-up opacity-0" style={{ animationDelay: "0.1s" }}>
          <h1 className="mb-1 font-headline-lg text-headline-lg text-primary">Overview</h1>
          <p className="font-body-md text-on-surface-variant/90">
            Real-time schema health and migration risk monitoring for your enterprise clusters.
          </p>
        </div>

        <div className="mb-stack-lg grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className={`glass-card animate-fade-up rounded-2xl p-6 opacity-0 ${stat.pulse ? "animate-pulse-critical" : ""}`}
              style={{ animationDelay: stat.delay }}
            >
              <div className="mb-4 flex items-start justify-between">
                <MaterialIcon
                  name={stat.icon}
                  className={stat.icon === "warning" ? "text-error" : stat.icon === "lan" ? "text-secondary" : "text-primary"}
                  size={32}
                />
                <span className="text-[12px] font-bold uppercase tracking-widest text-on-surface-variant">
                  live
                </span>
              </div>
              <h3 className="mb-1 font-label-md text-label-md text-on-surface-variant">{stat.label}</h3>
              <div className={`font-display-lg text-display-lg ${stat.valueClass}`}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
          <div
            className="glass-card animate-fade-up rounded-2xl p-6 opacity-0 lg:col-span-2"
            style={{ animationDelay: "0.6s" }}
          >
            <div className="mb-stack-lg flex items-center justify-between">
              <div>
                <h2 className="font-headline-md text-headline-md text-primary">Migration Volume</h2>
                <p className="font-label-md text-label-md text-on-surface-variant/70">
                  Last 30 days distribution by risk level
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="risk-dot glow-green" />
                  <span className="font-label-sm text-on-surface-variant">Low</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="risk-dot glow-orange" />
                  <span className="font-label-sm text-on-surface-variant">Med</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="risk-dot glow-red" />
                  <span className="font-label-sm text-on-surface-variant">Crit</span>
                </div>
              </div>
            </div>
            <div className="flex h-64 items-end gap-3 px-2">
              {stats?.migrationsByRisk.map((bar) => (
                <div key={bar.label} className="group flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm bg-primary/20" style={{ height: `${bar.low}px` }} />
                  <div
                    className="w-full rounded-sm bg-secondary/30 transition-colors group-hover:bg-secondary/50"
                    style={{ height: `${bar.medium}px` }}
                  />
                  <div className="w-full rounded-sm bg-error/20" style={{ height: `${bar.critical}px` }} />
                  <span className="mt-2 text-[10px] font-medium text-on-surface-variant">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="glass-card animate-fade-up flex flex-col rounded-2xl p-6 opacity-0"
            style={{ animationDelay: "0.7s" }}
          >
            <div className="mb-4 flex items-center gap-2">
              <MaterialIcon name="smart_toy" className="text-on-tertiary-container" />
              <h2 className="font-headline-md text-headline-md text-primary">AI Advisor</h2>
            </div>
            <div className="custom-scrollbar mb-4 max-h-[300px] flex-1 space-y-4 overflow-y-auto pr-2">
              {insights.map((insight) => (
                <div key={insight.id} className="rounded-xl border border-primary/5 bg-primary/5 p-4 font-body-md text-body-md">
                  <p className="leading-relaxed text-on-surface">{insight.message}</p>
                  <div className="mt-3 flex gap-2">
                    {insight.tags.map((tag) => (
                      <span key={tag} className="rounded bg-tertiary-fixed px-2 py-1 text-[10px] font-bold text-on-tertiary-fixed-variant">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="relative">
              <input
                className="w-full rounded-xl border border-primary/10 bg-primary/5 py-3 pl-4 pr-12 font-body-md text-body-md transition-all placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none"
                placeholder="Ask AI Advisor..."
                type="text"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-primary transition-transform hover:scale-110">
                <MaterialIcon name="send" />
              </button>
            </div>
          </div>
        </div>

        <div
          className="glass-card animate-fade-up mt-stack-lg overflow-hidden rounded-2xl opacity-0"
          style={{ animationDelay: "0.8s" }}
        >
          <div className="flex items-center justify-between border-b border-primary/5 p-6">
            <h2 className="font-headline-md text-headline-md text-primary">Recent Migrations</h2>
            <Link href="/migrations" className="font-label-md text-label-md text-primary decoration-primary transition-all hover:underline">
              View All Reports
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-primary/5">
                  {["Migration ID", "Service Name", "Risk Level", "Status", "Date", ""].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-6 py-4 font-label-md text-label-sm uppercase tracking-wider text-on-surface-variant"
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {migrations.map((row) => {
                  const { riskClass, dotClass } = getRiskStyles(row.riskLevel);
                  const status = row.status === "APPROVED" ? "Approved" : row.status === "REJECTED" ? "Rejected" : "Pending Review";
                  const statusIcon = row.status === "APPROVED" ? "check_circle" : row.status === "REJECTED" ? "cancel" : "history";
                  const statusClass = row.status === "APPROVED" ? "text-secondary" : row.status === "REJECTED" ? "text-error" : "text-on-surface";
                  return (
                  <tr key={row.id} className="group cursor-pointer transition-colors hover:bg-primary/5">
                    <td className="px-6 py-4 font-code-sm text-code-sm text-primary">
                      <Link href={`/migrations/${row.id.toLowerCase().replace("mig-2024-", "")}`}>{row.id}</Link>
                    </td>
                    <td className="px-6 py-4 font-body-md text-body-md text-on-surface">{row.serviceName}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-bold ${riskClass}`}
                      >
                        <span className={`risk-dot ${dotClass}`} />
                        {row.riskLevel}
                      </span>
                    </td>
                    <td className={`flex items-center gap-2 px-6 py-4 ${statusClass}`}>
                      <MaterialIcon name={statusIcon} className={`text-[18px] ${statusClass}`} />
                      {status}
                    </td>
                    <td className="px-6 py-4 font-body-md text-on-surface-variant/80">{row.createdAt}</td>
                    <td className="px-6 py-4 text-right">
                      <MaterialIcon
                        name="chevron_right"
                        className="translate-x-0 text-primary opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
