-- ============================================
-- 0013: Sovereign Super Suite
-- 1. $50.00 daily_inference_limit for all twins & subscriptions
-- 2. marketplace_tasks table for Opportunity Radar instant deployment
-- 3. Read policy on audit_log for owner dashboard notifications
-- ============================================

-- 1) Add daily_inference_limit ($50.00) to twins
ALTER TABLE public.twins
  ADD COLUMN IF NOT EXISTS daily_inference_limit NUMERIC(10,2) NOT NULL DEFAULT 50.00;

UPDATE public.twins
SET daily_inference_limit = 50.00
WHERE daily_inference_limit IS NULL OR daily_inference_limit < 50.00;

-- Upgrade subscription_plans & ensure active $50.00 plan for all users
UPDATE public.subscription_plans
SET max_daily_inference_usd = 50.00
WHERE max_daily_inference_usd < 50.00;

INSERT INTO public.subscription_plans (
  name,
  display_name,
  price_usd,
  night_work_hours,
  max_daily_inference_usd,
  features,
  is_active
)
VALUES (
  'sovereign',
  'الباقة السيادية الشاملة',
  0,
  24,
  50.00,
  '{"council": true, "radar": true, "voice": true, "pdf_export": true}'::jsonb,
  TRUE
)
ON CONFLICT (name) DO UPDATE
SET max_daily_inference_usd = 50.00,
    is_active = TRUE;

INSERT INTO public.subscriptions (
  user_id,
  plan_id,
  status,
  current_period_start,
  current_period_end
)
SELECT
  u.id,
  sp.id,
  'active',
  NOW(),
  NOW() + INTERVAL '365 days'
FROM public.users u
CROSS JOIN LATERAL (
  SELECT id FROM public.subscription_plans WHERE name = 'sovereign' LIMIT 1
) sp
WHERE NOT EXISTS (
  SELECT 1
  FROM public.subscriptions s
  WHERE s.user_id = u.id
    AND s.status IN ('active', 'trialing', 'past_due')
);

-- 2) Create marketplace_tasks table for Sovereign Opportunity Radar
CREATE TABLE IF NOT EXISTS public.marketplace_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID NOT NULL REFERENCES public.twins(id) ON DELETE CASCADE,
  night_task_id UUID REFERENCES public.night_tasks(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.service_listings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'ai_automation',
  expected_success_rate INTEGER NOT NULL DEFAULT 90
    CHECK (expected_success_rate >= 0 AND expected_success_rate <= 100),
  reward_gems NUMERIC(18,4) NOT NULL DEFAULT 0 CHECK (reward_gems >= 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'in_progress', 'completed', 'cancelled')),
  ai_strategy TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_marketplace_tasks_twin
  ON public.marketplace_tasks(twin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_tasks_status
  ON public.marketplace_tasks(status);

ALTER TABLE public.marketplace_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketplace_tasks_select_own ON public.marketplace_tasks;
CREATE POLICY marketplace_tasks_select_own ON public.marketplace_tasks
  FOR SELECT TO authenticated
  USING (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS marketplace_tasks_insert_own ON public.marketplace_tasks;
CREATE POLICY marketplace_tasks_insert_own ON public.marketplace_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS marketplace_tasks_update_own ON public.marketplace_tasks;
CREATE POLICY marketplace_tasks_update_own ON public.marketplace_tasks
  FOR UPDATE TO authenticated
  USING (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS marketplace_tasks_delete_own ON public.marketplace_tasks;
CREATE POLICY marketplace_tasks_delete_own ON public.marketplace_tasks
  FOR DELETE TO authenticated
  USING (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_tasks TO authenticated, service_role;

-- 3) Allow authenticated users to read their own audit_log entries (prevents 403 in dashboard notifications)
GRANT SELECT ON public.audit_log TO authenticated;

DROP POLICY IF EXISTS audit_log_select_own ON public.audit_log;
CREATE POLICY audit_log_select_own ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );
