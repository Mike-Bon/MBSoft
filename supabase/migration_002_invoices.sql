-- Migration 002 — Billing Invoices
-- Run this once in your Supabase project's SQL editor. It's also appended to the
-- bottom of schema.sql for anyone setting up a brand-new project from scratch.

create sequence if not exists public.invoice_number_seq start 1;

-- Atomically hands out the next 8-digit invoice sequence number. security definer
-- so the client (authenticated role) can call it via RPC without needing direct
-- USAGE grants on the sequence.
create or replace function public.next_invoice_sequence()
returns bigint
language sql
security definer
set search_path = public
as $$
  select nextval('public.invoice_number_seq');
$$;

grant execute on function public.next_invoice_sequence() to authenticated;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  invoice_number text not null unique,
  period_month int not null check (period_month between 1 and 12),
  period_year int not null,
  total_sales numeric not null,
  vat numeric not null,
  vatable_sales numeric not null,
  withholding_tax numeric not null,
  total_amount_due numeric not null,
  booking_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, period_month, period_year)
);

alter table public.invoices enable row level security;

create policy "Users can view own invoices" on public.invoices
  for select using (auth.uid() = user_id);
create policy "Users can insert own invoices" on public.invoices
  for insert with check (auth.uid() = user_id);
