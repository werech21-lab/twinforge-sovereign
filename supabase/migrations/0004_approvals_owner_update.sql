-- Allow owners to resolve pending approvals (pending -> approved|rejected only)
DROP POLICY IF EXISTS approvals_update_own_pending ON public.owner_approvals;
CREATE POLICY approvals_update_own_pending ON public.owner_approvals
  FOR UPDATE
  USING (
    status = 'pending'
    AND twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    status IN ('approved', 'rejected')
    AND twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  );
