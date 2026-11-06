-- Phase 1: morning reports for dashboard
CREATE TABLE IF NOT EXISTS public.morning_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_id UUID NOT NULL REFERENCES public.twins(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_morning_reports_twin_created
  ON public.morning_reports (twin_id, created_at DESC);

ALTER TABLE public.morning_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS morning_reports_select_own ON public.morning_reports;
CREATE POLICY morning_reports_select_own ON public.morning_reports
  FOR SELECT USING (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );

-- Inserts come from service_role / night jobs later
