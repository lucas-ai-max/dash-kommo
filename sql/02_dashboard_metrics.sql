CREATE TABLE IF NOT EXISTS public.dashboard_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  periodo TEXT NOT NULL,

  total_leads INTEGER DEFAULT 0,
  leads_won INTEGER DEFAULT 0,
  leads_lost INTEGER DEFAULT 0,
  leads_active INTEGER DEFAULT 0,

  taxa_conversao_geral NUMERIC(5,2),
  ciclo_medio_dias NUMERIC(6,1),
  ticket_medio NUMERIC(12,2),
  receita_total NUMERIC(14,2),
  tempo_medio_primeiro_atendimento_min NUMERIC(8,1),
  followups_medio_por_lead NUMERIC(4,1),

  calculated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(metric_date, periodo)
);
