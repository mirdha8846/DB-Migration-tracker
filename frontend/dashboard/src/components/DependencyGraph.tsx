"use client";

import type { GraphEdge, GraphNode } from "@/types";

type Props = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export function DependencyGraph({ nodes, edges }: Props) {
  return (
    <div className="glass-card flex h-[480px] items-center justify-center p-6">
      <p className="text-sm text-on-surface/60">
        D3 force graph placeholder — {nodes.length} nodes, {edges.length} edges
      </p>
    </div>
  );
}
