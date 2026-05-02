# Custom auth emails — send from waxdepot.io instead of Supabase

By default Supabase sends auth emails (signup verification, password reset, magic link, email change) from `noreply@mail.app.supabase.io`. To send them from your own domain with WaxDepot branding:

## What you need

- A verified Resend domain for `waxdepot.io` (you already have this — Resend sends your transactional order emails)
- A Resend API key with "Sending access" permission
- A sender address you want to send from. Recommended: `auth@waxdepot.io` or reuse `orders@waxdepot.io`

## Step 1 — set up Custom SMTP in Supabase

1. Open the Supabase dashboard → your WaxDepot project → **Authentication** in the left nav → **Emails** tab → **SMTP Settings**
2. Toggle **Enable Custom SMTP** on
3. Fill in:
   - **Sender email**: `auth@waxdepot.io` (or your chosen address)
   - **Sender name**: `WaxDepot`
   - **Host**: `smtp.resend.com`
   - **Port number**: `465` (SSL — recommended) or `587` (STARTTLS)
   - **Username**: `resend`
   - **Password**: your Resend API key (the same one you use for `RESEND_API_KEY`)
4. Click **Save**

## Step 2 — paste the branded templates

Still in the dashboard → **Authentication → Emails → Email Templates**. Each tab is one template. Replace the default markup with the matching file from this directory:

| Supabase tab | Template file |
|---|---|
| Confirm signup | `confirmation.html` |
| Reset password | `recovery.html` |
| Magic link | `magic-link.html` |
| Change email address | `email-change.html` |

Subject lines you can use:
- Confirm signup: `Confirm your WaxDepot email`
- Reset password: `Reset your WaxDepot password`
- Magic link: `Your WaxDepot sign-in link`
- Change email: `Confirm your new WaxDepot email`

Click **Save** on each.

## Step 3 — test

1. Open an incognito window
2. Sign up with a fresh email
3. Check the inbox — the email should come from `auth@waxdepot.io` (or whatever sender you set), with the dark WaxDepot-branded layout

If the email never arrives:

- Check Supabase → **Logs** → **Auth** for SMTP send errors
- Check Resend → **Logs** for delivery attempts. If you see `Forbidden: domain not verified`, your sender address isn't on a verified Resend domain
- If you see no log entries at all, the SMTP credentials are wrong (most likely the password — the API key, NOT the username)

## Variables Supabase substitutes into the templates

The templates use these Supabase auth variables. Don't rename them — they map 1:1 to what the auth service expects:

- `{{ .ConfirmationURL }}` — the magic confirmation link the user clicks
- `{{ .SiteURL }}` — your site origin (configured in Supabase → Auth → URL Configuration)
- `{{ .Email }}` — the user's email address
- `{{ .Token }}` — the bare 6-digit OTP (only needed if you're showing it inline)
- `{{ .TokenHash }}` — the hashed token (rarely needed)

The templates here use `.ConfirmationURL` and `.SiteURL` only.

## Rate limits

Supabase's free tier limits custom SMTP to **2 emails / hour per IP**. Once you upgrade Supabase (Pro tier or above) it lifts to your SMTP provider's limits. Resend's default limit is **10 req/sec** which is plenty.

If you're on Supabase free and seeing rate-limit errors, that's the cap — not a config problem.
