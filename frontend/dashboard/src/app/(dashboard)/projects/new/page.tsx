"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { MaterialIcon } from "@/components/ui/MaterialIcon";
import { api } from "@/lib/api";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [dbType, setDbType] = useState("postgres");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/projects", { name: name.trim(), dbType });
      router.push(`/projects/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create project");
    }
    setLoading(false);
  };

  return (
    <DashboardShell
      variant="detail"
      active="schema-security"
      pageTitle="New Project"
      pageSubtitle="Create"
      mainClassName="ml-64 mt-16 min-h-screen p-margin-desktop"
    >
      <div className="mx-auto max-w-2xl">
        <h1 className="font-headline-lg text-headline-lg text-primary mb-2">Create New Project</h1>
        <p className="font-body-md text-on-surface-variant/80 mb-8">
          Register a database project to monitor schema changes and migration risks.
        </p>

        <div className="glass-panel rounded-2xl p-8 space-y-6">
          {error && <p className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</p>}

          <label className="block">
            <span className="mb-2 block font-label-sm uppercase tracking-wider text-on-surface-variant">Project Name</span>
            <input
              placeholder="e.g. production-v2, payments-db"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 font-body-md placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block font-label-sm uppercase tracking-wider text-on-surface-variant">Database Type</span>
            <select
              value={dbType}
              onChange={(e) => setDbType(e.target.value)}
              className="w-full rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 font-body-md focus:border-primary focus:outline-none"
            >
              <option value="postgres">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="mssql">SQL Server</option>
            </select>
          </label>

          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="w-full rounded-xl bg-primary py-3 font-label-md text-label-md text-on-primary transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Project"}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
