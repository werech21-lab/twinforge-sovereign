-- Multi-twin: ensure a user may own many twins (no UNIQUE on user_id)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'twins'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%user_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.twins DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.twins_user_id_key;
DROP INDEX IF EXISTS public.idx_twins_user_id_unique;

CREATE INDEX IF NOT EXISTS idx_twins_user_id ON public.twins(user_id);
CREATE INDEX IF NOT EXISTS idx_twins_user_created
  ON public.twins(user_id, created_at DESC);

COMMENT ON TABLE public.twins IS
  'Digital twins — a single user may own multiple twins (family / fleet).';
