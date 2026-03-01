-- Tabela para armazenar tempo de resposta por conversa (lead)
-- Permite avaliar individualmente o tempo de resposta do bot (Velocity Digital Company) e do Erick

CREATE TABLE IF NOT EXISTS dashboard_resposta_por_conversa (
  id            BIGSERIAL PRIMARY KEY,
  lead_id       BIGINT NOT NULL UNIQUE,
  data_conversa DATE,
  tempo_bot_seg     NUMERIC(10,1),
  tempo_erick_min   NUMERIC(10,1),
  calculated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resposta_conversa_data ON dashboard_resposta_por_conversa (data_conversa DESC);
