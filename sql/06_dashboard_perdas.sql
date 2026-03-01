CREATE TABLE IF NOT EXISTS public.dashboard_perdas (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  periodo TEXT NOT NULL,
  motivo_perda TEXT,
  canal_venda TEXT,
  responsible_user_name TEXT,

  quantidade INTEGER DEFAULT 0,
  percentual_do_total NUMERIC(5,2),

  calculated_at TIMESTAMPTZ DEFAULT NOW()
);
