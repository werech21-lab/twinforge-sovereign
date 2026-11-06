-- Owners can end their own active rentals
DROP POLICY IF EXISTS rentals_update_own ON public.twin_property_rentals;
CREATE POLICY rentals_update_own ON public.twin_property_rentals
  FOR UPDATE
  USING (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    twin_id IN (SELECT id FROM public.twins WHERE user_id = auth.uid())
    AND status IN ('active', 'ended', 'canceled')
  );
