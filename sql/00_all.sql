-- ============================================
-- Dashboard Comercial Motocor
-- Executar todas as tabelas em sequencia
-- ============================================

-- 1. Snapshot de leads
\i '01_dashboard_leads.sql'

-- 2. Metricas agregadas gerais
\i '02_dashboard_metrics.sql'

-- 3. Metricas por canal
\i '03_dashboard_metrics_canal.sql'

-- 4. Metricas por vendedor
\i '04_dashboard_metrics_vendedor.sql'

-- 5. Funil de conversao
\i '05_dashboard_funil.sql'

-- 6. Motivos de perda
\i '06_dashboard_perdas.sql'

-- 7. Metricas da IA/Bot
\i '07_dashboard_metricas_ia.sql'

-- 8. Metas dos vendedores
\i '08_dashboard_metas.sql'

-- 9. Log de sincronizacao
\i '09_dashboard_sync_log.sql'
