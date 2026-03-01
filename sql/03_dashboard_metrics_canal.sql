CREATE TABLE IF NOT EXISTS public.dashboard_metrics_canal (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  periodo TEXT NOT NULL,
  canal_venda TEXT NOT NULL,

  total_leads INTEGER DEFAULT 0,
  leads_won INTEGER DEFAULT 0,
  leads_lost INTEGER DEFAULT 0,
  taxa_conversao NUMERIC(5,2),
  ciclo_medio_dias NUMERIC(6,1),
  ticket_medio NUMERIC(12,2),
  followups_medio NUMERIC(4,1),

  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_date, periodo, canal_venda)
);
