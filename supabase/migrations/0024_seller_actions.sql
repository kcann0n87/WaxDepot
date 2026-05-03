-- 0024_seller_actions.sql
-- Two new tracking columns for seller-initiated order actions:
--
--   canceled_by:           who initiated the cancel ('buyer' | 'seller' |
--                          'admin'). Used by the tier-recompute cron
--                          to gate tier promotions on seller cancel
--                          count (>2 in 30d blocks tier-up).
--
--   partial_refund_cents:  running total of seller-initiated partial
--                          refunds against this order. Subtracted from
--                          the eventual seller transfer at release time.
--
-- Both nullable / default-zero so existing orders behave unchanged.

alter table orders add column if not exists canceled_by text
  check (canceled_by is null or canceled_by in ('buyer', 'seller', 'admin'));

alter table orders add column if not exists partial_refund_cents int
  not null default 0
  check (partial_refund_cents >= 0);

-- Indexed for the recompute-tiers cron's "seller cancels in last 30d" query.
create index if not exists orders_canceled_by_seller_idx
  on orders (seller_id, canceled_at)
  where canceled_by = 'seller';
