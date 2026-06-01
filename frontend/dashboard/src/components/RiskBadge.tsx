import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types";

const riskStyles: Record<RiskLevel, string> = {
  CRITICAL: "bg-critical/10 text-critical border-critical/30",
  HIGH: "bg-amber-risk/10 text-amber-risk border-amber-risk/30",
  MEDIUM: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  LOW: "bg-forest/10 text-forest border-forest/30",
};

type Props = {
  level: RiskLevel;
  className?: string;
};

export function RiskBadge({ level, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs uppercase",
        riskStyles[level],
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
      {level}
    </span>
  );
}
