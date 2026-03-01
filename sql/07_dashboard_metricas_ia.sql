CREATE TABLE IF NOT EXISTS public.dashboard_metricas_ia (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,

  total_conversas INTEGER DEFAULT 0,
  conversas_finalizadas INTEGER DEFAULT 0,
  conversas_fup_ativas INTEGER DEFAULT 0,

  fup_nivel_1_enviados INTEGER DEFAULT 0,
  fup_nivel_2_enviados INTEGER DEFAULT 0,
  fup_nivel_3_enviados INTEGER DEFAULT 0,

  tempo_medio_resposta_bot_seg NUMERIC(8,1),
  mensagens_por_conversa_media NUMERIC(4,1),

  taxa_handoff NUMERIC(5,2),

  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_date)
);
