-- Track last energy recovery application per rental (prevents double-counting)
ALTER TABLE public.twin_property_rentals
  ADD COLUMN IF NOT EXISTS last_energy_at TIMESTAMPTZ;
