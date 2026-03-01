CREATE TABLE IF NOT EXISTS public.dashboard_funil (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  periodo TEXT NOT NULL,
  pipeline_id BIGINT NOT NULL,
  pipeline_name TEXT,
  status_id BIGINT NOT NULL,
  status_name TEXT,
  stage_order INTEGER,

  leads_entrou INTEGER DEFAULT 0,
  leads_saiu INTEGER DEFAULT 0,
  leads_atual INTEGER DEFAULT 0,
  taxa_passagem NUMERIC(5,2),

  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_date, periodo, pipeline_id, status_id)
);
