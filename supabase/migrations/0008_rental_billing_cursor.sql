-- Track last billed day for property rentals (prevents double-charging)
ALTER TABLE public.twin_property_rentals
  ADD COLUMN IF NOT EXISTS last_billed_at TIMESTAMPTZ;
