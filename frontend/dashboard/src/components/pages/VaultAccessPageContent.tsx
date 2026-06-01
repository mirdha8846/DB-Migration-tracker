import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

const vaultEntries = [
  {
    name: "Production DB Credentials",
    type: "PostgreSQL",
    scope: "production-v2",
    lastRotated: "Oct 18, 2026",
    status: "Active",
    statusClass: "bg-secondary/10 text-secondary border-secondary/20",
  },
  {
    name: "GitHub App Private Key",
    type: "GitHub Integration",
    scope: "org-wide",
    lastRotated: "Sep 02, 2026",
    status: "Active",
    statusClass: "bg-secondary/10 text-secondary border-secondary/20",
  },
  {
    name: "Anthropic API Key",
    type: "AI Agent",
    scope: "advisor-service",
    lastRotated: "Aug 14, 2026",
    status: "Expiring",
    statusClass: "bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary/20",
  },
  {
    name: "Slack Webhook Secret",
    type: "Notifications",
    scope: "alerts-channel",
    lastRotated: "Jul 30, 2026",
    status: "Revoked",
    statusClass: "bg-error/10 text-error border-error/20",
  },
];

export function VaultAccessPageContent() {
  return (
    <DashboardShell
      variant="detail"
      active="vault"
      pageTitle="Vault Access"
      pageSubtitle="Encrypted Secrets"
      mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-stack-lg">
          <h1 className="font-headline-lg text-headline-lg text-primary">Vault Access</h1>
          <p className="mt-1 font-body-md text-on-surface-variant/80">
            Manage encrypted credentials, rotation policies, and secret access for your schema
            environments.
          </p>
        </div>

        <div className="mb-stack-lg grid grid-cols-1 gap-gutter md:grid-cols-3">
          {[
            { icon: "key", label: "Stored Secrets", value: "24", sub: "+3 this month" },
            { icon: "verified_user", label: "Active Access Grants", value: "11", sub: "2 pending review" },
            { icon: "schedule", label: "Rotations Due", value: "02", sub: "Next in 4 days" },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-2xl p-6">
              <MaterialIcon name={stat.icon} className="mb-4 text-primary" size={28} />
              <p className="font-label-md text-label-md text-on-surface-variant">{stat.label}</p>
              <p className="font-display-lg text-display-lg text-primary">{stat.value}</p>
              <p className="mt-1 font-label-sm text-on-surface-variant/60">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="glass-panel rounded-2xl border border-primary/5 p-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-headline-md text-headline-md text-primary">Secret Inventory</h2>
              <p className="font-body-md text-on-surface-variant/70">
                All secrets are encrypted at rest with Vault-KMS
              </p>
            </div>
            <button className="rounded-xl bg-primary px-6 py-2.5 font-label-md text-label-md text-on-primary transition-all hover:brightness-110">
              Add Secret
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-outline-variant/10">
                <tr className="font-label-sm uppercase tracking-wider text-on-surface-variant/70">
                  <th className="pb-4">Secret Name</th>
                  <th className="pb-4">Type</th>
                  <th className="pb-4">Scope</th>
                  <th className="pb-4">Last Rotated</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {vaultEntries.map((entry) => (
                  <tr key={entry.name} className="transition-colors hover:bg-primary/5">
                    <td className="py-5 font-body-md font-semibold text-on-surface">{entry.name}</td>
                    <td className="py-5 font-label-sm text-on-surface-variant">{entry.type}</td>
                    <td className="py-5 font-code-sm text-primary">{entry.scope}</td>
                    <td className="py-5 font-body-md text-on-surface-variant/80">{entry.lastRotated}</td>
                    <td className="py-5">
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase ${entry.statusClass}`}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-5 text-right">
                      <button className="font-label-sm font-bold text-primary hover:underline">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel mt-stack-lg rounded-2xl border border-primary-fixed/20 p-8">
          <h3 className="mb-4 flex items-center gap-2 font-headline-md text-headline-md text-primary">
            <MaterialIcon name="lock" className="text-secondary" />
            Access Policy
          </h3>
          <p className="font-body-md leading-relaxed text-on-surface-variant/80">
            Vault access requires MFA and is audited every 15 minutes. Critical secrets require
            dual approval from Security Architect and Platform Lead roles.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
