import Link from "next/link";
import { Suspense } from "react";
import { ShieldCheck, TrendingUp, Zap } from "lucide-react";
import { LogoMark } from "@/components/logo-mark";
import { WaitlistForm } from "./waitlist-form";

export default function ComingSoonPage() {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#0a0a0b] px-4 pt-8 pb-12">
      {/* Atmospheric gold glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-30%] left-1/2 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.22),transparent_55%)]" />
        <div className="absolute right-[-20%] bottom-[-30%] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.10),transparent_60%)]" />
        {/* Subtle radial-noise vignette via gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      </div>

      {/* Top bar — logo only */}
      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between">
        <Link href="/coming-soon" className="inline-flex items-center gap-2.5">
          <LogoMark size={36} />
          <span className="font-display text-xl font-black tracking-tight text-white">
            Wax<span className="text-amber-400">Depot</span>
          </span>
        </Link>
        <Link
          href="/login"
          className="hidden text-sm font-semibold text-white/50 transition hover:text-amber-300 sm:inline"
        >
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center py-16 text-center">
        {/* Live status chip */}
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-amber-700/40 bg-amber-500/10 px-3.5 py-1.5 text-[10px] font-bold tracking-[0.28em] text-amber-300 uppercase backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
          </span>
          Beta · Spring 2026
        </div>

        {/* Headline — the part you can't miss */}
        <h1 className="font-display text-[64px] leading-[0.95] font-black tracking-tighter text-white sm:text-[88px] md:text-[112px]">
          Coming
          <br />
          <span className="bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 bg-clip-text italic text-transparent">
            soon.
          </span>
        </h1>

        {/* Sub-tagline */}
        <p className="mx-auto mt-6 max-w-xl text-base text-white/60 sm:text-lg">
          WaxDepot is the marketplace for serious sealed sports-card collectors.
          Real bid/ask. Real escrow. No eBay tax.
        </p>

        {/* Primary CTA — waitlist */}
        <div className="mt-10 w-full max-w-md">
          <Suspense fallback={null}>
            <WaitlistForm />
          </Suspense>
        </div>
      </main>

      {/* Footer band — what we're building (sneak peek) */}
      <section className="relative mx-auto w-full max-w-4xl">
        <div className="mb-3 text-center">
          <div className="text-[10px] font-semibold tracking-[0.28em] text-white/60 uppercase">
            What we&apos;re building
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Pillar
            icon={<TrendingUp size={16} />}
            title="Real orderbook"
            body="Live bid/ask on every sealed box · 90-day price history."
          />
          <Pillar
            icon={<ShieldCheck size={16} />}
            title="Buyer protection"
            body="Payments held in escrow until your box arrives sealed."
          />
          <Pillar
            icon={<Zap size={16} />}
            title="Flat seller fees"
            body="10/8/6% by tier. No buyer fees. No hidden processing."
          />
        </div>
      </section>

      {/* Bottom strip */}
      <footer className="relative mx-auto mt-12 flex w-full max-w-4xl flex-col items-center gap-4 border-t border-white/5 pt-6 sm:flex-row sm:justify-between">
        <div className="text-[11px] text-white/50">
          © {new Date().getFullYear()} WaxDepot · waxdepot.io
        </div>
        <div className="flex items-center gap-5 text-[11px] font-semibold tracking-[0.18em] text-white/50 uppercase">
          <SocialLink href="https://x.com/waxdepot" label="X" />
          <SocialLink href="https://instagram.com/waxdepot" label="IG" />
          <SocialLink href="https://tiktok.com/@waxdepot" label="TikTok" />
          <SocialLink href="https://youtube.com/@waxdepot" label="YouTube" />
        </div>
      </footer>
    </div>
  );
}

function Pillar({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur">
      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
        {icon}
      </div>
      <div className="text-sm font-bold text-white">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-white/50">{body}</div>
    </div>
  );
}

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="transition hover:text-amber-300"
    >
      {label}
    </a>
  );
}
