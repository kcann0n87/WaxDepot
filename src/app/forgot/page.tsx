import Link from "next/link";
import { Suspense } from "react";
import { LogoMark } from "@/components/logo-mark";
import { ForgotForm } from "./forgot-form";

export default function ForgotPage() {
  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-180px)] max-w-md items-center justify-center px-4 py-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-20%,rgba(212,175,55,0.12),transparent_50%)]" />
      <div className="w-full">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <LogoMark size={40} className="drop-shadow-[0_8px_24px_rgba(212,175,55,0.25)]" />
            <span className="font-display text-xl font-black tracking-tight text-white">
              Wax<span className="text-amber-400">Depot</span>
            </span>
          </Link>
          <h1 className="font-display mt-6 text-3xl font-black tracking-tight text-white">
            Forgot password?
          </h1>
          <p className="mt-1 text-sm text-white/50">
            We&apos;ll email you a link to set a new one.
          </p>
        </div>

        <Suspense fallback={null}>
          <ForgotForm />
        </Suspense>

        <div className="mt-6 text-center text-xs text-white/40">
          Remember it after all?{" "}
          <Link href="/login" className="font-semibold text-amber-300 transition hover:text-amber-200">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
