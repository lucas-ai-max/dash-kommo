export interface DashboardLead {
  id?: number;
  kommo_lead_id: number;
  lead_name: string | null;
  pipeline_id: number | null;
  pipeline_name: string | null;
  status_id: number | null;
  status_name: string | null;
  is_won: boolean;
  is_lost: boolean;
  is_active: boolean;
  responsible_user_id: number | null;
  responsible_user_name: string | null;
  price: number;
  canal_venda: string | null;
  pre_atendimento: string | null;
  motivo_perda: string | null;
  loss_reason_id: number | null;
  created_at: string | null;
  closed_at: string | null;
  first_event_at: string | null;
  first_vendor_event_at: string | null;
  ciclo_dias: number | null;
  tempo_primeiro_atendimento_min: number | null;
  qtd_followups: number;
  synced_at: string;
  updated_at?: string;
}

export interface DashboardMetrics {
  id?: number;
  metric_date: string;
  periodo: string;
  total_leads: number;
  leads_won: number;
  leads_lost: number;
  leads_active: number;
  taxa_conversao_geral: number | null;
  ciclo_medio_dias: number | null;
  ticket_medio: number | null;
  receita_total: number | null;
  tempo_medio_primeiro_atendimento_min: number | null;
  followups_medio_por_lead: number | null;
  calculated_at?: string;
}

export interface DashboardMetricsCanal {
  id?: number;
  metric_date: string;
  periodo: string;
  canal_venda: string;
  total_leads: number;
  leads_won: number;
  leads_lost: number;
  taxa_conversao: number | null;
  ciclo_medio_dias: number | null;
  ticket_medio: number | null;
  followups_medio: number | null;
  calculated_at?: string;
}

export interface DashboardMetricsVendedor {
  id?: number;
  metric_date: string;
  periodo: string;
  responsible_user_id: number;
  responsible_user_name: string | null;
  total_leads: number;
  leads_won: number;
  leads_lost: number;
  taxa_conversao: number | null;
  ciclo_medio_dias: number | null;
  ticket_medio: number | null;
  receita_total: number | null;
  followups_medio: number | null;
  tempo_medio_primeiro_atendimento_min: number | null;
  meta_mensal: number | null;
  percentual_meta: number | null;
  calculated_at?: string;
}

export interface DashboardFunil {
  id?: number;
  metric_date: string;
  periodo: string;
  pipeline_id: number;
  pipeline_name: string | null;
  status_id: number;
  status_name: string | null;
  stage_order: number | null;
  leads_entrou: number;
  leads_saiu: number;
  leads_atual: number;
  taxa_passagem: number | null;
  calculated_at?: string;
}

export interface DashboardPerdas {
  id?: number;
  metric_date: string;
  periodo: string;
  pipeline_name: string | null;
  motivo_perda: string | null;
  canal_venda: string | null;
  responsible_user_name: string | null;
  quantidade: number;
  percentual_do_total: number | null;
  calculated_at?: string;
}

export interface DashboardMetricasIA {
  id?: number;
  metric_date: string;
  total_conversas: number;
  conversas_finalizadas: number;
  conversas_fup_ativas: number;
  fup_nivel_1_enviados: number;
  fup_nivel_2_enviados: number;
  fup_nivel_3_enviados: number;
  tempo_medio_resposta_bot_seg: number | null;
  tempo_medio_resposta_humano_min: number | null;
  mensagens_por_conversa_media: number | null;
  taxa_handoff: number | null;
  calculated_at?: string;
}

export interface DashboardRespostaPorConversa {
  id?: number;
  lead_id: number;
  data_conversa: string | null;
  tempo_bot_seg: number | null;
  tempo_erick_min: number | null;
  calculated_at?: string;
}

export interface DashboardMeta {
  id?: number;
  responsible_user_id: number;
  responsible_user_name: string | null;
  mes_referencia: string;
  meta_quantidade: number;
  meta_receita: number;
}

export interface DashboardSyncLog {
  id?: number;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "error";
  leads_synced: number;
  error_message: string | null;
  duration_seconds: number | null;
}
