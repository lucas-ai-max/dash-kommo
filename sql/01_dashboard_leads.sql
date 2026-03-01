CREATE TABLE IF NOT EXISTS public.dashboard_leads (
  id BIGSERIAL PRIMARY KEY,
  kommo_lead_id BIGINT UNIQUE NOT NULL,
  lead_name TEXT,

  pipeline_id BIGINT,
  pipeline_name TEXT,
  status_id BIGINT,
  status_name TEXT,
  is_won BOOLEAN DEFAULT FALSE,
  is_lost BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  responsible_user_id BIGINT,
  responsible_user_name TEXT,

  price NUMERIC(12,2) DEFAULT 0,

  canal_venda TEXT,
  pre_atendimento TEXT,
  motivo_perda TEXT,
  loss_reason_id BIGINT,

  created_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  first_event_at TIMESTAMPTZ,
  first_vendor_event_at TIMESTAMPTZ,

  ciclo_dias NUMERIC(6,1),
  tempo_primeiro_atendimento_min NUMERIC(8,1),
  qtd_followups INTEGER DEFAULT 0,

  synced_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dl_canal ON dashboard_leads(canal_venda);
CREATE INDEX IF NOT EXISTS idx_dl_responsible ON dashboard_leads(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_dl_status ON dashboard_leads(is_won, is_lost);
CREATE INDEX IF NOT EXISTS idx_dl_created ON dashboard_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_dl_pipeline ON dashboard_leads(pipeline_id, status_id);
