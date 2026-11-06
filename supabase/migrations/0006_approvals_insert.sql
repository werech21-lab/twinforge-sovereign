-- Owners can create approval requests for their twins (e.g. task completion)
DROP POLICY IF EXISTS approvals_insert_own ON public.owner_approvals;
CREATE POLICY approvals_insert_own ON public.owner_approvals
  FOR INSERT WITH CHECK (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );
