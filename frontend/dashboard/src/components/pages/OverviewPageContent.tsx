import Link from "next/link";
import { Spotlight } from "@/components/effects/Spotlight";
import { SteamParticles } from "@/components/effects/SteamParticles";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

const stats = [
  {
    icon: "database",
    delta: "+12%",
    deltaClass: "text-secondary",
    label: "Total Migrations",
    value: "1,284",
    valueClass: "text-primary",
    pulse: false,
    delay: "0.2s",
  },
  {
    icon: "warning",
    delta: "-4%",
    deltaClass: "text-error",
    label: "Critical Risks",
    value: "07",
    valueClass: "text-error",
    pulse: true,
    delay: "0.3s",
  },
  {
    icon: "lan",
    delta: "Steady",
    deltaClass: "text-on-surface-variant",
    label: "Affected Services",
    value: "14",
    valueClass: "text-on-surface",
    pulse: false,
    delay: "0.4s",
  },
  {
    icon: "task_alt",
    delta: "+2",
    deltaClass: "text-on-surface-variant",
    label: "Active Projects",
    value: "32",
    valueClass: "text-primary",
    pulse: false,
    delay: "0.5s",
  },
];

const chartBars = [
  { label: "M1", h1: "h-12", h2: "h-6", h3: "h-2" },
  { label: "T2", h1: "h-20", h2: "h-10", h3: "h-4" },
  { label: "W3", h1: "h-32", h2: "h-4", h3: "h-8" },
  { label: "T4", h1: "h-16", h2: "h-12", h3: "h-2" },
  { label: "F5", h1: "h-40", h2: "h-6", h3: "h-4" },
  { label: "S6", h1: "h-14", h2: "h-8", h3: "h-2" },
  { label: "S7", h1: "h-8", h2: "h-4", h3: "h-2" },
  { label: "M8", h1: "h-48", h2: "h-12", h3: "h-16" },
];

const migrations = [
  {
    id: "MIG-2024-8842",
    href: "/migrations/8842-x",
    service: "inventory-api-v2",
    risk: "CRITICAL",
    riskClass: "bg-error/10 text-error border-error/20",
    dotClass: "glow-red",
    status: "Pending Review",
    statusIcon: "history",
    statusClass: "text-on-surface",
    date: "Oct 24, 14:22",
  },
  {
    id: "MIG-2024-8841",
    href: "/migrations/8841",
    service: "auth-server-global",
    risk: "MEDIUM",
    riskClass: "bg-secondary/10 text-secondary border-secondary/20",
    dotClass: "glow-orange",
    status: "Approved",
    statusIcon: "check_circle",
    statusClass: "text-secondary",
    date: "Oct 24, 12:05",
  },
];

export function OverviewPageContent() {
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
          {stats.map((stat) => (
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
                <span className={`text-[12px] font-bold uppercase tracking-widest ${stat.deltaClass}`}>
                  {stat.delta}
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
              {chartBars.map((bar) => (
                <div key={bar.label} className="group flex flex-1 flex-col items-center gap-1">
                  <div className={`w-full rounded-t-sm bg-primary/20 ${bar.h1}`} />
                  <div
                    className={`w-full rounded-sm bg-secondary/30 ${bar.h2} transition-colors group-hover:bg-secondary/50`}
                  />
                  <div className={`w-full rounded-sm bg-error/20 ${bar.h3}`} />
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
              <div className="rounded-xl border border-primary/5 bg-primary/5 p-4 font-body-md text-body-md">
                <p className="leading-relaxed text-on-surface">
                  I&apos;ve detected a high-risk schema change in{" "}
                  <span className="font-bold text-on-tertiary-container">Project Phoenix</span>. The new
                  unique index on{" "}
                  <code className="rounded bg-primary/10 px-1 font-code-sm text-primary">
                    user_metadata
                  </code>{" "}
                  could cause blocking on production during peak hours.
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded bg-tertiary-fixed px-2 py-1 text-[10px] font-bold text-on-tertiary-fixed-variant">
                    SCHEMA_CHANGE
                  </span>
                  <span className="rounded bg-error-container px-2 py-1 text-[10px] font-bold text-error">
                    LOCKING_RISK
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-primary/5 bg-primary/5 p-4 font-body-md text-body-md">
                <p className="leading-relaxed text-on-surface">
                  Consider using{" "}
                  <code className="rounded bg-primary/10 px-1 font-code-sm text-primary">
                    CONCURRENTLY
                  </code>{" "}
                  for this migration to avoid downtime.
                </p>
              </div>
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
            <button className="font-label-md text-label-md text-primary decoration-primary transition-all hover:underline">
              View All Reports
            </button>
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
                {migrations.map((row) => (
                  <tr key={row.id} className="group cursor-pointer transition-colors hover:bg-primary/5">
                    <td className="px-6 py-4 font-code-sm text-code-sm text-primary">
                      <Link href={row.href}>{row.id}</Link>
                    </td>
                    <td className="px-6 py-4 font-body-md text-body-md text-on-surface">{row.service}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-bold ${row.riskClass}`}
                      >
                        <span className={`risk-dot ${row.dotClass}`} />
                        {row.risk}
                      </span>
                    </td>
                    <td className={`flex items-center gap-2 px-6 py-4 ${row.statusClass}`}>
                      <MaterialIcon name={row.statusIcon} className={`text-[18px] ${row.statusClass}`} />
                      {row.status}
                    </td>
                    <td className="px-6 py-4 font-body-md text-on-surface-variant/80">{row.date}</td>
                    <td className="px-6 py-4 text-right">
                      <MaterialIcon
                        name="chevron_right"
                        className="translate-x-0 text-primary opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DashboardShell>
    </>
  );
}
