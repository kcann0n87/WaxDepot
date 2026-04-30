-- Pre-launch email capture for the coming-soon page.
create table waitlist (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  source text,
  created_at timestamptz not null default now()
);
create unique index waitlist_email_lower_idx on waitlist (lower(email));

alter table waitlist enable row level security;

-- Anyone (anon) can join the waitlist. No SELECT policy — list is only
-- visible via the service-role key from server actions / dashboard.
create policy "waitlist public insert" on waitlist for insert with check (true);
