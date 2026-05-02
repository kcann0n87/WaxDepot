import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · WaxDepot",
  description:
    "How WaxDepot collects, uses, and protects your data. What we share with Stripe, Supabase, Resend, and how to request deletion.",
};

const LAST_UPDATED = "May 1, 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-amber-400/80 uppercase">
        Legal
      </p>
      <h1 className="font-display mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-white/50">Last updated: {LAST_UPDATED}</p>

      <div className="prose prose-invert mt-8 max-w-none space-y-6 text-[15px] leading-relaxed text-white/80">
        <Section n="1" title="Who we are">
          <p>
            WaxDepot LLC, a Wyoming limited liability company (&quot;
            <strong>WaxDepot</strong>,&quot; &quot;<strong>we</strong>,&quot;
            &quot;<strong>us</strong>&quot;) operates the marketplace at{" "}
            <Link href="/" className="text-amber-300 hover:underline">
              waxdepot.io
            </Link>
            . This policy explains what personal data we collect about you,
            what we do with it, and your rights to control it.
          </p>
        </Section>

        <Section n="2" title="What we collect">
          <p>We collect three categories of data:</p>
          <h3 className="mt-4 font-display text-base font-bold text-white">
            Account data (you provide)
          </h3>
          <ul className="list-disc space-y-1 pl-6">
            <li>Email address, display name, password (hashed by Supabase Auth — we never see plaintext)</li>
            <li>Optional bio, location, avatar color</li>
          </ul>
          <h3 className="mt-4 font-display text-base font-bold text-white">
            Marketplace data (you create)
          </h3>
          <ul className="list-disc space-y-1 pl-6">
            <li>Listings you create, bids you place, orders you place or fulfill</li>
            <li>Shipping addresses for orders, tracking numbers</li>
            <li>Reviews you write, messages you send to other users, dispute filings</li>
            <li>Watchlist, follows, recently-viewed products, saved searches</li>
          </ul>
          <h3 className="mt-4 font-display text-base font-bold text-white">
            Technical data (we observe)
          </h3>
          <ul className="list-disc space-y-1 pl-6">
            <li>IP address, browser, OS, device type</li>
            <li>Pages visited, click events, time on page (via product analytics)</li>
            <li>Cookies for authentication session and CSRF protection</li>
          </ul>
          <p className="mt-3">
            <strong>What we don&apos;t collect:</strong> we do not see or store your
            full Social Security Number, full bank account number, or full credit-card
            number. Identity verification (KYC) and payment instruments are handled
            entirely by Stripe — we receive only a yes/no on whether your account
            is verified.
          </p>
        </Section>

        <Section n="3" title="How we use your data">
          <ul className="list-disc space-y-1.5 pl-6">
            <li>To run the marketplace — process orders, hold escrow, ship packages, resolve disputes</li>
            <li>To verify your identity through Stripe before allowing payouts</li>
            <li>To send transactional email about your activity (orders shipped, funds released, disputes opened)</li>
            <li>To prevent fraud, abuse, and Terms violations (shill bidding, resealed product, off-platform fee evasion)</li>
            <li>To improve the Service — understand which products are popular, where users drop off, what to fix next</li>
            <li>To comply with legal obligations (tax reporting, court orders, sanctions screening)</li>
          </ul>
          <p>
            <strong>We do not sell or rent your personal data</strong> to advertisers,
            data brokers, or any other third party. We do not run third-party ad
            networks on the Service.
          </p>
        </Section>

        <Section n="4" title="Who we share data with">
          <p>
            We share the minimum data necessary with these third-party
            processors, each of whom has signed a Data Processing Agreement:
          </p>
          <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-left text-[11px] font-semibold tracking-wider text-white/60 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Service</th>
                  <th className="px-4 py-2.5">Purpose</th>
                  <th className="px-4 py-2.5">Data shared</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <Row
                  service="Stripe"
                  purpose="Payment processing, payouts, KYC, tax forms"
                  data="Email, name, address, DOB, SSN last 4 (sellers only), bank/card details (you enter directly into Stripe)"
                />
                <Row
                  service="Supabase"
                  purpose="Database, authentication, file storage"
                  data="All account + marketplace data; password is bcrypt-hashed"
                />
                <Row
                  service="Resend"
                  purpose="Transactional email (orders, shipping, disputes)"
                  data="Your email address + message content"
                />
                <Row
                  service="Vercel"
                  purpose="Application hosting, edge network, logs"
                  data="Request logs (IP, URL, user agent), error reports"
                />
                <Row
                  service="EasyPost"
                  purpose="Carrier tracking on shipped orders"
                  data="Tracking number, carrier, order ID (no buyer-identifying info beyond shipping address)"
                />
                <Row
                  service="PostHog"
                  purpose="Product analytics — see what's working"
                  data="Page views, click events, anonymized user ID"
                />
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            We may also disclose your data when required by law (subpoena,
            court order), to enforce these Terms, to investigate fraud, or in
            connection with a sale of substantially all of WaxDepot&apos;s
            assets.
          </p>
        </Section>

        <Section n="5" title="Cookies and tracking">
          <p>We use a small number of cookies:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Essential</strong> — authentication session, CSRF token,
              cart state. Without these the site doesn&apos;t work; no consent
              banner needed under most laws.
            </li>
            <li>
              <strong>Analytics</strong> — PostHog / Vercel Analytics tracking
              cookie. Anonymous-by-default, no cross-site tracking.
            </li>
          </ul>
          <p>
            We do not use third-party advertising cookies, retargeting pixels,
            or social-network share trackers.
          </p>
        </Section>

        <Section n="6" title="How long we keep your data">
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Active accounts:</strong> for as long as the account
              exists.
            </li>
            <li>
              <strong>Closed accounts:</strong> profile is anonymized within
              30 days; transaction history (orders, payouts, sales) is retained
              for at least 7 years to satisfy IRS, marketplace facilitator,
              and Stripe record-keeping requirements.
            </li>
            <li>
              <strong>Server logs:</strong> retained for 90 days for security
              and abuse investigation, then deleted.
            </li>
            <li>
              <strong>Stripe-held data:</strong> governed by{" "}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener"
                className="text-amber-300 hover:underline"
              >
                Stripe&apos;s privacy policy
              </a>
              . We can&apos;t delete data stored on Stripe&apos;s side; you can
              request deletion directly with Stripe.
            </li>
          </ul>
        </Section>

        <Section n="7" title="Your rights">
          <p>You can:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Access</strong> — see most of your data right now in{" "}
              <Link
                href="/account"
                className="text-amber-300 hover:underline"
              >
                your account
              </Link>
              . For a full export, email{" "}
              <a
                href="mailto:privacy@waxdepot.io"
                className="text-amber-300 hover:underline"
              >
                privacy@waxdepot.io
              </a>
              .
            </li>
            <li>
              <strong>Correct</strong> — update your profile in account
              settings.
            </li>
            <li>
              <strong>Delete</strong> — close your account from settings, or
              email <code>privacy@waxdepot.io</code>. Note that financial
              records are retained for 7 years per the schedule above.
            </li>
            <li>
              <strong>Object / restrict</strong> — opt out of analytics by
              enabling Do Not Track in your browser. Email us to opt out of
              non-transactional email.
            </li>
            <li>
              <strong>Portability</strong> — request a JSON export of your
              data, no charge, within 30 days.
            </li>
          </ul>
          <p>
            <strong>California residents (CCPA/CPRA):</strong> you have the
            additional rights of non-discrimination for exercising the above,
            and the right to opt out of any data sale (we don&apos;t sell, but
            this disclosure is required). Submit requests via{" "}
            <code>privacy@waxdepot.io</code>.
          </p>
          <p>
            <strong>EU/UK residents (GDPR):</strong> our lawful basis for
            processing is (a) <em>contract</em> for marketplace operations,
            (b) <em>legitimate interest</em> for fraud prevention and product
            improvement, (c) <em>legal obligation</em> for tax and KYC, and
            (d) <em>consent</em> for non-essential analytics. You may withdraw
            consent at any time.
          </p>
        </Section>

        <Section n="8" title="Security">
          <p>
            We protect your data with encryption in transit (TLS 1.3),
            encryption at rest (AES-256 via Supabase), bcrypt password
            hashing, and least-privilege database access (row-level security).
            Stripe is PCI-DSS Level 1 certified for payment data.
          </p>
          <p>
            No system is perfectly secure. If we detect a breach affecting
            your data, we&apos;ll notify you within 72 hours of confirmation
            via email and (if material) a banner on the Service.
          </p>
        </Section>

        <Section n="9" title="Children">
          <p>
            The Service is not intended for users under 18 and we do not
            knowingly collect data from minors. If you believe a minor has
            created an account, email <code>privacy@waxdepot.io</code> and
            we&apos;ll delete it.
          </p>
        </Section>

        <Section n="10" title="International transfers">
          <p>
            We are based in the United States. Our processors (Stripe,
            Supabase, Resend, Vercel) primarily store data in the US.
            EU/UK data transferred to the US relies on the EU-US Data
            Privacy Framework certifications maintained by these providers,
            plus Standard Contractual Clauses where applicable.
          </p>
        </Section>

        <Section n="11" title="Changes to this Policy">
          <p>
            We&apos;ll notify you of material changes by email and/or a
            banner at least 14 days before they take effect. The &quot;Last
            updated&quot; date at the top of this page reflects the most
            recent revision.
          </p>
        </Section>

        <Section n="12" title="Contact">
          <p>
            Privacy questions:{" "}
            <a
              href="mailto:privacy@waxdepot.io"
              className="text-amber-300 hover:underline"
            >
              privacy@waxdepot.io
            </a>
            <br />
            General support:{" "}
            <Link
              href="/help/contact"
              className="text-amber-300 hover:underline"
            >
              help center
            </Link>
            <br />
            Mailing address: WaxDepot LLC, [registered agent address],
            Sheridan, WY
          </p>
        </Section>

        <hr className="border-white/10" />

        <p className="rounded-md border border-amber-700/30 bg-amber-500/[0.04] px-4 py-3 text-xs text-amber-100/80">
          <strong className="text-amber-300">Heads up — draft for review:</strong>{" "}
          This Privacy Policy is a starting template drafted from the actual
          mechanics of the Service. Have it reviewed by a privacy-licensed
          attorney before relying on it for GDPR / CCPA compliance, or before
          launching in any jurisdiction with state-specific privacy laws
          (CA, CO, CT, UT, VA, TX as of 2026). Stand up the{" "}
          <code>privacy@waxdepot.io</code> mailbox and confirm the registered
          agent mailing address before launch.
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

function Row({
  service,
  purpose,
  data,
}: {
  service: string;
  purpose: string;
  data: string;
}) {
  return (
    <tr className="text-xs">
      <td className="px-4 py-2.5 font-semibold text-white">{service}</td>
      <td className="px-4 py-2.5 text-white/70">{purpose}</td>
      <td className="px-4 py-2.5 text-white/60">{data}</td>
    </tr>
  );
}
