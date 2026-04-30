-- WaxDepot initial schema
-- Run this in your Supabase project's SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- Enums
-- ============================================================
create type sport as enum ('NBA', 'MLB', 'NFL', 'NHL', 'Pokemon');
create type order_status as enum ('Charged', 'InEscrow', 'Shipped', 'Delivered', 'Released', 'Completed', 'Canceled');
create type listing_status as enum ('Active', 'Sold', 'Paused', 'Expired');
create type bid_status as enum ('Active', 'Won', 'Outbid', 'Expired', 'Canceled');
create type payout_status as enum ('Pending', 'InTransit', 'Paid', 'Failed');
create type dispute_status as enum ('Awaiting seller', 'Awaiting WaxDepot', 'Resolved — refunded', 'Resolved — denied');
create type notification_type as enum (
  'bid-placed', 'outbid', 'bid-accepted',
  'order-shipped', 'order-delivered',
  'payout-sent', 'price-drop', 'new-listing',
  'new-message'
);
create type review_verdict as enum ('positive', 'neutral', 'negative');

-- ============================================================
-- Profiles (extends auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text not null,
  bio text,
  location text,
  avatar_color text,
  is_seller boolean not null default false,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Catalog
-- ============================================================
create table skus (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  year int not null,
  brand text not null,
  sport sport not null,
  set_name text not null,
  product text not null,
  release_date date not null,
  description text,
  image_url text,
  gradient_from text,
  gradient_to text,
  created_at timestamptz not null default now()
);
create index skus_sport_idx on skus (sport);
create index skus_brand_idx on skus (brand);
create index skus_release_date_idx on skus (release_date);

-- ============================================================
-- Marketplace — listings, bids, sales
-- ============================================================
create table listings (
  id uuid primary key default uuid_generate_v4(),
  sku_id uuid not null references skus on delete cascade,
  seller_id uuid not null references profiles,
  price_cents int not null check (price_cents > 0),
  shipping_cents int not null default 0,
  quantity int not null check (quantity > 0),
  status listing_status not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_sku_status_price_idx on listings (sku_id, status, price_cents);

create table bids (
  id uuid primary key default uuid_generate_v4(),
  sku_id uuid not null references skus on delete cascade,
  buyer_id uuid not null references profiles,
  price_cents int not null check (price_cents > 0),
  expires_at timestamptz not null,
  status bid_status not null default 'Active',
  created_at timestamptz not null default now()
);
create index bids_sku_status_price_idx on bids (sku_id, status, price_cents desc);

create table sales (
  id uuid primary key default uuid_generate_v4(),
  sku_id uuid not null references skus,
  price_cents int not null,
  sold_at timestamptz not null default now()
);
create index sales_sku_sold_at_idx on sales (sku_id, sold_at desc);

-- ============================================================
-- Orders — buyer side
-- ============================================================
create table orders (
  id text primary key, -- 'WM-XXXXXX' human-readable
  buyer_id uuid not null references profiles,
  seller_id uuid not null references profiles,
  listing_id uuid references listings on delete set null,
  sku_id uuid not null references skus,
  qty int not null check (qty > 0),
  price_cents int not null,
  shipping_cents int not null default 0,
  tax_cents int not null default 0,
  total_cents int not null,
  card_last4 text,
  status order_status not null default 'Charged',
  carrier text,
  tracking text,
  estimated_delivery date,
  ship_to_name text not null,
  ship_to_addr1 text not null,
  ship_to_city text not null,
  ship_to_state text not null,
  ship_to_zip text not null,
  placed_at timestamptz not null default now(),
  shipped_at timestamptz,
  delivered_at timestamptz,
  released_at timestamptz,
  canceled_at timestamptz,
  cancel_reason text
);
create index orders_buyer_idx on orders (buyer_id, placed_at desc);
create index orders_seller_idx on orders (seller_id, placed_at desc);
create index orders_status_idx on orders (status);

create table order_events (
  id uuid primary key default uuid_generate_v4(),
  order_id text not null references orders on delete cascade,
  ts timestamptz not null default now(),
  label text not null,
  detail text,
  state text not null default 'done' check (state in ('done', 'current', 'pending'))
);
create index order_events_order_ts_idx on order_events (order_id, ts);

create table tracking_events (
  id uuid primary key default uuid_generate_v4(),
  order_id text not null references orders on delete cascade,
  ts timestamptz not null,
  status text not null,
  location text,
  is_latest boolean not null default false,
  is_delivered boolean not null default false
);
create index tracking_events_order_ts_idx on tracking_events (order_id, ts desc);

-- ============================================================
-- Payouts — seller side
-- ============================================================
create table payout_accounts (
  seller_id uuid primary key references profiles on delete cascade,
  bank_name text,
  bank_last4 text,
  routing_last4 text,
  ssn_last4 text,
  legal_first_name text,
  legal_last_name text,
  dob date,
  address text,
  city text,
  state text,
  zip text,
  tin_type text check (tin_type in ('ssn', 'ein')),
  business_name text,
  is_verified boolean not null default false,
  agreed_at timestamptz,
  created_at timestamptz not null default now()
);

create table payouts (
  id text primary key, -- 'PO-XXXXXX'
  seller_id uuid not null references profiles,
  amount_cents int not null,
  status payout_status not null default 'Pending',
  initiated_at timestamptz not null default now(),
  arrives_by date,
  bank_last4 text
);
create index payouts_seller_idx on payouts (seller_id, initiated_at desc);

create table payout_orders (
  payout_id text not null references payouts on delete cascade,
  order_id text not null references orders,
  primary key (payout_id, order_id)
);

-- ============================================================
-- Messaging
-- ============================================================
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references profiles,
  other_id uuid not null references profiles, -- seller or support
  other_role text not null check (other_role in ('seller', 'buyer', 'support')),
  order_id text references orders on delete set null,
  sku_id uuid references skus on delete set null,
  subject text not null,
  last_message_at timestamptz not null default now(),
  unread boolean not null default true
);
create index conversations_buyer_idx on conversations (buyer_id, last_message_at desc);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations on delete cascade,
  from_role text not null check (from_role in ('buyer', 'seller', 'support')),
  text text not null,
  ts timestamptz not null default now(),
  system_event_kind text check (system_event_kind in ('shipped', 'delivered', 'released', 'dispute')),
  system_event_detail text
);
create index messages_conversation_ts_idx on messages (conversation_id, ts);

-- ============================================================
-- Engagement — watchlist, follows, recently viewed, saved searches
-- ============================================================
create table watchlist (
  user_id uuid not null references profiles on delete cascade,
  sku_id uuid not null references skus on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, sku_id)
);

create table follows (
  follower_id uuid not null references profiles on delete cascade,
  followed_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id)
);

create table recently_viewed (
  user_id uuid not null references profiles on delete cascade,
  sku_id uuid not null references skus on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, sku_id)
);

create table saved_searches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles on delete cascade,
  query text,
  sport sport,
  brand text,
  price_max_cents int,
  alert_new_listing boolean not null default true,
  alert_price_drop boolean not null default true,
  alert_email boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Disputes & reviews
-- ============================================================
create table disputes (
  id text primary key, -- 'DSP-XXXX'
  order_id text not null references orders,
  reporter_id uuid not null references profiles,
  reason text not null,
  description text not null,
  preferred_outcome text not null check (preferred_outcome in ('refund', 'replacement', 'partial')),
  photo_count int not null default 0,
  status dispute_status not null default 'Awaiting seller',
  opened_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index disputes_order_idx on disputes (order_id);
create index disputes_reporter_idx on disputes (reporter_id, opened_at desc);

create table reviews (
  id uuid primary key default uuid_generate_v4(),
  reviewer_id uuid not null references profiles,
  seller_id uuid not null references profiles,
  order_id text not null references orders unique,
  sku_id uuid not null references skus,
  stars int not null check (stars between 1 and 5),
  verdict review_verdict not null,
  item_accuracy int not null check (item_accuracy between 1 and 5),
  communication int not null check (communication between 1 and 5),
  shipping_speed int not null check (shipping_speed between 1 and 5),
  shipping_cost int not null check (shipping_cost between 1 and 5),
  text text,
  seller_reply text,
  seller_reply_at timestamptz,
  created_at timestamptz not null default now()
);
create index reviews_seller_idx on reviews (seller_id, created_at desc);

-- ============================================================
-- Notifications
-- ============================================================
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null,
  href text not null,
  unread boolean not null default true,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx on notifications (user_id, unread, created_at desc);

-- ============================================================
-- User addresses & cards (for saved checkout info)
-- ============================================================
create table user_addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles on delete cascade,
  name text not null,
  addr1 text not null,
  city text not null,
  state text not null,
  zip text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Note: real card numbers never live here. We only store the Stripe payment_method_id
-- and display metadata (last4, brand, exp).
create table user_cards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles on delete cascade,
  stripe_payment_method_id text unique not null,
  brand text not null,
  last4 text not null,
  exp_month int not null,
  exp_year int not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
alter table profiles enable row level security;
alter table watchlist enable row level security;
alter table follows enable row level security;
alter table recently_viewed enable row level security;
alter table saved_searches enable row level security;
alter table notifications enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table user_addresses enable row level security;
alter table user_cards enable row level security;
alter table orders enable row level security;
alter table listings enable row level security;
alter table bids enable row level security;
alter table payout_accounts enable row level security;
alter table payouts enable row level security;
alter table disputes enable row level security;
alter table reviews enable row level security;

-- Public reads
alter table skus enable row level security;
create policy "skus public read" on skus for select using (true);

create policy "profiles public read" on profiles for select using (true);
create policy "profiles self update" on profiles for update using (auth.uid() = id);
create policy "profiles self insert" on profiles for insert with check (auth.uid() = id);

create policy "listings public read" on listings for select using (true);
create policy "listings seller write" on listings for all using (auth.uid() = seller_id);

create policy "bids public read" on bids for select using (true);
create policy "bids buyer write" on bids for all using (auth.uid() = buyer_id);

create policy "reviews public read" on reviews for select using (true);
create policy "reviews reviewer insert" on reviews for insert with check (auth.uid() = reviewer_id);
create policy "reviews seller reply" on reviews for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

create policy "follows public read" on follows for select using (true);
create policy "follows self write" on follows for all using (auth.uid() = follower_id);

-- Private to owner
create policy "watchlist owner" on watchlist for all using (auth.uid() = user_id);
create policy "recently_viewed owner" on recently_viewed for all using (auth.uid() = user_id);
create policy "saved_searches owner" on saved_searches for all using (auth.uid() = user_id);
create policy "notifications owner" on notifications for all using (auth.uid() = user_id);
create policy "user_addresses owner" on user_addresses for all using (auth.uid() = user_id);
create policy "user_cards owner" on user_cards for all using (auth.uid() = user_id);
create policy "payout_accounts owner" on payout_accounts for all using (auth.uid() = seller_id);
create policy "payouts owner" on payouts for select using (auth.uid() = seller_id);

-- Orders: visible to buyer or seller
create policy "orders buyer read" on orders for select using (auth.uid() = buyer_id);
create policy "orders seller read" on orders for select using (auth.uid() = seller_id);
create policy "orders buyer insert" on orders for insert with check (auth.uid() = buyer_id);
create policy "orders buyer update" on orders for update using (auth.uid() = buyer_id);
create policy "orders seller update" on orders for update using (auth.uid() = seller_id);

-- Conversations: visible to buyer or other party
create policy "conversations buyer read" on conversations for select using (auth.uid() = buyer_id);
create policy "conversations other read" on conversations for select using (auth.uid() = other_id);
create policy "conversations buyer insert" on conversations for insert with check (auth.uid() = buyer_id);

create policy "messages members read" on messages for select using (
  exists (select 1 from conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.other_id = auth.uid()))
);
create policy "messages members insert" on messages for insert with check (
  exists (select 1 from conversations c where c.id = conversation_id and (c.buyer_id = auth.uid() or c.other_id = auth.uid()))
);

-- Disputes: reporter can read/write their own
create policy "disputes reporter" on disputes for all using (auth.uid() = reporter_id);

-- ============================================================
-- Auto-create a profile when a new auth user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text := lower(split_part(new.email, '@', 1));
  candidate text := base;
  n int := 0;
begin
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;
  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, coalesce(new.raw_user_meta_data->>'display_name', candidate));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
