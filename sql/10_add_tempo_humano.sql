ALTER TABLE public.dashboard_metricas_ia
ADD COLUMN IF NOT EXISTS tempo_medio_resposta_humano_min NUMERIC(8,1);
