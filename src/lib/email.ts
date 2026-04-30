import "server-only";
import { Resend } from "resend";

/**
 * Transactional email via Resend. Activates when RESEND_API_KEY is set in
 * env vars; otherwise every send is a graceful no-op so dev/preview builds
 * don't fail trying to send mail.
 *
 * Sender domain (FROM) defaults to "WaxDepot <hello@waxdepot.io>". Resend
 * requires the domain to be verified in their dashboard before sends will
 * actually be delivered (otherwise they're silently dropped at the Resend
 * level).
 */

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const DEFAULT_FROM =
  process.env.RESEND_FROM_ADDRESS ?? "WaxDepot <hello@waxdepot.io>";

export const EMAIL_CONFIGURED = !!resend;

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: DEFAULT_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.text ? { text: params.text } : {}),
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    });
  } catch (e) {
    console.error("sendEmail failed:", e);
  }
}

/**
 * Wrap content in the WaxDepot brand template — dark background, gold
 * accent, Playfair-style display headings (the system serif fallback in
 * Outlook/Gmail will still look reasonable). All inline-styled because
 * email clients don't support stylesheets.
 */
function wrapHtml(opts: {
  preheader: string;
  headline: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const { preheader, headline, body, ctaLabel, ctaHref } = opts;
  const cta =
    ctaLabel && ctaHref
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
          <tr>
            <td style="border-radius:8px;background:linear-gradient(90deg,#fbbf24,#f59e0b);">
              <a href="${ctaHref}" style="display:inline-block;padding:14px 24px;color:#0f172a;font-weight:800;font-size:14px;text-decoration:none;letter-spacing:0.02em;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;">
                ${ctaLabel}
              </a>
            </td>
          </tr>
        </table>`
      : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>WaxDepot</title>
</head>
<body style="margin:0;background:#0a0a0b;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#e5e7eb;">
<div style="display:none;font-size:1px;color:#0a0a0b;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0b;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="background:#101012;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:32px 32px 0 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:linear-gradient(135deg,#fcd34d,#d97706);width:36px;height:36px;border-radius:8px;text-align:center;vertical-align:middle;color:#0f172a;font-weight:900;font-size:20px;">W</td>
                <td style="padding-left:10px;color:#fff;font-weight:900;font-size:18px;letter-spacing:-0.01em;">Wax<span style="color:#fbbf24;">Depot</span></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 8px 32px;">
            <h1 style="margin:0;color:#fff;font-size:26px;line-height:1.2;font-weight:900;letter-spacing:-0.02em;font-family:Georgia,serif;">${headline}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 32px 32px;">
            <div style="color:rgba(255,255,255,0.75);font-size:15px;line-height:1.55;">
              ${body}
            </div>
            ${cta}
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px 32px;border-top:1px solid rgba(255,255,255,0.06);">
            <div style="padding-top:24px;color:rgba(255,255,255,0.4);font-size:11px;line-height:1.5;">
              Sent because of activity on your <a href="https://waxdepot.io/account" style="color:#fbbf24;text-decoration:none;">WaxDepot account</a>.
              Adjust which messages you receive in your <a href="https://waxdepot.io/account/settings" style="color:#fbbf24;text-decoration:none;">notification settings</a>.
            </div>
          </td>
        </tr>
      </table>
      <div style="color:rgba(255,255,255,0.3);font-size:11px;padding:16px 0 0;">© ${new Date().getFullYear()} WaxDepot · waxdepot.io</div>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/* === Specific transactional emails === */

export async function emailBidPlaced(params: {
  to: string;
  productTitle: string;
  amountDollars: number;
  expiresInDays: number;
  productHref: string;
}): Promise<void> {
  const { to, productTitle, amountDollars, expiresInDays, productHref } = params;
  await sendEmail({
    to,
    subject: `Bid placed — $${amountDollars.toFixed(0)} on ${productTitle}`,
    html: wrapHtml({
      preheader: `Your $${amountDollars.toFixed(0)} bid is live for ${expiresInDays} days.`,
      headline: "Your bid is live",
      body: `
        <p>You placed a bid of <strong style="color:#fbbf24;">$${amountDollars.toFixed(2)}</strong> on <strong style="color:#fff;">${productTitle}</strong>.</p>
        <p>It's active for the next <strong>${expiresInDays} day${expiresInDays === 1 ? "" : "s"}</strong>. If a seller accepts, we'll email you a Pay Now link to complete checkout.</p>
      `,
      ctaLabel: "View product",
      ctaHref: productHref,
    }),
  });
}

export async function emailBidAccepted(params: {
  to: string;
  productTitle: string;
  amountDollars: number;
  orderHref: string;
}): Promise<void> {
  const { to, productTitle, amountDollars, orderHref } = params;
  await sendEmail({
    to,
    subject: `Bid accepted — complete payment`,
    html: wrapHtml({
      preheader: `Pay $${amountDollars.toFixed(0)} to lock the order.`,
      headline: "Your bid was accepted",
      body: `
        <p>The seller accepted your <strong style="color:#fbbf24;">$${amountDollars.toFixed(2)}</strong> bid on <strong style="color:#fff;">${productTitle}</strong>.</p>
        <p>Pay now to lock the order. Stripe Checkout takes 30 seconds and your payment goes into escrow until the box arrives sealed.</p>
      `,
      ctaLabel: `Pay $${amountDollars.toFixed(0)} now`,
      ctaHref: orderHref,
    }),
  });
}

export async function emailPaymentReceived(params: {
  to: string;
  role: "buyer" | "seller";
  productTitle: string;
  amountDollars: number;
  orderHref: string;
}): Promise<void> {
  const { to, role, productTitle, amountDollars, orderHref } = params;
  if (role === "buyer") {
    await sendEmail({
      to,
      subject: `Payment received — order in escrow`,
      html: wrapHtml({
        preheader: `Your $${amountDollars.toFixed(2)} payment is held until the box arrives sealed.`,
        headline: "Payment received",
        body: `
          <p>We charged <strong style="color:#fff;">$${amountDollars.toFixed(2)}</strong> for <strong>${productTitle}</strong>. Funds are held in escrow on the WaxDepot platform.</p>
          <p>The seller has <strong>2 business days</strong> to ship. You'll get tracking once it's on the way, then another email when it lands.</p>
        `,
        ctaLabel: "View order",
        ctaHref: orderHref,
      }),
    });
  } else {
    await sendEmail({
      to,
      subject: `Payment received — ship the order`,
      html: wrapHtml({
        preheader: `Buyer paid $${amountDollars.toFixed(2)} — ship within 2 business days.`,
        headline: "Payment received — ship now",
        body: `
          <p>The buyer paid <strong style="color:#fbbf24;">$${amountDollars.toFixed(2)}</strong> for <strong>${productTitle}</strong>. Funds are in escrow.</p>
          <p>Ship within <strong>2 business days</strong> and add tracking from the order page. Once delivered, the 2-day auto-release timer fires and funds transfer to your Stripe account.</p>
        `,
        ctaLabel: "View order",
        ctaHref: orderHref,
      }),
    });
  }
}

export async function emailOrderShipped(params: {
  to: string;
  productTitle: string;
  carrier: string;
  tracking: string;
  orderHref: string;
}): Promise<void> {
  const { to, productTitle, carrier, tracking, orderHref } = params;
  await sendEmail({
    to,
    subject: `Your order shipped — ${carrier} ${tracking}`,
    html: wrapHtml({
      preheader: `${carrier} · ${tracking}`,
      headline: "Your order shipped",
      body: `
        <p><strong style="color:#fff;">${productTitle}</strong> is on the way via <strong>${carrier}</strong>.</p>
        <p>Tracking: <strong style="color:#fbbf24;font-family:monospace;">${tracking}</strong></p>
        <p>Once delivered, you have 2 days to confirm or open a dispute before funds auto-release.</p>
      `,
      ctaLabel: "Track shipment",
      ctaHref: orderHref,
    }),
  });
}

export async function emailFundsReleased(params: {
  to: string;
  productTitle: string;
  amountDollars: number;
  orderHref: string;
}): Promise<void> {
  const { to, productTitle, amountDollars, orderHref } = params;
  await sendEmail({
    to,
    subject: `Funds released — $${amountDollars.toFixed(2)}`,
    html: wrapHtml({
      preheader: `$${amountDollars.toFixed(2)} on the way to your bank.`,
      headline: "Funds released",
      body: `
        <p><strong>${productTitle}</strong> · <strong style="color:#fbbf24;">$${amountDollars.toFixed(2)}</strong> moved from escrow to your Stripe account.</p>
        <p>Stripe will send the ACH payout to your linked bank on your tier's cadence.</p>
      `,
      ctaLabel: "View payouts",
      ctaHref: orderHref,
    }),
  });
}

export async function emailDisputeOpened(params: {
  to: string;
  productTitle: string;
  reason: string;
  disputeId: string;
  orderHref: string;
}): Promise<void> {
  const { to, productTitle, reason, disputeId, orderHref } = params;
  await sendEmail({
    to,
    subject: `Dispute opened on your sale (${disputeId})`,
    html: wrapHtml({
      preheader: `Buyer reports: ${reason}. You have 48 hours to respond.`,
      headline: "Dispute opened",
      body: `
        <p>The buyer of <strong>${productTitle}</strong> opened dispute <strong style="color:#fbbf24;font-family:monospace;">${disputeId}</strong>.</p>
        <p>Reason: <strong style="color:#fff;">${reason}</strong></p>
        <p>You have <strong>48 hours</strong> to respond. WaxDepot Support reviews both sides within 3 business days. Funds stay held in escrow throughout.</p>
      `,
      ctaLabel: "Review dispute",
      ctaHref: orderHref,
    }),
  });
}
