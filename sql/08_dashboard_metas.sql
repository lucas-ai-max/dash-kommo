CREATE TABLE IF NOT EXISTS public.dashboard_metas (
  id BIGSERIAL PRIMARY KEY,
  responsible_user_id BIGINT NOT NULL,
  responsible_user_name TEXT,
  mes_referencia DATE NOT NULL,
  meta_quantidade INTEGER DEFAULT 0,
  meta_receita NUMERIC(14,2) DEFAULT 0,

  UNIQUE(responsible_user_id, mes_referencia)
);
