import Image from "next/image";
import { RevealOnScroll } from "@/components/effects/RevealOnScroll";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { AVATARS } from "@/lib/constants";

const changes = [
  {
    type: "Add Column",
    object: "metadata",
    target: "orders (table)",
    impact: "Moderate",
    impactClass: "bg-secondary-container text-on-secondary-container border-secondary/20",
  },
  {
    type: "Create Index",
    object: "idx_orders_metadata",
    target: "orders (table)",
    impact: "Low",
    impactClass: "bg-surface-container-high text-on-surface-variant border-outline-variant/20",
  },
  {
    type: "Constraint",
    object: "fk_user_sync",
    target: "users (table)",
    impact: "Critical",
    impactClass: "bg-error/10 text-error border-error/20",
  },
];

const deploySteps = [
  {
    num: "01",
    title: "Database Update",
    desc: "Run SQL migration scripts against 'master' node clusters.",
    highlight: false,
  },
  {
    num: "02",
    title: "API Sync",
    desc: "Deploy schema bindings to OrderService containers.",
    highlight: false,
  },
  {
    num: "03",
    title: "Cache Invalidation",
    desc: "Flush Redis tags matching order_metadata.* glob.",
    highlight: false,
  },
  {
    num: "04",
    title: "Final Verify",
    desc: "Automatic smoke test of JSONB ingestion paths.",
    highlight: true,
  },
];

type Props = {
  migrationId: string;
};

export function MigrationDetailPageContent({ migrationId }: Props) {
  return (
    <>
      <RevealOnScroll />
      <DashboardShell
        variant="detail"
        active="migration-risk"
        migrationId={migrationId}
        mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop"
      >
        <div className="mx-auto max-w-[1440px]">
          <section className="reveal-section mb-stack-lg flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <nav className="mb-2 flex items-center gap-2 text-on-surface-variant/60">
                <span className="cursor-pointer font-label-sm hover:text-primary">Projects</span>
                <MaterialIcon name="chevron_right" className="text-[14px]" />
                <span className="cursor-pointer font-label-sm hover:text-primary">Production-V2</span>
                <MaterialIcon name="chevron_right" className="text-[14px]" />
                <span className="font-label-sm font-bold text-primary">Migrations</span>
              </nav>
              <h1 className="font-display-lg text-4xl tracking-tight text-on-surface">
                Expand &apos;orders&apos; JSONB field
              </h1>
              <p className="mt-1 font-body-md text-on-surface-variant/70">
                Submitted by <span className="font-bold text-tertiary">k_yamamoto</span> • 2 hours ago
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="rounded-xl border border-primary/10 px-6 py-2.5 font-body-md font-bold text-primary transition-all hover:bg-primary/5">
                Reject Migration
              </button>
              <button className="rounded-xl bg-primary px-8 py-2.5 font-body-md font-bold text-on-primary transition-all hover:shadow-xl hover:shadow-primary/20">
                Approve &amp; Deploy
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
            <div className="space-y-gutter lg:col-span-8">
              <div className="glass-panel reveal-section overflow-hidden rounded-2xl border border-primary/5">
                <div className="flex items-center justify-between border-b border-outline-variant/10 bg-surface-container-high/30 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <MaterialIcon name="terminal" className="text-[20px] text-tertiary" />
                    <span className="font-label-sm font-bold text-primary">v1.2.4_expand_orders.sql</span>
                  </div>
                  <button className="group flex items-center gap-2 text-on-surface-variant transition-colors hover:text-primary">
                    <MaterialIcon
                      name="content_copy"
                      className="text-[18px] transition-transform group-hover:scale-110"
                    />
                    <span className="font-label-sm font-bold">Copy</span>
                  </button>
                </div>
                <div className="code-syntax overflow-x-auto p-6 shadow-inner">
                  <pre className="text-sm leading-relaxed">
                    <code className="block py-2">
                      <span className="sql-comment">{`-- MIGRATION: 8842-X
-- TARGET: public.orders
-- RISK: HIGH (Structural Mutation)

`}</span>
                      <span className="sql-keyword">ALTER TABLE</span> public.orders{"\n"}
                      <span className="sql-keyword">ADD COLUMN IF NOT EXISTS</span> metadata jsonb{" "}
                      <span className="sql-keyword">DEFAULT</span> {"'{}'::jsonb"};{"\n\n"}
                      <span className="sql-keyword">CREATE INDEX CONCURRENTLY</span> idx_orders_metadata_type{"\n"}
                      <span className="sql-keyword">ON</span> public.orders{" "}
                      <span className="sql-keyword">USING</span> GIN ((metadata-&gt;
                      <span className="sql-string">&apos;order_type&apos;</span>));{"\n\n"}
                      <span className="sql-comment">-- WARNING: Potential lock-wait on high-volume table</span>
                      {"\n"}
                      <span className="sql-keyword">COMMENT ON COLUMN</span> public.orders.metadata{" "}
                      <span className="sql-keyword">IS</span>{" "}
                      <span className="sql-string">&apos;Extended order details&apos;</span>;
                    </code>
                  </pre>
                </div>
              </div>

              <div className="glass-panel reveal-section rounded-2xl p-8">
                <h2 className="mb-8 flex items-center gap-2 font-headline-lg text-2xl text-primary">
                  <span className="h-6 w-1.5 rounded-full bg-primary" />
                  Detected Changes
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-outline-variant/10 text-on-surface-variant/70">
                      <tr>
                        {["Type", "Object", "Target", "Impact"].map((col, i) => (
                          <th
                            key={col}
                            className={`pb-4 font-label-sm font-bold uppercase tracking-wider ${i === 3 ? "text-right" : ""}`}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                      {changes.map((row) => (
                        <tr key={row.object} className="group transition-colors hover:bg-primary-fixed/20">
                          <td className="py-5 font-body-md font-bold text-on-surface">{row.type}</td>
                          <td className="py-5 font-label-sm text-on-surface-variant">{row.object}</td>
                          <td className="py-5 font-body-md text-primary">{row.target}</td>
                          <td className="py-5 text-right">
                            <span
                              className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${row.impactClass}`}
                            >
                              {row.impact}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-gutter lg:col-span-4">
              <div className="glass-panel-elevated reveal-section flex flex-col items-center rounded-2xl border-t-4 border-t-error p-8 text-center">
                <span className="mb-6 font-label-sm uppercase tracking-widest text-on-surface-variant/60">
                  Risk Assessment
                </span>
                <div className="relative mb-8">
                  <div className="pulse-ring flex h-36 w-36 items-center justify-center rounded-full border-[10px] border-error/10">
                    <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-error/20 bg-error/10">
                      <span className="font-display-lg text-6xl text-error">H</span>
                    </div>
                  </div>
                </div>
                <h3 className="mb-3 font-headline-lg text-2xl text-error">High Risk (Level 4)</h3>
                <p className="mb-8 font-body-md leading-relaxed text-on-surface-variant/80">
                  Concurrent index creation detected on a table with{" "}
                  <span className="font-bold text-primary">5M+ records</span>. Potential for
                  write-lock contention.
                </p>
                <div className="flex w-full justify-between rounded-2xl bg-error px-5 py-4 text-on-error shadow-lg shadow-error/10">
                  <div className="flex items-center gap-2">
                    <MaterialIcon name="warning" className="text-[20px]" />
                    <span className="font-label-sm font-bold">Locking Threat</span>
                  </div>
                  <span className="font-label-sm font-black uppercase">Severe</span>
                </div>
              </div>

              <div className="glass-panel reveal-section relative overflow-hidden rounded-2xl border border-primary-fixed p-8">
                <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary-fixed/20 blur-[60px]" />
                <div className="relative mb-8 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container shadow-lg shadow-primary-container/20">
                    <MaterialIcon name="smart_toy" className="scale-110 material-symbols-filled" />
                  </div>
                  <h3 className="font-headline-lg text-xl text-primary">AI Guardian Insight</h3>
                </div>
                <div className="relative space-y-6">
                  <div className="font-body-md leading-relaxed text-on-surface-variant">
                    <p>
                      I&apos;ve analyzed the{" "}
                      <code className="rounded bg-tertiary-fixed px-1.5 font-bold text-tertiary-container">
                        ALTER TABLE
                      </code>{" "}
                      operation. While the{" "}
                      <code className="rounded bg-tertiary-fixed px-1.5 font-bold text-tertiary-container">
                        CONCURRENTLY
                      </code>{" "}
                      keyword is present, be advised of the following:
                    </p>
                    <ul className="mt-6 space-y-3">
                      <li className="flex gap-3">
                        <MaterialIcon name="check_circle" className="mt-1 text-[18px] text-secondary" />
                        <span>
                          Table <code className="rounded bg-surface-container-high px-1 font-bold">orders</code> is
                          currently experiencing{" "}
                          <span className="font-bold text-primary">1.2k req/sec</span>.
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <MaterialIcon name="check_circle" className="mt-1 text-[18px] text-secondary" />
                        <span>
                          Transaction wraparound protection is active; this migration may extend vacuum
                          duration.
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <MaterialIcon name="info" className="mt-1 text-[18px] text-on-tertiary-container" />
                        <span>
                          <strong>Recommendation:</strong> Schedule during the 02:00 UTC window.
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="border-t border-outline-variant/10 pt-6">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-secondary shadow-sm shadow-secondary/50" />
                      <span className="font-label-sm text-on-surface-variant">
                        Verified by Security Policy 4.2.1
                      </span>
                    </div>
                    <button className="w-full rounded-xl border border-primary/10 bg-surface-container-lowest py-3 font-label-sm font-bold text-primary shadow-sm transition-all hover:bg-primary-fixed/30">
                      Explain Alternative Approach
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass-panel reveal-section overflow-hidden rounded-2xl border border-outline-variant/10">
                <Image
                  alt="Hardware health"
                  className="h-48 w-full object-cover opacity-80 contrast-125 sepia-[.3]"
                  height={192}
                  src={AVATARS.hardware}
                  width={400}
                />
                <div className="border-t border-outline-variant/10 bg-surface-container-low/60 p-4 backdrop-blur-sm">
                  <p className="text-center font-label-sm font-bold uppercase tracking-widest text-primary/60">
                    Live Hardware Health
                  </p>
                </div>
              </div>
            </div>
          </div>

          <section className="reveal-section mt-stack-lg">
            <div className="glass-panel rounded-3xl border border-primary-fixed/20 p-10 shadow-xl shadow-primary/5">
              <h2 className="mb-12 flex items-center gap-3 font-headline-lg text-2xl text-primary">
                <MaterialIcon
                  name="format_list_numbered"
                  className="rounded-lg bg-primary p-1.5 text-lg text-on-primary"
                />
                Service Deployment Order
              </h2>
              <div className="relative grid grid-cols-1 gap-12 md:grid-cols-4">
                <div className="absolute left-[10%] right-[10%] top-12 -z-10 hidden h-px bg-primary-fixed/40 md:block" />
                {deploySteps.map((step) => (
                  <div key={step.num} className="relative flex flex-col gap-6">
                    <span className="select-none font-display-lg text-6xl text-primary/10">{step.num}</span>
                    <div
                      className={
                        step.highlight
                          ? "rounded-2xl bg-primary p-6 text-on-primary shadow-lg shadow-primary/20"
                          : "rounded-2xl border border-primary-fixed bg-surface-container-lowest p-6 shadow-sm"
                      }
                    >
                      <h4
                        className={`mb-2 font-body-md font-black ${step.highlight ? "text-on-primary" : "text-primary"}`}
                      >
                        {step.title}
                      </h4>
                      <p
                        className={`font-label-sm leading-relaxed ${step.highlight ? "text-on-primary/80" : "text-on-surface-variant/80"}`}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </DashboardShell>
    </>
  );
}
