# LBC Express — Booking Portal

A Lalamove-style booking web app for LBC Express: account registration (Business/Individual),
Parcel & Cargo booking (single/multiple + bulk Excel upload), an on-demand fare calculator,
shipment tracking with a live map, POD/Manifest documentation, and a support ticket system.

Stack: React + TypeScript + Vite, Tailwind CSS, Supabase (auth + database + file storage),
Google Maps (Places Autocomplete + live tracking map).

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Project Settings > API**, copy the **Project URL** and **anon public** key.
3. In the SQL editor, run the contents of [`supabase/schema.sql`](supabase/schema.sql) once. This
   creates all tables (profiles, bookings, recurring shipments, tickets, pricing/vehicles/product
   types), the private `id-uploads` storage bucket, and row-level security policies so every
   account only ever sees its own data.
4. **Important for this prototype:** go to **Authentication > Sign In / Providers > Email** and
   turn **off** "Confirm email". Registration in this app signs the user in immediately and
   uploads their ID + profile in the same step — if email confirmation is required, that upload
   will fail until the user confirms their email and signs in again. (For a production rollout,
   keep confirmation on and move the ID upload + profile insert to run after first login instead.)

## 2. Set up Google Maps

1. In the [Google Cloud Console](https://console.cloud.google.com/), create/select a project and
   enable: **Maps JavaScript API**, **Places API**, and **Geocoding API**.
2. Create an API key and restrict it to those APIs (and to your domain/localhost for safety).

## 3. Configure environment variables

Copy `.env.example` to `.env` and fill in the three values:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GOOGLE_MAPS_API_KEY=...
```

The app still runs without the Google Maps key (address fields fall back to manual entry and the
tracking map shows a "map unavailable" placeholder), but it will not run without Supabase configured.

## 4. Run it

```bash
npm install
npm run dev
```

Open the printed local URL, then **Register** as a Business or Individual account — that account
automatically becomes the shipper on every booking you create.

## What's inside

- **Dashboard** — weekly/monthly volume and a delivery status breakdown chart (Delivered, Delayed
  SLA, Tried – No Recipient, Tried – Refused, Return to Sender).
- **Parcel & Cargo Booking** — single/multiple booking (up to 10 consignees) with per-row charge
  from the Standard or On-Demand calculator, plus bulk booking via an Excel template (up to 100
  rows). Consignees can be saved as recurring shipments for next time.
- **On-Demand Booking** — a Lalamove-style fare calculator: search pickup/drop-off addresses,
  pick Standard or Medical, get an instant fare, and book directly.
- **Shipments** — searchable list with label print/download and a Summary Sheet export.
- **Tracking** — live Google Map with simulated real-time position based on shipment status.
- **Documentation** — POD and Manifest records, with batch POD export.
- **Support** — create and monitor support tickets.
- **Administration** — admin dashboard, plus Vehicles/Product Types/Pricing configuration used by
  the on-demand calculator.

New accounts are seeded with a handful of demo shipments (in various statuses) so these screens
aren't empty on first login.
