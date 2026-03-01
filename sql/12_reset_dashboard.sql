-- ============================================
-- Reset completo do dashboard
-- Apaga todos os dados para recarregar com a nova pipeline
-- ============================================

TRUNCATE TABLE public.dashboard_leads CASCADE;
TRUNCATE TABLE public.dashboard_metrics CASCADE;
TRUNCATE TABLE public.dashboard_metrics_canal CASCADE;
TRUNCATE TABLE public.dashboard_metrics_vendedor CASCADE;
TRUNCATE TABLE public.dashboard_funil CASCADE;
TRUNCATE TABLE public.dashboard_perdas CASCADE;
TRUNCATE TABLE public.dashboard_metricas_ia CASCADE;
TRUNCATE TABLE public.dashboard_metas CASCADE;
TRUNCATE TABLE public.dashboard_sync_log CASCADE;
