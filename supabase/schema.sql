-- LBC Express Booking Portal — Supabase schema
-- Run this once in your Supabase project's SQL editor (Database > SQL Editor).
-- Requires the pgcrypto extension for gen_random_uuid() (enabled by default on Supabase).

-- =========================================================
-- Storage bucket for ID uploads (Government / Company IDs)
-- =========================================================
insert into storage.buckets (id, name, public)
values ('id-uploads', 'id-uploads', false)
on conflict (id) do nothing;

-- Each user may only upload/read files under a folder named after their own user id
-- (the app uploads to `${userId}/...`), enforced via storage.foldername().
create policy "Users can upload their own ID" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'id-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can read their own ID" on storage.objects
  for select to authenticated
  using (bucket_id = 'id-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================
-- profiles: one row per registered account (Business or Individual)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  account_kind text not null check (account_kind in ('business', 'individual')),
  name text not null,
  address_province text not null,
  address_city text not null,
  address_barangay text not null,
  address_street text not null,
  address_house_number text not null,
  address_landmark text,
  tin_number text,
  account_type text not null check (account_type in ('charge', 'cash')),
  authorized_representative text,
  id_type text not null,
  id_document_path text,
  email text not null,
  contact_number text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- =========================================================
-- bookings: parcel & cargo bookings + on-demand bookings
-- =========================================================
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tracking_number text not null unique,
  booking_type text not null check (booking_type in ('parcel', 'on_demand')),
  consignee_name text not null,
  consignee_province text,
  consignee_city text,
  consignee_barangay text,
  consignee_street text,
  consignee_house_number text,
  consignee_landmark text,
  consignee_instructions text,
  consignee_contact text not null,
  cargo_type text not null check (cargo_type in ('standard', 'on_demand_standard', 'on_demand_medical')),
  pickup_address text,
  dropoff_address text,
  pickup_lat numeric,
  pickup_lng numeric,
  dropoff_lat numeric,
  dropoff_lng numeric,
  distance_km numeric,
  charge numeric not null default 0,
  status text not null default 'Booked',
  destination_label text,
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "Users can view own bookings" on public.bookings
  for select using (auth.uid() = user_id);
create policy "Users can insert own bookings" on public.bookings
  for insert with check (auth.uid() = user_id);
create policy "Users can update own bookings" on public.bookings
  for update using (auth.uid() = user_id);

-- =========================================================
-- recurring_shipments: saved consignee templates
-- =========================================================
create table if not exists public.recurring_shipments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  consignee_name text not null,
  address_province text,
  address_city text,
  address_barangay text,
  address_street text,
  address_house_number text,
  address_landmark text,
  contact_number text not null,
  cargo_type text not null default 'standard',
  created_at timestamptz not null default now()
);

alter table public.recurring_shipments enable row level security;

create policy "Users can manage own recurring shipments" on public.recurring_shipments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- tickets: support tickets
-- =========================================================
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  category text not null,
  description text not null,
  status text not null default 'Open' check (status in ('Open', 'In Progress', 'Resolved')),
  created_at timestamptz not null default now()
);

alter table public.tickets enable row level security;

create policy "Users can manage own tickets" on public.tickets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Admin configuration tables (read-only to normal users)
-- =========================================================
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true
);

create table if not exists public.product_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true
);

create table if not exists public.pricing_config (
  id uuid primary key default gen_random_uuid(),
  product_type text not null unique check (product_type in ('standard', 'medical')),
  base_fare numeric not null default 49,
  per_km numeric not null default 9,
  min_fare numeric not null default 49,
  updated_at timestamptz not null default now()
);

alter table public.vehicles enable row level security;
alter table public.product_types enable row level security;
alter table public.pricing_config enable row level security;

create policy "Anyone authenticated can read vehicles" on public.vehicles
  for select using (auth.role() = 'authenticated');
create policy "Anyone authenticated can read product types" on public.product_types
  for select using (auth.role() = 'authenticated');
create policy "Anyone authenticated can read pricing" on public.pricing_config
  for select using (auth.role() = 'authenticated');

-- Seed default pricing / vehicles / product types
insert into public.pricing_config (product_type, base_fare, per_km, min_fare)
values ('standard', 49, 9, 49), ('medical', 69, 12, 69)
on conflict (product_type) do nothing;

insert into public.vehicles (name, description)
values ('Motorcycle', 'Standard on-demand delivery vehicle')
on conflict do nothing;

insert into public.product_types (name, description)
values
  ('Standard', 'General documents and parcels'),
  ('Medical', 'Medical specimens, medicines, laboratory items')
on conflict do nothing;
