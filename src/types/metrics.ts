export interface KPIData {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  prefix?: string;
  suffix?: string;
}

export interface FunnelStage {
  name: string;
  value: number;
  fill: string;
  taxa_passagem?: number;
}

export interface CanalPerformance {
  canal: string;
  total: number;
  won: number;
  lost: number;
  active: number;
  conversao: number;
  ciclo: number;
  ticket: number;
  followups: number;
}

export interface VendedorPerformance {
  id: number;
  nome: string;
  total: number;
  won: number;
  lost: number;
  conversao: number;
  ciclo: number;
  ticket: number;
  receita: number;
  followups: number;
  tempo_atendimento: number;
  meta: number;
  percentual_meta: number;
}

export interface PerdaAnalise {
  motivo: string;
  canal: string | null;
  responsavel: string | null;
  quantidade: number;
  percentual: number;
}

export interface IAMetrics {
  total_conversas: number;
  conversas_finalizadas: number;
  conversas_fup_ativas: number;
  fup_nivel_1: number;
  fup_nivel_2: number;
  fup_nivel_3: number;
  tempo_medio_bot: number;
  msgs_por_conversa: number;
  taxa_handoff: number;
}

export type Periodo = "todos" | "hoje" | "7dias" | "30dias" | "60dias" | "mes_atual" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
}
