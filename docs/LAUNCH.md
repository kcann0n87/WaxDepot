# Launch runbook

The single doc to read on the day you flip WaxDepot from invite-only beta
to public. Everything below is what got built during beta and what needs
to flip / be verified for go-live.

## TL;DR — go-live checklist

- [ ] **Toggle off beta gate**: set `NEXT_PUBLIC_BETA_MODE=false` in Vercel,
      redeploy. Middleware stops redirecting to `/coming-soon`; robots /
      sitemap flip back to full marketplace coverage automatically.
- [ ] **Re-enable public sign-up**: edit `src/middleware.ts`, add
      `"/signup"` back to `ALWAYS_PUBLIC_PREFIXES`. Comment in the file
      tells you which two lines.
- [ ] **Restore the homepage CTAs**: pick one — re-add the "Sign up for
      the beta" path on `/coming-soon`, OR replace the page with a real
      marketing landing. The page's `WaitlistForm` component + `joinWaitlist`
      action are kept as dead code in case you want a soft-launch
      waitlist before fully opening.
- [ ] **Verify all 5 Supabase email templates pasted**: see "Email" below.
- [ ] **Verify Stripe Connect webhooks land**: see "Stripe" below.
- [ ] **Apply pending migrations**: `0027` through `0037` — each is
      idempotent so re-runs are safe.
- [ ] **Sanity-check by sending yourself an invite**: from `/admin/invite`
      and walk the email → magic link → /account flow end-to-end.

## Environment

Required env vars (Vercel project settings):

| Var | Purpose | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client-side reads | |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only — RLS bypass for admin actions, cron jobs, webhook handlers | NEVER expose client-side |
| `NEXT_PUBLIC_SITE_URL` | outbound link host in emails (`https://waxdepot.io`) | falls back to waxdepot.io if unset; `siteUrl()` helper centralizes this |
| `NEXT_PUBLIC_BETA_MODE` | gate toggle. Default `true`; set `false` to launch | |
| `STRIPE_SECRET_KEY` | server Stripe SDK | |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client Stripe.js | |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification | platform endpoint |
| `STRIPE_WEBHOOK_SECRET_2` | second webhook secret (Connect events) | optional but recommended — see "Stripe" |
| `RESEND_API_KEY` | transactional emails | |
| `RESEND_FROM_ADDRESS` | "from" address (e.g. `WaxDepot <hello@waxdepot.io>`) | optional, defaults work |
| `EASYPOST_API_KEY` | shipment tracking | |
| `EASYPOST_WEBHOOK_SECRET` | EasyPost webhook signature verification | |
| `CRON_SECRET` | bearer token Vercel Cron sends; we verify before running cron handlers | |

## Beta gate — what flipping it actually does

`NEXT_PUBLIC_BETA_MODE` is read by **3 files** that branch behavior:

- `src/middleware.ts` — when on, redirects anon visitors to `/coming-soon`.
- `src/app/robots.ts` — when on, returns `Allow: /coming-soon, Disallow: /`.
- `src/app/sitemap.ts` — when on, returns just `/coming-soon`. When off,
  returns the full marketplace + per-product entries.

Setting it to `false` flips all three at once. **Redeploy required** —
robots/sitemap are static metadata routes, env changes need a new build.

## Stripe

### Connect

- Platform Connect mode: **Standard or Express**. Codebase uses Express
  (see `startSellerOnboarding` in `src/app/actions/stripe-connect.ts`).
- Required capabilities on connected accounts: `card_payments`, `transfers`.
  Both auto-requested on account create.
- Once a seller's `account.charges_enabled` flips true, the webhook
  handler also flips `profiles.is_seller = true` so they show up in
  the admin "sellers" filter.

### Webhooks (set up two endpoints in Stripe pointing at the same URL)

URL: `https://waxdepot.io/api/stripe/webhook`

1. **Platform account events**: `checkout.session.completed`,
   `payment_intent.payment_failed`, `charge.refunded`,
   `transfer.created`. Secret → `STRIPE_WEBHOOK_SECRET`.
2. **Connected and v2 accounts**: `account.updated`. Secret →
   `STRIPE_WEBHOOK_SECRET_2`.

The handler tries both secrets when verifying signatures (see top of
`src/app/api/stripe/webhook/route.ts`), so either registration's events
work.

### Test E2E before launch

- Buy a $1 listing with a Stripe test card (4242 4242 4242 4242).
- Confirm the order moves Charged → InEscrow.
- Verify both buyer and seller get the "Payment received" email.
- Mark shipped, verify shipping email.
- Confirm delivery → verify funds-released email + Stripe transfer
  hits the seller's connected account dashboard.

## Email

Five Supabase Auth templates need to be pasted from
`supabase/email-templates/`:

| Supabase tab | File | Subject |
|---|---|---|
| Confirm signup | `confirmation.html` | Confirm your WaxDepot email |
| **Invite user** | `invite.html` | **You're in — welcome to WaxDepot** |
| Reset password | `recovery.html` | Reset your WaxDepot password |
| Magic link | `magic-link.html` | Your WaxDepot sign-in link |
| Change email address | `email-change.html` | Confirm your new WaxDepot email |

Plus configure custom SMTP (Resend) per `supabase/email-templates/README.md`
so emails come from `auth@waxdepot.io` instead of Supabase's default
sender.

The **Invite** template is the only one strictly required for invite-only
beta — the others apply once public sign-up opens.

### Transactional emails (Resend, not Supabase)

These fire from server actions and webhooks via `src/lib/email.ts`. All
configured via `RESEND_API_KEY` + verified Resend domain on `waxdepot.io`.

| Email | Fires from | Triggered when |
|---|---|---|
| `emailBidPlaced` | `bids.ts → createBid` | Buyer places a bid |
| `emailBidAccepted` | `orders.ts → acceptBid` | Seller accepts |
| `emailBidDeclined` | `orders.ts → declineBid` | Seller declines |
| `emailPaymentReceived` (×2) | Stripe webhook `checkout.session.completed` | Buyer pays — both buyer and seller emailed |
| `emailOrderShipped` | `orders.ts → markShipped` | Seller adds tracking |
| `emailFundsReleased` | `orders.ts → releaseOrderToSeller` | Auto-release or buyer-confirm fires Stripe transfer |
| `emailDisputeOpened` | `disputes.ts → submitDispute` | Buyer opens dispute |
| `emailOrderCanceled` | `orders.ts → cancelOrder` | Either party cancels |

In-app `notifications` table fires alongside each — see `notification_type`
enum (12 values incl. `bid-placed`, `bid-declined`, `bid-accepted`,
`order-shipped`, `order-delivered`, `order-canceled`, `payout-sent`,
`new-listing`, `new-message`, `price-drop`, `outbid`).

## Cron jobs

Configured in `vercel.json` (5 entries):

| Path | Schedule | Purpose |
|---|---|---|
| `/api/cron/auto-release` | daily 12:00 UTC | flip Delivered → Released after 2-day buyer-confirmation window |
| `/api/cron/saved-searches` | daily 14:00 UTC | digest matches per saved search; in-app + optional email |
| `/api/cron/watchlist-alerts` | daily 15:00 UTC | price-drop notifications on watched products |
| `/api/cron/recompute-tiers` | daily 06:00 UTC | seller tier promotions (12% → 6% as 30-day sales/GMV/positive% trigger thresholds) |
| `/api/cron/expire-bids` | hourly | flip bids past `expires_at` to Expired |

All gated by `Authorization: Bearer ${CRON_SECRET}`.

## Migrations to run

Apply in order. Each is idempotent so re-runs are safe:

```
0027 .. 0034   — catalog expansion + corrections (NHL, Soccer, Pokemon, weekly drops)
0035           — adds 'bid-declined' / 'order-canceled' to notification_type enum
0036           — backfills profiles.is_seller for accounts past Stripe Connect
0037           — Topps Chrome Platinum BB + Signature Class FB (May 2026 drops)
```

Plus the cleanup SQL block delivered in chat (UEFA slug rename, image binds
for the 13 verified migration-0034 product photos, Premier League → Soccer
renames). See [docs/CATALOG-UPDATES.md](CATALOG-UPDATES.md) for the
ongoing-add workflow.

## Admin tools shipped during beta

- `/admin` overview — KPI tiles incl. Waitlist · Pending / Invites · 7d /
  Activated rate, plus stale-escrow alert and recent admin-actions feed
- `/admin/invite` — single-user magic-link invite + recent-invites table
- `/admin/waitlist` — bulk-invite (up to 25 pending in one click), per-row
  invite, Pending → Invited → Activated state tracking
- `/admin/feedback` — set-request queue with **one-click "Approve + create
  SKU"** action (creates as `is_published=false`, notifies requester)
- `/admin/users` / `/admin/orders` / `/admin/disputes` / `/admin/listings` —
  standard moderation surfaces
- `/admin/audit` — every destructive admin action logged in `admin_actions`

## Public-facing user flow (post-launch)

Once `NEXT_PUBLIC_BETA_MODE=false`:

1. Anon visits `/` → sees full marketplace
2. Click product → product page with bid/ask order book
3. Click Buy or Bid → if not signed in, → `/login` (signup also reachable)
4. Sign up via `/signup` (now publicly accessible) → confirmation email
5. Confirm → `/welcome` → `/account` (existing welcome card adapts to
   first-time state)
6. To sell: `/sell` → routed through `/sell/payouts` for Stripe Connect
   on first visit, then back to `/sell` to list

## What's NOT shipped (worth knowing)

- **Notification preferences** — users can't opt out of specific
  email types. All-or-nothing today (the `notifications.unread` and
  `mark all read` flows handle the in-app side, but transactional emails
  always send).
- **Buyer dispute auto-escalation** — disputes go pending → admin
  resolves manually. No auto-timeout escalation.
- **Mobile app** — web only. Mobile web is mobile-audited (admin tables
  scroll, account dashboard cards stack, /coming-soon is clean) but the
  site is not a PWA.
- **Multi-currency** — USD only. Stripe Checkout would need additional
  configuration for non-USD payments; payouts are US-bank only via
  Connect Express.
- **Search ranking sophistication** — current sort options: popularity
  (sales-derived), price ascending, recently listed, alphabetical. No
  personalized recommendations.

## Day-of-launch monitoring

- **Stripe webhook deliveries** — Stripe Dashboard → Developers → Webhooks.
  Watch for failures (5xx) on the first hour after launch when traffic
  spikes.
- **Resend email logs** — Resend Dashboard → Logs. If "domain not
  verified" errors appear, the sender domain in `RESEND_FROM_ADDRESS`
  isn't on the verified Resend domain.
- **Vercel function logs** — `/api/stripe/webhook` and `/api/easypost/webhook`
  errors page someone (set up Vercel alerts).
- **Supabase auth logs** — Auth tab → Logs. Catches SMTP delivery errors
  on the Supabase-side templates (signup confirm, magic link, etc.).
- **`/admin` overview** — refresh every 30 min for the first day to
  watch GMV land + activation rate.

## If something is on fire

| Symptom | First thing to check |
|---|---|
| Buyers report "I paid but no order" | Stripe webhook deliveries to `/api/stripe/webhook` — check signature secret matches |
| Sellers report "no payout" | Connected account `charges_enabled` + `payouts_enabled` in `profiles`; Stripe Connect dashboard for the seller |
| Inviting a user errors "already exists" | Account exists in Supabase Auth — they should sign in instead via `/login` |
| Bell icon stays empty after lifecycle event | Check the `notification_type` value in the insert matches the enum (we caught two crons using invalid types in beta) |
| Robots.txt still gating after launch | `NEXT_PUBLIC_BETA_MODE` env var didn't flip — needs redeploy after change |
| Magic link in invite email goes 404 | `redirectTo` in `adminInviteUser` uses `NEXT_PUBLIC_SITE_URL` — verify it's set correctly |

## Roll-back plan

If something is broken post-launch:

1. **Re-enable beta gate**: set `NEXT_PUBLIC_BETA_MODE=true` and redeploy.
   Anon traffic re-routes to `/coming-soon`, public sign-up blocks again.
   Existing invitees still work.
2. **Pause Stripe webhooks** in Stripe Dashboard if there's a bug
   processing them. Pending events queue and re-deliver after unpause.
3. **Disable a specific cron** by removing it from `vercel.json` and
   redeploying. The cron page handler returns 401 on its own without
   `CRON_SECRET`, but Vercel still calls it.
