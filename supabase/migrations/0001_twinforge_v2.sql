-- ============================================
-- TwinForge - Complete Database Schema
-- Version: 2.1 (MVP - Security Hardened)
-- Immutable Ledger + RLS + Dual Currency + Subscriptions
-- Target: Supabase Postgres
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ============================================
-- 1. USERS (1:1 with auth.users)
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.id::text || '@users.local'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. TWINS
-- ============================================
CREATE TABLE public.twins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  personality_summary TEXT,
  personality_vector extensions.vector(1536),
  energy NUMERIC(5,2) NOT NULL DEFAULT 100 CHECK (energy >= 0 AND energy <= 100),
  mood NUMERIC(5,2) NOT NULL DEFAULT 50 CHECK (mood >= 0 AND mood <= 100),
  reputation NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resting', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_twins_user_id ON public.twins(user_id);

-- ============================================
-- 3. ACCOUNTS
-- ============================================
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID REFERENCES public.twins(id), -- no CASCADE: ledger history must survive
  account_type TEXT NOT NULL CHECK (account_type IN ('twin', 'treasury', 'commission', 'escrow')),
  currency TEXT NOT NULL CHECK (currency IN ('forge_gold', 'earned_gems')),
  balance NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accounts_twin_requires_type CHECK (
    (account_type = 'twin' AND twin_id IS NOT NULL AND is_system = FALSE)
    OR (account_type <> 'twin' AND twin_id IS NULL AND is_system = TRUE)
  )
);

CREATE UNIQUE INDEX idx_accounts_twin_currency
  ON public.accounts (twin_id, currency)
  WHERE twin_id IS NOT NULL;

CREATE UNIQUE INDEX idx_accounts_system_type_currency
  ON public.accounts (account_type, currency)
  WHERE is_system = TRUE;

CREATE INDEX idx_accounts_twin_id ON public.accounts(twin_id);
CREATE INDEX idx_accounts_currency ON public.accounts(currency);

-- Auto-create twin wallets
CREATE OR REPLACE FUNCTION public.create_twin_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.accounts (twin_id, account_type, currency, is_system)
  VALUES
    (NEW.id, 'twin', 'forge_gold', FALSE),
    (NEW.id, 'twin', 'earned_gems', FALSE);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_twin_accounts
  AFTER INSERT ON public.twins
  FOR EACH ROW EXECUTE FUNCTION public.create_twin_accounts();

-- ============================================
-- 4. LEDGER (immutable)
-- ============================================
CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_account_id UUID NOT NULL REFERENCES public.accounts(id),
  credit_account_id UUID NOT NULL REFERENCES public.accounts(id),
  amount NUMERIC(18,4) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('forge_gold', 'earned_gems')),
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ledger_distinct_accounts CHECK (debit_account_id <> credit_account_id)
);

CREATE INDEX idx_ledger_debit ON public.ledger_entries(debit_account_id);
CREATE INDEX idx_ledger_credit ON public.ledger_entries(credit_account_id);
CREATE INDEX idx_ledger_created ON public.ledger_entries(created_at DESC);
CREATE INDEX idx_ledger_reference ON public.ledger_entries(reference_type, reference_id);

REVOKE INSERT, UPDATE, DELETE ON public.ledger_entries FROM authenticated, anon, public;
GRANT SELECT ON public.ledger_entries TO authenticated;

-- ============================================
-- 5. TWIN MEMORIES
-- ============================================
CREATE TABLE public.twin_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID NOT NULL REFERENCES public.twins(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding extensions.vector(1536),
  memory_type TEXT NOT NULL DEFAULT 'event'
    CHECK (memory_type IN ('seed', 'event', 'lesson', 'preference')),
  importance NUMERIC(3,2) NOT NULL DEFAULT 0.5
    CHECK (importance >= 0 AND importance <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memories_twin ON public.twin_memories(twin_id);
-- HNSW works on empty tables; create after embeddings exist if preferred
CREATE INDEX idx_memories_embedding ON public.twin_memories
  USING hnsw (embedding extensions.vector_cosine_ops);

-- ============================================
-- 6. NIGHT TASKS
-- ============================================
CREATE TABLE public.night_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID NOT NULL REFERENCES public.twins(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'requires_approval')),
  reward_amount NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  reward_currency TEXT NOT NULL DEFAULT 'earned_gems'
    CHECK (reward_currency IN ('forge_gold', 'earned_gems')),
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_twin ON public.night_tasks(twin_id);
CREATE INDEX idx_tasks_status ON public.night_tasks(status);

-- ============================================
-- 7. SUBSCRIPTIONS
-- ============================================
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  price_usd NUMERIC(10,2) NOT NULL CHECK (price_usd >= 0),
  night_work_hours INTEGER NOT NULL CHECK (night_work_hours >= 0),
  max_daily_inference_usd NUMERIC(10,4) NOT NULL DEFAULT 1.0 CHECK (max_daily_inference_usd >= 0),
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscriptions_period_valid CHECK (current_period_end > current_period_start)
);

CREATE UNIQUE INDEX idx_subscriptions_one_active
  ON public.subscriptions (user_id)
  WHERE status IN ('active', 'trialing', 'past_due');

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- ============================================
-- 8. VIRTUAL PROPERTIES & RENTALS
-- ============================================
CREATE TABLE public.virtual_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('room', 'apartment', 'villa', 'office')),
  energy_recovery_rate NUMERIC(5,2) NOT NULL CHECK (energy_recovery_rate >= 0),
  daily_cost_forge_gold NUMERIC(18,4) NOT NULL CHECK (daily_cost_forge_gold >= 0),
  description TEXT,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.twin_property_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID NOT NULL REFERENCES public.twins(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.virtual_properties(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'canceled')),
  total_cost NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  ledger_entry_id UUID REFERENCES public.ledger_entries(id)
);

CREATE UNIQUE INDEX idx_rentals_one_active_per_twin
  ON public.twin_property_rentals (twin_id)
  WHERE status = 'active';

CREATE INDEX idx_rentals_twin ON public.twin_property_rentals(twin_id);
CREATE INDEX idx_rentals_status ON public.twin_property_rentals(status);

-- ============================================
-- 9. SERVICE LISTINGS
-- ============================================
CREATE TABLE public.service_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID NOT NULL REFERENCES public.twins(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price_earned_gems NUMERIC(18,4) NOT NULL CHECK (price_earned_gems >= 0),
  estimated_hours NUMERIC(5,2) CHECK (estimated_hours IS NULL OR estimated_hours > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listings_twin ON public.service_listings(twin_id);
CREATE INDEX idx_listings_category ON public.service_listings(category);
CREATE INDEX idx_listings_active ON public.service_listings(is_active) WHERE is_active = TRUE;

-- ============================================
-- 10. OWNER APPROVALS
-- ============================================
CREATE TABLE public.owner_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID NOT NULL REFERENCES public.twins(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.night_tasks(id),
  approval_type TEXT NOT NULL
    CHECK (approval_type IN ('task_execution', 'high_value_transfer', 'contract')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  response_note TEXT
);

CREATE INDEX idx_approvals_twin ON public.owner_approvals(twin_id);
CREATE INDEX idx_approvals_status ON public.owner_approvals(status);

-- ============================================
-- 11. AUDIT LOG
-- ============================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  twin_id UUID REFERENCES public.twins(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_twin ON public.audit_log(twin_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_action ON public.audit_log(action);

REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM authenticated, anon, public;

-- ============================================
-- 12. ATOMIC TRANSFER (service_role / trusted RPC only)
-- ============================================
CREATE OR REPLACE FUNCTION public.transfer_funds(
  p_from_account UUID,
  p_to_account UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id UUID;
  v_from_balance NUMERIC;
  v_from_currency TEXT;
  v_to_currency TEXT;
  v_first UUID;
  v_second UUID;
BEGIN
  IF p_from_account IS NULL OR p_to_account IS NULL THEN
    RAISE EXCEPTION 'account ids required';
  END IF;
  IF p_from_account = p_to_account THEN
    RAISE EXCEPTION 'cannot transfer to same account';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  -- Stable lock order avoids deadlocks
  IF p_from_account < p_to_account THEN
    v_first := p_from_account;
    v_second := p_to_account;
  ELSE
    v_first := p_to_account;
    v_second := p_from_account;
  END IF;

  PERFORM 1 FROM public.accounts WHERE id = v_first FOR UPDATE;
  PERFORM 1 FROM public.accounts WHERE id = v_second FOR UPDATE;

  SELECT balance, currency INTO v_from_balance, v_from_currency
  FROM public.accounts WHERE id = p_from_account;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'from account not found';
  END IF;

  SELECT currency INTO v_to_currency
  FROM public.accounts WHERE id = p_to_account;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'to account not found';
  END IF;

  IF v_from_currency IS DISTINCT FROM v_to_currency THEN
    RAISE EXCEPTION 'currency mismatch';
  END IF;
  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient balance';
  END IF;

  INSERT INTO public.ledger_entries (
    debit_account_id, credit_account_id, amount, currency,
    description, reference_type, reference_id
  ) VALUES (
    p_from_account, p_to_account, p_amount, v_from_currency,
    p_description, p_reference_type, p_reference_id
  ) RETURNING id INTO v_entry_id;

  UPDATE public.accounts SET balance = balance - p_amount WHERE id = p_from_account;
  UPDATE public.accounts SET balance = balance + p_amount WHERE id = p_to_account;

  INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, new_values)
  VALUES (
    auth.uid(),
    'transfer',
    'ledger_entries',
    v_entry_id,
    jsonb_build_object(
      'from', p_from_account,
      'to', p_to_account,
      'amount', p_amount,
      'currency', v_from_currency,
      'reference_type', p_reference_type,
      'reference_id', p_reference_id
    )
  );

  RETURN v_entry_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_funds(UUID, UUID, NUMERIC, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_funds(UUID, UUID, NUMERIC, TEXT, TEXT, UUID) TO service_role;

-- Owner responds to pending approval only
CREATE OR REPLACE FUNCTION public.respond_to_approval(
  p_approval_id UUID,
  p_status TEXT,
  p_note TEXT DEFAULT NULL
) RETURNS public.owner_approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.owner_approvals;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  SELECT a.* INTO v_row
  FROM public.owner_approvals a
  JOIN public.twins t ON t.id = a.twin_id
  WHERE a.id = p_approval_id
    AND t.user_id = auth.uid()
  FOR UPDATE OF a;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'approval not found';
  END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'approval already resolved';
  END IF;

  UPDATE public.owner_approvals
  SET status = p_status,
      responded_at = NOW(),
      response_note = p_note
  WHERE id = p_approval_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_approval(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_approval(UUID, TEXT, TEXT) TO authenticated, service_role;

-- ============================================
-- 13. RLS
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twin_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.night_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twin_property_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (id = auth.uid());
CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- twins
CREATE POLICY twins_select_own ON public.twins
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY twins_insert_own ON public.twins
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY twins_update_own ON public.twins
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- accounts: own twin wallets only (no system accounts)
CREATE POLICY accounts_select_own ON public.accounts
  FOR SELECT USING (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );

-- ledger: parties on either side that belong to caller
CREATE POLICY ledger_select_own ON public.ledger_entries
  FOR SELECT USING (
    debit_account_id IN (
      SELECT id FROM public.accounts
      WHERE twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
    )
    OR credit_account_id IN (
      SELECT id FROM public.accounts
      WHERE twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
    )
  );

-- memories
CREATE POLICY memories_all_own ON public.twin_memories
  FOR ALL USING (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );

-- night tasks: read/create/update metadata; completion/rewards via backend
CREATE POLICY tasks_select_own ON public.night_tasks
  FOR SELECT USING (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );
CREATE POLICY tasks_insert_own ON public.night_tasks
  FOR INSERT WITH CHECK (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );
CREATE POLICY tasks_update_own ON public.night_tasks
  FOR UPDATE USING (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );

-- catalogs: public read of active rows
CREATE POLICY plans_select_active ON public.subscription_plans
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY properties_select_available ON public.virtual_properties
  FOR SELECT USING (is_available = TRUE);

-- subscriptions: read-only for user (Stripe/webhook writes via service_role)
CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT USING (user_id = auth.uid());

-- rentals
CREATE POLICY rentals_select_own ON public.twin_property_rentals
  FOR SELECT USING (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );
CREATE POLICY rentals_insert_own ON public.twin_property_rentals
  FOR INSERT WITH CHECK (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );

-- marketplace: anyone can browse active listings; owners manage theirs
CREATE POLICY listings_select_active ON public.service_listings
  FOR SELECT USING (
    is_active = TRUE
    OR twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );
CREATE POLICY listings_insert_own ON public.service_listings
  FOR INSERT WITH CHECK (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );
CREATE POLICY listings_update_own ON public.service_listings
  FOR UPDATE USING (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );
CREATE POLICY listings_delete_own ON public.service_listings
  FOR DELETE USING (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );

-- approvals: read only; mutate via respond_to_approval()
CREATE POLICY approvals_select_own ON public.owner_approvals
  FOR SELECT USING (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );

-- audit_log: no client policies (service_role bypasses RLS)

-- ============================================
-- 14. SEED DATA
-- ============================================
INSERT INTO public.accounts (account_type, currency, is_system, balance) VALUES
  ('treasury', 'forge_gold', TRUE, 0),
  ('treasury', 'earned_gems', TRUE, 0),
  ('commission', 'forge_gold', TRUE, 0),
  ('commission', 'earned_gems', TRUE, 0);

INSERT INTO public.subscription_plans (name, display_name, price_usd, night_work_hours, max_daily_inference_usd) VALUES
  ('starter', 'باقة البداية', 19, 2, 0.30),
  ('pro', 'باقة المحترفين', 49, 6, 1.00),
  ('vip', 'باقة النخبة', 149, 12, 2.50),
  ('syndicate', 'باقة الشركات', 499, 24, 10.00);

INSERT INTO public.virtual_properties (name, property_type, energy_recovery_rate, daily_cost_forge_gold) VALUES
  ('غرفة أساسية', 'room', 5.0, 2),
  ('شقة مريحة', 'apartment', 12.0, 8),
  ('فيلا فاخرة', 'villa', 25.0, 25),
  ('مقر شركة', 'office', 18.0, 15);

-- ============================================
-- DONE (v2.1)
-- ============================================
