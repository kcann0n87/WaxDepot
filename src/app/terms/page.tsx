import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · WaxDepot",
  description:
    "WaxDepot Terms of Service — marketplace rules for buyers and sellers of sealed sports wax. Escrow protection, dispute process, fees, prohibited conduct.",
};

const LAST_UPDATED = "May 1, 2026";

/**
 * Terms of Service. Drafted from the actual mechanics of the marketplace as
 * built — escrow window, fee tiers, auto-release timing, dispute window,
 * Stripe Connect requirement. Not a substitute for review by a lawyer
 * licensed in your jurisdiction; we strongly recommend such review before
 * relying on this document at scale.
 */
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
        Legal
      </p>
      <h1 className="font-display mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-white/50">Last updated: {LAST_UPDATED}</p>

      <div className="prose prose-invert mt-8 max-w-none space-y-6 text-[15px] leading-relaxed text-white/80">
        <Section n="1" title="Who we are">
          <p>
            WaxDepot LLC, a Wyoming limited liability company (&quot;<strong>WaxDepot</strong>,&quot;
            &quot;<strong>we</strong>,&quot; &quot;<strong>us</strong>&quot;) operates the marketplace at{" "}
            <Link href="/" className="text-amber-300 hover:underline">
              waxdepot.io
            </Link>{" "}
            (the &quot;<strong>Service</strong>&quot;) for the resale of sealed,
            factory-original sports trading card products (&quot;<strong>Wax</strong>&quot;).
            By creating an account, listing a product, or placing an order, you agree
            to these Terms.
          </p>
          <p>
            We are an intermediary marketplace. <strong>We do not own, hold, ship, or
            sell Wax ourselves.</strong> Sales contracts are between the buyer and the
            seller; we facilitate discovery, payment, escrow, and dispute resolution.
          </p>
        </Section>

        <Section n="2" title="Eligibility">
          <p>
            You must be at least 18 years old and legally able to form a contract
            in your jurisdiction. You may use the Service only for lawful purposes.
            One person, one account — duplicate accounts are grounds for termination.
          </p>
        </Section>

        <Section n="3" title="Sellers — payouts and identity verification">
          <p>
            All payouts run through{" "}
            <strong>Stripe Connect Express</strong>. Before listing any product, you
            must complete Stripe&apos;s identity verification (legal name, address,
            date of birth, last 4 of SSN, and bank account or debit card for
            payouts). Stripe — not WaxDepot — performs KYC, OFAC screening, and tax
            reporting (1099-K) for your account.
          </p>
          <p>
            You authorize WaxDepot to instruct Stripe to release escrowed funds to
            your connected account on your behalf, net of WaxDepot&apos;s fees.
            Payouts arrive on your seller-tier&apos;s cadence (Starter: weekly Friday;
            Pro: twice weekly; Elite: every 3 days).
          </p>
        </Section>

        <Section n="4" title="Listings — what you can sell">
          <p>You may list:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Factory-sealed</strong> sports trading card products in
              <strong> original manufacturer packaging</strong>, with all factory
              wrap, cellophane, and seals intact.
            </li>
            <li>
              Hobby Box, Jumbo Box, Mega Box, Blaster Box, Hanger Box, Value Box,
              FotL Hobby Box, and equivalent factory configurations.
            </li>
            <li>
              Pre-orders are permitted if you can ship within 30 days of the
              manufacturer&apos;s public release date. Pre-order listings must be
              marked as such.
            </li>
          </ul>
          <p>You may <strong>not</strong> list:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Resealed, repackaged, opened, or tampered-with product.</strong>
              {" "}This is grounds for immediate, permanent suspension and forfeiture
              of any pending balance.
            </li>
            <li>Single cards, breaks, group buys, or graded slabs.</li>
            <li>
              Counterfeit product or product with altered serial / authentication
              markings.
            </li>
            <li>
              Products you do not have in your physical possession at the time of
              listing (other than properly disclosed pre-orders).
            </li>
            <li>Anything illegal under federal, state, or local law.</li>
          </ul>
          <p>
            By listing, you represent and warrant that the product is in your
            possession (or properly disclosed pre-order), in factory-sealed
            condition, and that you have the right to sell it.
          </p>
        </Section>

        <Section n="5" title="Fees">
          <p>
            WaxDepot charges a flat seller commission per completed sale, deducted
            from the payout. There are no listing fees, monthly fees, or payment
            processing surcharges (we absorb Stripe&apos;s ~2.9% + $0.30 internally).
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Starter</strong> — 10% of item price (default)
            </li>
            <li>
              <strong>Pro</strong> — 8% of item price (≥100 sales last 30d, ≥99%
              positive feedback)
            </li>
            <li>
              <strong>Elite</strong> — 6% of item price (≥500 sales last 30d, ≥99.5%
              positive feedback)
            </li>
          </ul>
          <p>
            Buyers pay no fees beyond the item price, shipping, and any applicable
            taxes shown at checkout.
          </p>
        </Section>

        <Section n="6" title="Buyer Protection — escrow and dispute window">
          <p>
            <strong>Every order is escrowed.</strong> When a buyer pays, the funds
            are held by WaxDepot via Stripe and are not transferred to the seller
            until either (a) the buyer confirms delivery, or (b) <strong>2 days
            after the carrier marks the package delivered</strong>, whichever is
            sooner.
          </p>
          <p>
            <strong>Dispute window:</strong> A buyer may open a dispute within{" "}
            <strong>3 days of delivery</strong> if the box arrives resealed,
            damaged, wrong product, counterfeit, or if the contents have been
            tampered with. WaxDepot will review evidence (photos, packaging
            condition, video of unboxing if provided) and may, at its sole
            discretion, refund the buyer in full from escrow.
          </p>
          <p>
            <strong>Sellers waive the right to chargeback on disputes resolved
            through WaxDepot&apos;s process.</strong> Sellers may appeal a dispute
            outcome via support within 7 days of resolution.
          </p>
        </Section>

        <Section n="7" title="Shipping">
          <p>
            Sellers must ship within <strong>2 business days</strong> of order
            placement using a tracked carrier (USPS, UPS, FedEx). Tracking must
            be entered through the &quot;Mark shipped&quot; flow on the seller&apos;s
            order page.
          </p>
          <p>
            Items priced at $200+ require <strong>signature confirmation</strong>.
            Items priced at $1,000+ require <strong>signature confirmation and
            insurance for the full sale value</strong>. Failure to insure or
            obtain signature is at the seller&apos;s risk and forfeits Buyer
            Protection coverage in their favor.
          </p>
          <p>
            Buyers are responsible for accurate shipping addresses at checkout.
            Reshipment due to a wrong address provided by the buyer is at the
            buyer&apos;s expense.
          </p>
        </Section>

        <Section n="8" title="Bids">
          <p>
            A bid is a binding offer to purchase at the bid price. If a seller
            accepts your bid, your card on file will be charged automatically and
            an escrowed order is created. You may cancel an active bid at any
            time before it&apos;s accepted; you may not retract a bid once accepted.
          </p>
          <p>
            Sellers may not bid on their own listings or on any listing of an
            account they control. Coordinated price manipulation (&quot;<strong>shill
            bidding</strong>&quot;) is grounds for permanent termination.
          </p>
        </Section>

        <Section n="9" title="Prohibited conduct">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>List counterfeit, resealed, or tampered-with product</li>
            <li>Engage in shill bidding or other price manipulation</li>
            <li>Take transactions off-platform to evade fees</li>
            <li>Harass, threaten, or defame other users in messages or reviews</li>
            <li>
              Reverse-engineer, scrape, or attempt to gain unauthorized access to
              the Service
            </li>
            <li>
              Submit false dispute claims, including claiming non-receipt of a
              package the carrier confirmed as delivered to your address
            </li>
            <li>Use the Service to launder funds or violate any law</li>
          </ul>
          <p>
            Violations may result in listing removal, account suspension,
            permanent ban, and forfeiture of any pending balance toward refunds
            of affected buyers.
          </p>
        </Section>

        <Section n="10" title="Taxes">
          <p>
            Sellers are responsible for income tax on their proceeds. Stripe will
            issue you a Form 1099-K when applicable.
          </p>
          <p>
            <strong>Sales tax:</strong> Where required by state marketplace
            facilitator laws, WaxDepot will collect and remit sales tax on
            qualifying transactions. In states where we are not yet required to
            collect, buyers may owe use tax on their purchases — WaxDepot does
            not advise buyers on individual tax obligations.
          </p>
        </Section>

        <Section n="11" title="Termination">
          <p>
            You may close your account at any time via account settings. We may
            suspend or terminate your account for any violation of these Terms,
            for any conduct we believe poses a risk to the Service or other
            users, or for any other reason at our sole discretion.
          </p>
          <p>
            On termination, any pending payouts will be released to you minus
            any amounts owed to WaxDepot or to buyers via dispute resolution.
            Active listings will be removed; in-flight orders will continue
            through their normal lifecycle (ship, deliver, release, or refund).
          </p>
        </Section>

        <Section n="12" title="Disclaimer of warranties">
          <p>
            The Service is provided &quot;<strong>as is</strong>&quot; and &quot;
            <strong>as available</strong>&quot; without warranty of any kind. We do
            not warrant that the Service will be uninterrupted, error-free, or
            secure. Listings are created by sellers, not WaxDepot — we do not
            warrant the accuracy of any listing&apos;s description, photo, or
            availability.
          </p>
        </Section>

        <Section n="13" title="Limitation of liability">
          <p>
            To the maximum extent permitted by law, WaxDepot&apos;s total
            liability to you for any claim arising out of or relating to the
            Service or these Terms is limited to the greater of (a) $100, or
            (b) the total fees you paid WaxDepot in the 12 months preceding
            the claim.
          </p>
          <p>
            We are not liable for indirect, incidental, consequential,
            special, or punitive damages, including lost profits or lost data,
            even if advised of the possibility of such damages.
          </p>
        </Section>

        <Section n="14" title="Indemnification">
          <p>
            You agree to indemnify and hold harmless WaxDepot, its officers,
            employees, and agents from any claim, demand, or damage arising
            from your breach of these Terms, your violation of any law or
            third-party right, or your use of the Service.
          </p>
        </Section>

        <Section n="15" title="Dispute resolution and arbitration">
          <p>
            <strong>You and WaxDepot agree to resolve disputes through binding
            individual arbitration</strong>, not in court, except for small-claims
            actions and claims for injunctive relief related to intellectual
            property. Arbitration will be administered by JAMS under its
            Streamlined Arbitration Rules. Hearings will be conducted{" "}
            <strong>remotely</strong> by default; if either party requests an
            in-person hearing, it will be held in <strong>Sheridan County,
            Wyoming</strong> or another location both parties agree to in
            writing.
          </p>
          <p>
            <strong>Class actions are waived.</strong> You may bring claims only
            on an individual basis. If this class waiver is found unenforceable,
            the entire arbitration agreement is null and void.
          </p>
          <p>
            You may opt out of this arbitration agreement by emailing{" "}
            <a
              href="mailto:legal@waxdepot.io"
              className="text-amber-300 hover:underline"
            >
              legal@waxdepot.io
            </a>{" "}
            within 30 days of accepting these Terms with the subject line
            &quot;Arbitration Opt-Out.&quot;
          </p>
        </Section>

        <Section n="16" title="Governing law">
          <p>
            These Terms are governed by the laws of the{" "}
            <strong>State of Wyoming</strong>, United States, without regard to
            its conflict-of-laws principles. Subject to the arbitration
            agreement above, the state and federal courts located in Sheridan
            County, Wyoming have exclusive jurisdiction over any non-arbitrable
            dispute.
          </p>
        </Section>

        <Section n="17" title="Changes to these Terms">
          <p>
            We may update these Terms from time to time. If we make a material
            change, we&apos;ll notify you by email and/or by posting a notice on
            the Service at least 14 days before the change takes effect.
            Continued use of the Service after the change constitutes acceptance
            of the updated Terms.
          </p>
        </Section>

        <Section n="18" title="Contact">
          <p>
            Questions about these Terms? Email{" "}
            <a
              href="mailto:legal@waxdepot.io"
              className="text-amber-300 hover:underline"
            >
              legal@waxdepot.io
            </a>
            . For order help, use{" "}
            <Link
              href="/help/contact"
              className="text-amber-300 hover:underline"
            >
              support
            </Link>
            .
          </p>
        </Section>

        <hr className="border-white/10" />

        <p className="rounded-md border border-amber-700/30 bg-amber-500/[0.04] px-4 py-3 text-xs text-amber-100/80">
          <strong className="text-amber-300">Heads up — draft for review:</strong>{" "}
          This Terms of Service was drafted from the actual mechanics of the
          marketplace as built and assumes WaxDepot LLC is registered as a
          Wyoming limited liability company. It is a starting template, not
          legal advice. Have it reviewed by an attorney licensed in Wyoming
          (and ideally one familiar with online-marketplace operators) before
          relying on it for arbitration enforceability, marketplace facilitator
          compliance, or any specific dispute. Confirm the{" "}
          <code>legal@waxdepot.io</code> mailbox is set up and monitored before
          launch.
        </p>
      </div>
    </div>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-black tracking-tight text-white">
        <span className="mr-2 text-amber-400/70">{n}.</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
