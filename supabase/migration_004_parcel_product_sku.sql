-- Migration 004 — Parcel product SKU
-- Run this once in your Supabase project's SQL editor.
-- Records which LBC Traditional-channel product (NP Regular, Kilobox Medium, etc.)
-- a Standard cargo type booking used, for labels/documentation purposes.

alter table public.bookings
  add column if not exists parcel_product_sku text;
