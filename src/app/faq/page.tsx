import Link from "next/link";
import { ChevronRight, HelpCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ · WaxDepot",
  description:
    "Common questions about WaxDepot — how escrow works, fees, shipping rules, dispute process, payouts, and what makes us different from eBay.",
};

type QA = { q: string; a: string | React.ReactNode };
type Section = { title: string; questions: QA[] };

const SECTIONS: Section[] = [
  {
    title: "Buying",
    questions: [
      {
        q: "How do I buy a box?",
        a: "Pick a product, click Buy now, and pay with any card (Apple Pay, Google Pay, and Cash App work in supported browsers). Your payment is held in escrow at Stripe. The seller gets paid only after the box arrives sealed and you confirm — or 2 days after the carrier marks it delivered, whichever comes first.",
      },
      {
        q: "How are bids different from buying?",
        a: "Bids are an offer to buy below the lowest ask. If a seller accepts your bid, your card is charged automatically and an order is created. You can set how long the bid stays active (1-30 days). If the lowest ask drops to or below your bid, you buy instantly.",
      },
      {
        q: "What if my box arrives resealed or tampered with?",
        a: (
          <>
            Open a dispute within 3 days of delivery. We&apos;ll review evidence
            (photos of the wrap, packaging, and the box itself; an unboxing
            video helps) and refund you in full from escrow if the claim
            checks out. Read{" "}
            <Link
              href="/help/buying/buyer-protection"
              className="text-amber-300 hover:underline"
            >
              Buyer Protection
            </Link>{" "}
            for the full process.
          </>
        ),
      },
      {
        q: "Are there buyer fees?",
        a: "No buyer fees. You pay the listed price plus shipping plus any applicable sales tax. The seller covers WaxDepot's 6-12% commission (by their tier) out of their proceeds.",
      },
      {
        q: "Is sales tax collected?",
        a: "We collect and remit sales tax in states where we've crossed marketplace facilitator nexus thresholds. In states where we haven't, no sales tax appears at checkout — you may owe use tax to your state, which is your responsibility.",
      },
    ],
  },
  {
    title: "Box types & sealed cases",
    questions: [
      {
        q: "What's a sealed case?",
        a: (
          <>
            A <strong>sealed case</strong> is a manufacturer&apos;s factory-sealed
            outer carton containing N units of the same single-box variant —
            never opened, never repackaged. A Hobby Case typically holds 12
            hobby boxes; a Mega Case holds ~6 mega boxes; a Blaster Case holds
            ~20 blasters; a Pokemon Booster Box Case holds ~6 booster boxes.
            Each is its own SKU with its own market price (a sealed case
            usually trades at a slight discount per unit vs. buying N
            individual boxes — buyers pay a premium for guaranteed sealed
            provenance from the case-fresh layer).
          </>
        ),
      },
      {
        q: "What's the difference between Hobby, Mega, Blaster, and Hanger?",
        a: (
          <>
            All four are configurations of the same release, with different
            content and distribution:
            <ul className="mt-2 list-disc space-y-1 pl-5 text-white/80">
              <li>
                <strong className="text-white">Hobby Box</strong> — premium
                content (autos, hits, full parallel runs) sold through hobby
                shops + LCS only. The hobby flagship.
              </li>
              <li>
                <strong className="text-white">Jumbo / Hobby Jumbo (HTA)</strong> —
                hobby box with more packs + more hits per box. Limited
                distribution.
              </li>
              <li>
                <strong className="text-white">Mega Box</strong> — retail-channel
                box (Target/Walmart) with reduced content but exclusive
                retail-only parallels.
              </li>
              <li>
                <strong className="text-white">Blaster / Hanger</strong> —
                small-format retail boxes with the lowest hit ratios. Different
                pack counts (Blaster ~6 packs, Hanger ~30 cards loose). Both
                often have exclusive parallels.
              </li>
            </ul>
          </>
        ),
      },
      {
        q: "What's FOTL and First Day Issue?",
        a: (
          <>
            Both are early-print premium variants:
            <ul className="mt-2 list-disc space-y-1 pl-5 text-white/80">
              <li>
                <strong className="text-white">FOTL (First Off The Line)</strong> —
                Panini&apos;s pre-release dutch-auction edition with exclusive
                parallels. Most common on Prizm.
              </li>
              <li>
                <strong className="text-white">First Day Issue (FDI)</strong> —
                Topps&apos; equivalent. Adds 1 bonus FDI autograph + 2 numbered
                FDI parallels per box. Most common on Topps Chrome.
              </li>
            </ul>
            They&apos;re different SKUs with their own markets — the FDI/FOTL
            chase cards are typically worth more than the same card pulled from
            a regular hobby box.
          </>
        ),
      },
      {
        q: "What about Pokemon Booster Boxes and Elite Trainer Boxes?",
        a: (
          <>
            Pokemon TCG sealed product breaks down into:
            <ul className="mt-2 list-disc space-y-1 pl-5 text-white/80">
              <li>
                <strong className="text-white">Booster Box</strong> — 36 sealed
                booster packs. The hobby-grade product for box-breakers.
              </li>
              <li>
                <strong className="text-white">Elite Trainer Box (ETB)</strong> —
                8-9 packs plus accessories (sleeves, dividers, dice, code cards).
                Popular with collectors who keep the storage box.
              </li>
              <li>
                <strong className="text-white">Booster Box Case</strong> — sealed
                case of ~6 booster boxes. The case-fresh chase for high-volume
                breakers.
              </li>
            </ul>
          </>
        ),
      },
    ],
  },
  {
    title: "Selling",
    questions: [
      {
        q: "What can I list?",
        a: "Factory-sealed sports trading card products in original manufacturer packaging — Hobby Box, Jumbo Box, Mega Box, Blaster Box, Hanger Box, FOTL/FDI Hobby Box, sealed cases of any of the above, plus Pokemon Booster Boxes and Elite Trainer Boxes. No singles, no breaks, no graded slabs, no opened or resealed product.",
      },
      {
        q: "How do I get paid?",
        a: "We use Stripe Connect Express for payouts. Set up your account at /sell/payouts — Stripe handles ID verification, bank linking, tax forms, and 1099-K reporting. Once a sale releases from escrow, the funds (sale price minus your tier fee) transfer directly to your bank.",
      },
      {
        q: "What's the fee structure?",
        a: (
          <>
            Four-tier ladder: <strong>12%</strong> (Starter, default), <strong>10%</strong>{" "}
            (Pro at 30+ sales OR $5k GMV/30d), <strong>8%</strong> (Elite at 150+ sales
            OR $10k GMV), <strong>6%</strong> (Apex at 1,000+ sales OR $100k GMV).
            All require positive-feedback floors. Once you hit a tier the benefits
            stay locked through the end of the next calendar month — re-qualifying
            extends. No listing fees, no monthly fees, no payment processing surcharge —
            we absorb Stripe&apos;s 2.9% + $0.30 internally.{" "}
            <Link href="/sell/tiers" className="text-amber-300 hover:underline">
              See full tier breakdown →
            </Link>
          </>
        ),
      },
      {
        q: "How fast do I have to ship?",
        a: "Within 2 business days of order placement. Items priced at $500+ require signature confirmation; items priced at $1,000+ require signature confirmation AND insurance for the full sale value. Use any tracked carrier (USPS, UPS, FedEx) — drop the tracking number into your seller dashboard.",
      },
      {
        q: "Can I list pre-orders?",
        a: "Yes, if you can ship within 30 days of the manufacturer's public release date. Pre-order listings must be marked as such (the catalog auto-handles this for upcoming releases).",
      },
    ],
  },
  {
    title: "Escrow & disputes",
    questions: [
      {
        q: "When does the seller actually get paid?",
        a: "When the buyer confirms the box arrived sealed, OR 2 days after the carrier marks the package delivered, whichever comes first. The 2-day auto-release prevents sellers from waiting forever for a buyer who's gone silent.",
      },
      {
        q: "What disputes are eligible for refund?",
        a: "Resealed wrap, wrong product, counterfeit, contents tampered with, or never delivered (carrier never scanned). Buyer remorse, change of mind, or 'I expected better hits' are not eligible — sealed wax is sealed wax, you're paying for the chance, not the result.",
      },
      {
        q: "What happens if there's a chargeback?",
        a: "We aggressively defend chargebacks on legitimate sales using carrier tracking + signature confirmation as evidence. If the dispute happened within our normal window, the buyer should have used the dispute process; chargebacks attempting to bypass it are likely to be reversed.",
      },
    ],
  },
  {
    title: "Account & privacy",
    questions: [
      {
        q: "Do I need to be verified to buy?",
        a: "No. Buyers just need an email + payment method.",
      },
      {
        q: "Do I need to be verified to sell?",
        a: "Yes. All sellers complete Stripe Connect identity verification (KYC) — name, address, DOB, last 4 of SSN, bank account. Stripe runs the verification; we just gate the listing form on the result.",
      },
      {
        q: "Can I delete my account?",
        a: (
          <>
            Yes. Account settings has a delete button, or email{" "}
            <a
              href="mailto:privacy@waxdepot.io"
              className="text-amber-300 hover:underline"
            >
              privacy@waxdepot.io
            </a>
            . Note that financial records are retained for 7 years to satisfy
            IRS and Stripe record-keeping requirements — full details in our{" "}
            <Link
              href="/privacy"
              className="text-amber-300 hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </>
        ),
      },
      {
        q: "Do you sell my data?",
        a: "No. We don't sell or rent your data, and we don't run third-party ad networks.",
      },
    ],
  },
];

// Build a Schema.org FAQPage from the SECTIONS where the answer is a plain
// string. Google can render these as rich FAQ results in search ("People
// also ask"-style accordions on the SERP). Skips JSX-bodied answers since
// those would need to be flattened to a single string and that loses links.
const faqSchemaEntries = SECTIONS.flatMap((s) =>
  s.questions
    .filter((qa) => typeof qa.a === "string")
    .map((qa) => ({
      "@type": "Question",
      name: qa.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: qa.a as string,
      },
    })),
);
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqSchemaEntries,
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-300">
          <HelpCircle size={22} />
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
            FAQ
          </p>
          <h1 className="font-display text-3xl font-black tracking-tight text-white">
            Frequently asked
          </h1>
        </div>
      </div>
      <p className="mt-3 text-sm text-white/60">
        Quick answers to the most common questions. Need more detail? Browse
        the full{" "}
        <Link
          href="/help"
          className="text-amber-300 hover:underline"
        >
          help center
        </Link>{" "}
        or{" "}
        <Link
          href="/help/contact"
          className="text-amber-300 hover:underline"
        >
          contact support
        </Link>
        .
      </p>

      {SECTIONS.map((section) => (
        <section key={section.title} className="mt-10">
          <h2 className="font-display text-xl font-black tracking-tight text-white">
            {section.title}
          </h2>
          <div className="mt-4 divide-y divide-white/5 rounded-xl border border-white/10 bg-[#101012]">
            {section.questions.map((qa, i) => (
              <details key={i} className="group">
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-white transition hover:bg-white/[0.02]">
                  {qa.q}
                  <ChevronRight
                    size={14}
                    className="shrink-0 text-white/40 transition group-open:rotate-90"
                  />
                </summary>
                <div className="px-5 pb-5 text-sm leading-relaxed text-white/70">
                  {qa.a}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}

      <div className="mt-12 rounded-xl border border-white/10 bg-white/[0.02] p-5 text-sm text-white/70">
        Didn&apos;t find what you needed?{" "}
        <Link
          href="/help/contact"
          className="font-semibold text-amber-300 hover:underline"
        >
          Contact support →
        </Link>
      </div>
    </div>
  );
}
