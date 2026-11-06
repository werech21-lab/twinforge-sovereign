-- Store AI execution outputs on night tasks
ALTER TABLE public.night_tasks
  ADD COLUMN IF NOT EXISTS result_text TEXT,
  ADD COLUMN IF NOT EXISTS learning_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_provider TEXT,
  ADD COLUMN IF NOT EXISTS ai_cost_usd NUMERIC(10,6) DEFAULT 0;
