"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { setToken } from "@/lib/auth";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      setToken(data.token);
      router.push("/dashboard");
    } catch {
      setError("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="glass-card w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex items-center gap-3">
          <MaterialIcon name="shield" className="text-primary" size={32} />
          <span className="font-headline-md text-headline-md font-bold text-primary">SchemaGuard</span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-primary">Create account</h1>
        <p className="mt-2 font-body-md text-on-surface-variant/70">
          Start monitoring your schema migrations
        </p>
        <form onSubmit={handleRegister} className="mt-8 space-y-4">
          {error && (
            <p className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</p>
          )}
          <input
            className="w-full rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 font-body-md focus:border-primary/30 focus:outline-none"
            placeholder="Full Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
            {loading ? "Creating account..." : "Create Account"}
          </button>
          <p className="text-center font-label-sm text-on-surface-variant/60">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
