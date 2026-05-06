-- 0038_notification_prefs.sql
-- Adds a JSONB notification_prefs column on profiles so users can opt
-- out of specific email categories. The settings UI at /account/settings
-- already had toggles for "Order updates / Messages / Push / Marketing"
-- but they were local-only state — they didn't persist or gate sends.
--
-- Default '{}'::jsonb. The runtime helper (lib/email-prefs.ts) treats a
-- missing key as opted-IN, so existing accounts continue receiving all
-- emails until they explicitly opt out. Categories:
--
--   order_emails    — payment received, shipped, funds released,
--                     order canceled, dispute opened (LIFECYCLE — recommend
--                     leave on; opt-out warns you may miss timing-critical
--                     events like the auto-release window)
--   bid_emails      — bid placed/accepted/declined notifications
--   message_emails  — direct-message arrivals (future — no sends yet)
--   digest_emails   — saved-search match digests, watchlist price drops
--   marketing_emails — newsletters, drops, promotions (future)
--
-- Idempotent — DO NOTHING on re-run.

alter table profiles
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;
