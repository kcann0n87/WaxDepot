-- 0015_apex_tier.sql
-- Adds 'Apex' to the seller_tier CHECK constraint introduced in 0006.
-- The 4-tier ladder is now Starter (12%) → Pro (10%) → Elite (8%) → Apex (6%).
-- See src/lib/fees.ts for the qualification thresholds.

alter table profiles drop constraint if exists profiles_seller_tier_check;

alter table profiles
  add constraint profiles_seller_tier_check
  check (seller_tier in ('Starter', 'Pro', 'Elite', 'Apex'));
