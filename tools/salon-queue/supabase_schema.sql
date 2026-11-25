-- =====================================================================
-- SalonSync Studio — Supabase Database & Realtime Setup
-- Paste and run this once inside your Supabase Project -> SQL Editor
-- =====================================================================

create table if not exists public.salon_bookings (
  id uuid primary key default gen_random_uuid(),
  shop_code text not null default 'DEFAULT-SALON',
  booking_date text not null,          -- YYYY-MM-DD
  start_min integer not null,          -- Minutes from midnight (e.g. 1140 = 7:00 PM)
  duration_min integer not null default 30,
  chair_id text not null,
  customer_name text not null,
  customer_phone text not null default '',
  service_name text not null,
  service_price numeric not null default 0,
  booking_source text not null default 'walkin', -- 'walkin' | 'phone'
  status text not null default 'booked',         -- 'booked' | 'seated' | 'completed' | 'cancelled'
  amount_paid numeric,
  payment_mode text default '',                  -- 'Cash' | 'UPI' | 'Card'
  notes text default '',
  updated_by text default 'reception',           -- 'owner' | 'reception'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_salon_bookings_shop_date
  on public.salon_bookings (shop_code, booking_date);

create index if not exists idx_salon_bookings_phone
  on public.salon_bookings (shop_code, customer_phone);

create table if not exists public.salon_settings (
  shop_code text primary key,
  salon_name text not null default 'Studio Luxe Salon',
  chairs jsonb not null default '[]'::jsonb,
  services jsonb not null default '[]'::jsonb,
  open_min integer not null default 570,  -- 09:30 AM
  close_min integer not null default 1290, -- 09:30 PM
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security with shop-scoped read/write policies
alter table public.salon_bookings enable row level security;
alter table public.salon_settings enable row level security;

drop policy if exists "Allow anon access to salon_bookings" on public.salon_bookings;
create policy "Allow anon access to salon_bookings"
  on public.salon_bookings
  for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Allow anon access to salon_settings" on public.salon_settings;
create policy "Allow anon access to salon_settings"
  on public.salon_settings
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- Enable Realtime broadcasts across Owner Phone & Shop Reception
alter publication supabase_realtime add table public.salon_bookings;
alter publication supabase_realtime add table public.salon_settings;
