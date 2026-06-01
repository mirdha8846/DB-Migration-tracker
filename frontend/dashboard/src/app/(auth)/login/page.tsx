"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { setToken } from "@/lib/auth";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@schemaguard.io");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      setToken(data.token);
      router.push("/dashboard");
    } catch {
      setError("Cannot connect to server");
    } finally {
      setLoading(false);
    }

    return undefined;
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-card w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex items-center gap-3">
          <MaterialIcon name="shield" className="text-primary" size={32} />
          <span className="font-headline-md text-headline-md font-bold text-primary">SchemaGuard</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-primary">Sign in</h1>
        <p className="mt-2 font-body-md text-on-surface-variant/70">
          Access your migration risk dashboard
        </p>
        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          {error && (
            <p className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
          )}
          <input
            className="w-full rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 font-body-md focus:border-primary/30 focus:outline-none"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 font-body-md focus:border-primary/30 focus:outline-none"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="block w-full rounded-xl bg-primary py-3 text-center font-label-md text-label-md text-on-primary transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Continue to Dashboard"}
          </button>
          <p className="text-center font-label-sm text-on-surface-variant/60">
            No account?{" "}
            <Link href="/register" className="font-bold text-primary hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
