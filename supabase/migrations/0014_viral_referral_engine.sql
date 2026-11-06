-- ============================================
-- Migration 0014: Viral Referral & Growth Engine
-- 1. Referral codes on public.users (founder slug + auto codes)
-- 2. public.referrals tracking table with double-entry ledger links
-- 3. Sovereign Treasury ForgeGold reserve so referral bonuses never fail
-- ============================================

-- 1. Add referral columns to public.users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);

-- Assign memorable 'founder' code to the founder/admin account if not taken
UPDATE public.users
SET referral_code = 'founder'
WHERE lower(email) = 'werech21@gmail.com'
  AND referral_code IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.users WHERE referral_code = 'founder');

-- Backfill unique referral codes for any other existing users
UPDATE public.users
SET referral_code = 'tf-' || substr(replace(id::text, '-', ''), 1, 8)
WHERE referral_code IS NULL;

-- Update handle_new_user trigger so new users automatically get a unique referral_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.id::text || '@users.local'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'tf-' || substr(replace(NEW.id::text, '-', ''), 1, 8)
  )
  ON CONFLICT (id) DO UPDATE
    SET referral_code = COALESCE(public.users.referral_code, EXCLUDED.referral_code);
  RETURN NEW;
END;
$$;

-- 2. Create public.referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referrer_twin_id UUID REFERENCES public.twins(id) ON DELETE SET NULL,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  referred_twin_id UUID REFERENCES public.twins(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  reward_forge_gold NUMERIC(18,4) NOT NULL DEFAULT 500,
  reward_energy NUMERIC(5,2) NOT NULL DEFAULT 10,
  referrer_ledger_id UUID REFERENCES public.ledger_entries(id),
  referred_ledger_id UUID REFERENCES public.ledger_entries(id),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'referrals' AND policyname = 'referrals_select_involved'
  ) THEN
    CREATE POLICY referrals_select_involved ON public.referrals
      FOR SELECT USING (
        referrer_user_id = auth.uid() OR referred_user_id = auth.uid()
      );
  END IF;
END $$;

GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

-- 3. Ensure system treasury ForgeGold reserve has ample liquidity for viral referral rewards
INSERT INTO public.accounts (account_type, currency, is_system, balance)
VALUES ('treasury', 'forge_gold', TRUE, 5000000.0000)
ON CONFLICT DO NOTHING;

UPDATE public.accounts
SET balance = GREATEST(balance, 5000000.0000)
WHERE account_type = 'treasury'
  AND currency = 'forge_gold'
  AND is_system = TRUE;
