-- Stripe Connect: seller account state on profiles.
alter table profiles add column if not exists stripe_account_id text;
alter table profiles add column if not exists stripe_charges_enabled boolean not null default false;
alter table profiles add column if not exists stripe_payouts_enabled boolean not null default false;
alter table profiles add column if not exists stripe_details_submitted boolean not null default false;
create index if not exists profiles_stripe_account_idx on profiles (stripe_account_id) where stripe_account_id is not null;

-- Order-side: PaymentIntent + Transfer references for reconciliation.
alter table orders add column if not exists stripe_payment_intent_id text;
alter table orders add column if not exists stripe_charge_id text;
alter table orders add column if not exists stripe_transfer_id text;
alter table orders add column if not exists payment_status text;
-- payment_status values we'll set: 'pending' | 'paid' | 'refunded' | 'failed'
create index if not exists orders_stripe_pi_idx on orders (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
