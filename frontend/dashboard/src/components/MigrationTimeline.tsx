import type { Migration } from "@/types";
import { RiskBadge } from "./RiskBadge";

type Props = {
  migrations: Migration[];
};

export function MigrationTimeline({ migrations }: Props) {
  return (
    <div className="glass-card divide-y divide-surface-tint/10">
      {migrations.map((migration) => (
        <div key={migration.id} className="flex items-center justify-between p-4 hover:bg-espresso/5">
          <div>
            <p className="font-mono text-sm">{migration.filename}</p>
            <p className="text-xs text-on-surface/50">{migration.createdAt}</p>
          </div>
          <RiskBadge level={migration.riskLevel} />
        </div>
      ))}
    </div>
  );
}
