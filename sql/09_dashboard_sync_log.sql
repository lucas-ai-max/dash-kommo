CREATE TABLE IF NOT EXISTS public.dashboard_sync_log (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running',
  leads_synced INTEGER DEFAULT 0,
  error_message TEXT,
  duration_seconds NUMERIC(6,1)
);
