"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { GraphNode, ProjectGraphResponse } from "@/types";

type Props = {
  projectId: string;
};

type NodeDetails = {
  id: string;
  title: string;
  type: string;
  risk: "Critical" | "High" | "Medium" | "Low";
  icon: string;
  iconContainerClass: string;
  iconClass: string;
};

function riskToLabel(risk: string): NodeDetails["risk"] {
  if (risk === "CRITICAL") return "Critical";
  if (risk === "HIGH") return "High";
  if (risk === "MEDIUM") return "Medium";
  return "Low";
}

function getRiskStyles(risk: NodeDetails["risk"]) {
  if (risk === "Critical") {
    return { width: "100%", bar: "bg-error", text: "text-error" };
  }
  if (risk === "High") {
    return { width: "75%", bar: "bg-secondary", text: "text-secondary" };
  }
  return { width: "25%", bar: "bg-secondary/40", text: "text-secondary font-bold opacity-60" };
}

function visualNode(node: GraphNode, idx: number) {
  const isTable = node.type === "table";
  const isCritical = node.riskLevel === "CRITICAL";
  return {
    id: node.id,
    title: node.label,
    top: `${node.y ?? 30 + idx * 8}%`,
    left: `${node.x ?? 20 + idx * 10}%`,
    size: isTable ? ("lg" as const) : ("md" as const),
    kind: node.type,
    risk: riskToLabel(node.riskLevel ?? "LOW"),
    delay: `-${idx + 1}s`,
    icon: isTable ? "table_chart" : "hub",
    innerClass: isTable
      ? isCritical
        ? "bg-error-container"
        : "bg-secondary-container"
      : "bg-primary-container",
    borderClass: isTable
      ? isCritical
        ? "border-error/40 group-hover:border-error"
        : "border-secondary/20 group-hover:border-secondary"
      : "border-primary/20 group-hover:border-primary",
    badge: isCritical ? ("pulse" as const) : isTable ? ("dot" as const) : undefined,
  };
}

export function DependencyGraphPageContent({ projectId }: Props) {
  const [graph, setGraph] = useState<ProjectGraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<NodeDetails | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<ProjectGraphResponse>(`/api/projects/${projectId}/graph`);
        setGraph(res.data);
      } catch {
        /* empty */
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const openNode = (node: GraphNode) => {
    const isTable = node.type === "table";
    setSelected({
      id: node.id,
      title: node.label,
      type: isTable ? "Database Table" : "Service",
      risk: riskToLabel(node.riskLevel ?? "LOW"),
      icon: isTable ? "table_chart" : "hub",
      iconContainerClass: isTable ? "bg-secondary-container" : "bg-surface-container-highest",
      iconClass: isTable ? "text-secondary" : "text-primary",
    });
    setSidebarOpen(true);
  };

  const riskStyles = selected ? getRiskStyles(selected.risk) : null;
  const nodes = graph?.nodes.map((n, i) => visualNode(n, i)) ?? [];

  if (loading) {
    return (
      <DashboardShell
        variant="graph"
        active="schema-security"
        mainClassName="ml-64 mt-16 min-h-screen flex items-center justify-center"
      >
        <p className="text-on-surface-variant">Loading dependency graph...</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      variant="graph"
      active="schema-security"
      mainClassName="canvas-entrance relative ml-64 h-[calc(100vh-4rem)] overflow-hidden pt-16"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(#4B2C20 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="glass-panel inner-glow pointer-events-none absolute left-6 top-4 z-10 flex items-center gap-2 rounded-full px-4 py-2">
        <MaterialIcon name="info" className="text-tertiary" size={16} />
        <span className="font-label-sm text-label-sm text-on-surface">
          Click nodes to inspect dependencies. Drag to explore.
        </span>
      </div>

      <div className="relative h-full w-full" id="dependency-canvas">
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-30">
          {graph?.edges.map((edge) => {
            const source = graph.nodes.find((n) => n.id === edge.source);
            const target = graph.nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;
            return (
              <line
                key={`${edge.source}-${edge.target}`}
                stroke="#32170D"
                strokeDasharray={edge.type === "dashed" ? "4" : undefined}
                strokeWidth="2"
                x1={`${source.x ?? 40}%`}
                x2={`${target.x ?? 55}%`}
                y1={`${source.y ?? 35}%`}
                y2={`${target.y ?? 50}%`}
              />
            );
          })}
        </svg>

        {nodes.map((node) => {
          const outer =
            node.size === "lg" ? "h-20 w-20" : node.size === "md" ? "h-16 w-16" : "h-14 w-14";
          const inner =
            node.size === "lg" ? "h-14 w-14" : node.size === "md" ? "h-10 w-10" : "h-8 w-8";
          const iconSize = node.size === "lg" ? 32 : node.size === "md" ? 24 : 20;

          return (
            <button
              key={node.id}
              type="button"
              className="group absolute cursor-pointer animate-floating text-left"
              style={{ top: node.top, left: node.left, animationDelay: node.delay }}
              onClick={() => openNode(graph!.nodes.find(n => n.id === node.id)!)}
            >
              <div
                className={cn(
                  "glass-modal inner-glow flex items-center justify-center rounded-full border-2 transition-all group-hover:scale-110",
                  outer,
                  node.borderClass,
                )}
              >
                <div
                  className={cn(
                    "relative flex items-center justify-center rounded-full",
                    inner,
                    node.innerClass,
                  )}
                >
                  <MaterialIcon
                    name={node.icon}
                    className={
                      node.kind === "table" && node.risk === "Critical"
                        ? "text-error"
                        : node.kind === "table"
                          ? "text-secondary"
                          : "text-primary-fixed"
                    }
                    size={iconSize}
                  />
                  {node.badge === "dot" && (
                    <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-secondary shadow-[0_0_8px_rgba(59,105,52,0.4)]" />
                  )}
                  {node.badge === "pulse" && (
                    <span className="absolute right-1 top-1 h-3 w-3 animate-pulse rounded-full bg-error shadow-[0_0_10px_rgba(186,26,26,0.6)]" />
                  )}
                </div>
              </div>
              <p
                className={cn(
                  "mt-2 whitespace-nowrap text-center font-label-sm text-label-sm",
                  "font-semibold text-on-surface",
                )}
              >
                {node.title}
              </p>
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "glass-panel absolute right-0 top-0 z-20 flex h-full w-96 flex-col border-l border-outline-variant/30 shadow-2xl transition-transform duration-500 ease-in-out",
          sidebarOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-outline-variant/30 p-6">
          <h2 className="font-headline-lg text-[24px] font-bold text-primary">Node Details</h2>
          <button type="button" onClick={() => setSidebarOpen(false)}>
            <MaterialIcon name="close" className="text-on-surface-variant transition-colors hover:text-primary" />
          </button>
        </div>

        {selected && riskStyles && (
          <>
            <div className="flex-1 space-y-8 overflow-y-auto p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-xl p-3 shadow-sm", selected.iconContainerClass)}>
                    <MaterialIcon name={selected.icon} className={selected.iconClass} />
                  </div>
                  <div>
                    <h3 className="font-headline-lg text-[20px] font-bold text-on-surface">
                      {selected.title}
                    </h3>
                    <span className="rounded bg-surface-variant/50 px-2 py-0.5 font-label-sm text-[10px] uppercase tracking-widest text-on-surface-variant">
                      {selected.type}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
                  Migration Risk Level
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-variant/50">
                    <div
                      className={cn("h-full", riskStyles.bar)}
                      style={{ width: riskStyles.width }}
                    />
                  </div>
                  <span className={cn("font-label-sm text-label-sm font-bold", riskStyles.text)}>
                    {selected.risk.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            <div className="border-t border-outline-variant/30 bg-surface-container-low/50 p-6">
              <button className="w-full rounded-lg bg-primary py-4 font-label-sm text-label-sm text-on-primary shadow-lg transition-all hover:opacity-90 active:scale-[0.98]">
                View Full Impact Report
              </button>
            </div>
          </>
        )}
      </div>

      <div className="absolute bottom-8 right-8 z-10 flex flex-col gap-2">
        {["add", "remove", "filter_center_focus"].map((icon, i) => (
          <button
            key={icon}
            type="button"
            className={cn(
              "glass-panel inner-glow flex h-12 w-12 items-center justify-center rounded-xl text-on-surface-variant shadow-lg transition-all hover:text-primary",
              i === 2 && "mt-2",
            )}
          >
            <MaterialIcon name={icon} />
          </button>
        ))}
      </div>

      <div className="glass-panel inner-glow absolute bottom-8 left-8 z-10 flex items-center gap-6 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary" />
          <span className="font-label-sm text-label-sm text-on-surface">Service</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full border border-secondary bg-secondary-container" />
          <span className="font-label-sm text-label-sm text-on-surface">Table</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-error" />
          <span className="font-label-sm text-label-sm text-on-surface">Critical Risk</span>
        </div>
      </div>
    </DashboardShell>
  );
}
