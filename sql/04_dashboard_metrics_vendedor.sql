CREATE TABLE IF NOT EXISTS public.dashboard_metrics_vendedor (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  periodo TEXT NOT NULL,
  responsible_user_id BIGINT NOT NULL,
  responsible_user_name TEXT,

  total_leads INTEGER DEFAULT 0,
  leads_won INTEGER DEFAULT 0,
  leads_lost INTEGER DEFAULT 0,
  taxa_conversao NUMERIC(5,2),
  ciclo_medio_dias NUMERIC(6,1),
  ticket_medio NUMERIC(12,2),
  receita_total NUMERIC(14,2),
  followups_medio NUMERIC(4,1),
  tempo_medio_primeiro_atendimento_min NUMERIC(8,1),

  meta_mensal NUMERIC(12,2) DEFAULT 0,
  percentual_meta NUMERIC(5,2) DEFAULT 0,

  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_date, periodo, responsible_user_id)
);
