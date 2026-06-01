"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/auth";
import { MaterialIcon } from "@/components/ui/MaterialIcon";

export default function LoginPage() {
  const router = useRouter();

  const handleContinue = () => {
    setToken("demo-jwt-token");
    router.push("/dashboard");
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
        <div className="mt-8 space-y-4">
          <input
            className="w-full rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 font-body-md focus:border-primary/30 focus:outline-none"
            placeholder="Email"
            type="email"
          />
          <input
            className="w-full rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 font-body-md focus:border-primary/30 focus:outline-none"
            placeholder="Password"
            type="password"
          />
          <button
            type="button"
            onClick={handleContinue}
            className="block w-full rounded-xl bg-primary py-3 text-center font-label-md text-label-md text-on-primary transition-all hover:brightness-110"
          >
            Continue to Dashboard
          </button>
          <p className="text-center font-label-sm text-on-surface-variant/60">
            No account?{" "}
            <Link href="/register" className="font-bold text-primary hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
