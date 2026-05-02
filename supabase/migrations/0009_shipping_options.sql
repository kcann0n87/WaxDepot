-- 0009_shipping_options.sql
-- Adds multi-tier shipping options per listing (e.g. "Standard $0",
-- "Expedited $10", "Overnight $25"). Buyer picks one at Stripe Checkout.
-- The original `listings.shipping_cents` column stays as a denormalized
-- "lowest shipping price" for display + sorting; the source of truth for
-- what's offered is the new `listing_shipping_options` table.

create table if not exists listing_shipping_options (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings on delete cascade,
  name text not null check (length(name) between 1 and 40),
  shipping_cents int not null check (shipping_cents >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_shipping_options_listing_idx
  on listing_shipping_options (listing_id, sort_order);

-- Backfill: every existing listing gets one "Standard" option using its
-- current shipping_cents.
insert into listing_shipping_options (listing_id, name, shipping_cents, sort_order)
select id, 'Standard', shipping_cents, 0 from listings
where not exists (
  select 1 from listing_shipping_options o where o.listing_id = listings.id
);

-- RLS: public read (matches listings); only the listing's seller can write.
alter table listing_shipping_options enable row level security;

create policy "shipping_options public read"
  on listing_shipping_options for select using (true);

create policy "shipping_options seller write"
  on listing_shipping_options for all using (
    exists (
      select 1 from listings l
      where l.id = listing_id and l.seller_id = auth.uid()
    )
  );

-- Track which option the buyer chose (for receipts + dashboard display).
alter table orders add column if not exists shipping_option_name text;
