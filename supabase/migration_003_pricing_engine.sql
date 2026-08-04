-- Migration 003 — Configuration-driven on-demand pricing engine
-- Run this once in your Supabase project's SQL editor.

-- =========================================================
-- vehicles: extend with the full rate card + visibility flag.
-- Only Motorcycle should be visible=true for MVP; other vehicle types can be
-- added later and switched on without any code changes.
-- =========================================================
alter table public.vehicles
  add column if not exists visible boolean not null default false,
  add column if not exists base_fare numeric not null default 49,
  add column if not exists included_km numeric not null default 5,
  add column if not exists rate_first_km numeric not null default 6,
  add column if not exists rate_after_included numeric not null default 5,
  add column if not exists time_rate numeric not null default 1,
  add column if not exists traffic_multiplier numeric not null default 1,
  add column if not exists demand_multiplier numeric not null default 1,
  add column if not exists zone_multiplier numeric not null default 1,
  add column if not exists platform_margin numeric not null default 5,
  add column if not exists max_weight_kg numeric,
  add column if not exists max_dimensions text;

update public.vehicles set visible = true where lower(name) = 'motorcycle';

-- =========================================================
-- product_types: add the fare multiplier (Standard 1.00, Medical 1.20).
-- =========================================================
alter table public.product_types
  add column if not exists multiplier numeric not null default 1.0;

update public.product_types set multiplier = 1.00 where lower(name) = 'standard';
update public.product_types set multiplier = 1.20 where lower(name) = 'medical';

-- =========================================================
-- RLS fix: the original schema only granted SELECT on vehicles/product_types,
-- so Administration's add/edit/toggle actions were silently failing. Add
-- insert/update policies (any authenticated user, matching current app-wide
-- admin access — tighten this once real role-based access is built).
-- =========================================================
create policy "Authenticated can insert vehicles" on public.vehicles
  for insert to authenticated with check (true);
create policy "Authenticated can update vehicles" on public.vehicles
  for update to authenticated using (true) with check (true);

create policy "Authenticated can insert product types" on public.product_types
  for insert to authenticated with check (true);
create policy "Authenticated can update product types" on public.product_types
  for update to authenticated using (true) with check (true);
