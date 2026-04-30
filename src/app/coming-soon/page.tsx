import Link from "next/link";
import { Suspense } from "react";
import { ShieldCheck, TrendingUp, Zap } from "lucide-react";
import { WaitlistForm } from "./waitlist-form";

export default function ComingSoonPage() {
  return (
    <div className="relative isolate flex min-h-[calc(100vh-180px)] items-center justify-center overflow-hidden px-4 py-16">
      {/* Atmospheric gold glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(212,175,55,0.18),transparent_55%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_120%,rgba(212,175,55,0.08),transparent_50%)]" />

      <div className="relative w-full max-w-2xl">
        <div className="mb-3 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-700/40 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold tracking-[0.25em] text-amber-300 uppercase">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
            </span>
            Launching soon
          </span>
        </div>

        <div className="text-center">
          <Link href="/" className="mb-8 inline-flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 font-black text-slate-900 shadow-2xl shadow-amber-500/30">
              <span className="text-2xl">W</span>
            </div>
            <span className="font-display text-3xl font-black tracking-tight text-white">
              Wax<span className="text-amber-400">Depot</span>
            </span>
          </Link>
        </div>

        <h1 className="font-display text-center text-4xl leading-tight font-black tracking-tight text-white sm:text-5xl md:text-6xl">
          The marketplace for{" "}
          <span className="italic text-amber-400">serious collectors</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-center text-base text-white/60 sm:text-lg">
          Buy and sell sealed sports card boxes with the transparency of a stock market.
          Real bid/ask, real escrow, real provenance — without the eBay tax.
        </p>

        <div className="mt-10 flex justify-center">
          <Suspense fallback={null}>
            <WaitlistForm />
          </Suspense>
        </div>

        <div className="mx-auto mt-12 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
          <Pillar
            icon={<TrendingUp size={16} />}
            title="Real orderbook"
            body="Bid/ask on every product, 90-day price history."
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

        <div className="mt-14 flex flex-col items-center gap-2 text-center">
          <div className="text-[10px] font-semibold tracking-[0.25em] text-white/40 uppercase">
            Already invited?
          </div>
          <Link
            href="/login"
            className="text-sm font-semibold text-amber-300 transition hover:text-amber-200"
          >
            Sign in →
          </Link>
        </div>

        <div className="mt-10 flex justify-center gap-5 text-xs text-white/30">
          <SocialLink href="https://x.com/waxdepot" label="X" />
          <SocialLink href="https://instagram.com/waxdepot" label="Instagram" />
          <SocialLink href="https://tiktok.com/@waxdepot" label="TikTok" />
          <SocialLink href="https://youtube.com/@waxdepot" label="YouTube" />
        </div>

        <div className="mt-6 text-center text-[11px] text-white/25">
          © {new Date().getFullYear()} WaxDepot
        </div>
      </div>
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
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center backdrop-blur">
      <div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300">
        {icon}
      </div>
      <div className="text-xs font-bold text-white">{title}</div>
      <div className="mt-0.5 text-[11px] leading-relaxed text-white/50">{body}</div>
    </div>
  );
}

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold tracking-wider uppercase transition hover:text-amber-300"
    >
      {label}
    </a>
  );
}
