-- Allow twin owners to insert their own morning reports (Phase 1 manual generate)
DROP POLICY IF EXISTS morning_reports_insert_own ON public.morning_reports;
CREATE POLICY morning_reports_insert_own ON public.morning_reports
  FOR INSERT WITH CHECK (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );
