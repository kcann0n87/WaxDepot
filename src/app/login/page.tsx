import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; confirm?: string }>;
}) {
  const { next = "/", confirm } = await searchParams;

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-180px)] max-w-md items-center justify-center px-4 py-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-20%,rgba(212,175,55,0.12),transparent_50%)]" />
      <div className="w-full">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 font-black text-slate-900 shadow-lg shadow-amber-500/20">
              W
            </div>
            <span className="font-display text-xl font-black tracking-tight text-white">
              Wax<span className="text-amber-400">Market</span>
            </span>
          </Link>
          <h1 className="font-display mt-6 text-3xl font-black tracking-tight text-white">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-white/50">
            New here?{" "}
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="font-semibold text-amber-300 transition hover:text-amber-200"
            >
              Create an account
            </Link>
          </p>
        </div>

        {confirm === "1" && (
          <div className="mb-4 rounded-lg border border-emerald-700/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            <strong className="text-emerald-100">Check your email.</strong> We sent a confirmation
            link — click it, then come back here to sign in.
          </div>
        )}

        <Suspense fallback={null}>
          <LoginForm next={next} />
        </Suspense>
      </div>
    </div>
  );
}
