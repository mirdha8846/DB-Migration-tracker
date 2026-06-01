import type { ImpactReport as ImpactReportType } from "@/types";
import { RiskBadge } from "./RiskBadge";

type Props = {
  report: ImpactReportType;
};

export function ImpactReport({ report }: Props) {
  return (
    <div className="space-y-6">
      <section className="glass-card p-6">
        <h2 className="font-display text-xl font-semibold">Schema changes</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="font-mono text-xs uppercase text-on-surface/50">
                <th className="pb-2 text-left">Type</th>
                <th className="pb-2 text-left">Table</th>
                <th className="pb-2 text-left">Column</th>
                <th className="pb-2 text-left">Risk</th>
              </tr>
            </thead>
            <tbody>
              {report.changes.map((change, i) => (
                <tr key={i} className="border-t border-surface-tint/10 hover:bg-espresso/5">
                  <td className="py-2">{change.changeType}</td>
                  <td className="py-2 font-mono">{change.table}</td>
                  <td className="py-2 font-mono">{change.column ?? "—"}</td>
                  <td className="py-2">
                    <RiskBadge level={change.risk} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
