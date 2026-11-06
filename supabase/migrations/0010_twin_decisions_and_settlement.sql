-- نبضات القرارات السيادية + حقول التسوية المالية للمهام

CREATE TABLE IF NOT EXISTS public.twin_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID NOT NULL REFERENCES public.twins(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  situation TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'deferred')),
  chosen_option TEXT,
  ai_provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_twin_decisions_twin ON public.twin_decisions(twin_id);
CREATE INDEX IF NOT EXISTS idx_twin_decisions_status ON public.twin_decisions(status);

ALTER TABLE public.twin_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS twin_decisions_select_own ON public.twin_decisions;
CREATE POLICY twin_decisions_select_own ON public.twin_decisions
  FOR SELECT TO authenticated
  USING (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS twin_decisions_insert_own ON public.twin_decisions;
CREATE POLICY twin_decisions_insert_own ON public.twin_decisions
  FOR INSERT TO authenticated
  WITH CHECK (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS twin_decisions_update_own ON public.twin_decisions;
CREATE POLICY twin_decisions_update_own ON public.twin_decisions
  FOR UPDATE TO authenticated
  USING (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );

-- حقول المشتري والتسوية على المهام
ALTER TABLE public.night_tasks
  ADD COLUMN IF NOT EXISTS buyer_twin_id UUID REFERENCES public.twins(id),
  ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.service_listings(id),
  ADD COLUMN IF NOT EXISTS payment_settled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_tasks_buyer ON public.night_tasks(buyer_twin_id);

-- توسيع أنواع الموافقات لقبول التسليم
ALTER TABLE public.owner_approvals
  DROP CONSTRAINT IF EXISTS owner_approvals_approval_type_check;

ALTER TABLE public.owner_approvals
  ADD CONSTRAINT owner_approvals_approval_type_check
  CHECK (approval_type IN (
    'task_execution',
    'high_value_transfer',
    'contract',
    'delivery_acceptance'
  ));
