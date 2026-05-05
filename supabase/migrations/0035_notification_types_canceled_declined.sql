-- 0035_notification_types_canceled_declined.sql
-- Adds 'bid-declined' and 'order-canceled' to the notification_type enum
-- so cancellation/decline notifications can stop borrowing the wrong type
-- tags ('outbid', 'order-shipped'). Also unblocks the new emailBidDeclined
-- and emailOrderCanceled helpers.
--
-- Postgres requires ALTER TYPE ADD VALUE outside an explicit transaction.
-- Supabase migrations run each file in its own transaction by default, so
-- ALTER TYPE is allowed at the top level here. IF NOT EXISTS makes the
-- migration idempotent if the values are added by hand first.

alter type notification_type add value if not exists 'bid-declined';
alter type notification_type add value if not exists 'order-canceled';
