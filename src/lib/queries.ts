import { supabase } from "@/lib/supabase-browser";
import { format, subDays, startOfMonth } from "date-fns";
import type {
  DashboardMetrics,
  DashboardMetricsCanal,
  DashboardMetricsVendedor,
  DashboardFunil,
  DashboardPerdas,
  DashboardMetricasIA,
  DashboardRespostaPorConversa,
  DashboardSyncLog,
} from "@/types/database";
import type { Periodo } from "@/types/metrics";

async function fetchAllRows<T>(queryBuilder: any): Promise<T[]> {
  let allData: T[] = [];
  let from = 0;
  const step = 1000;

  while (true) {
    const { data, error } = await queryBuilder.range(from, from + step - 1);
    if (error) {
      console.error("Supabase fetch error:", error);
      break;
    }
    if (!data || data.length === 0) break;

    allData = allData.concat(data);
    if (data.length < step) break;

    from += step;
  }
  return allData;
}

// Module-level custom date range for "custom" periodo
let _customDateRange: { from: string; to: string } | null = null;

export function setCustomDateRange(range: { from: string; to: string } | null) {
  _customDateRange = range;
}

function getDateRange(periodo: Periodo): { from: string; to: string } | null {
  if (periodo === "todos") return null;

  const now = new Date();
  const to = format(now, "yyyy-MM-dd") + "T23:59:59";

  switch (periodo) {
    case "hoje":
      return { from: format(now, "yyyy-MM-dd") + "T00:00:00", to };
    case "7dias":
      return { from: format(subDays(now, 7), "yyyy-MM-dd") + "T00:00:00", to };
    case "30dias":
      return {
        from: format(subDays(now, 30), "yyyy-MM-dd") + "T00:00:00",
        to,
      };
    case "60dias":
      return {
        from: format(subDays(now, 60), "yyyy-MM-dd") + "T00:00:00",
        to,
      };
    case "mes_atual":
      return {
        from: format(startOfMonth(now), "yyyy-MM-dd") + "T00:00:00",
        to,
      };
    case "custom":
      return _customDateRange;
    default:
      return null;
  }
}

export async function fetchOverviewMetrics(
  periodo: Periodo
): Promise<DashboardMetrics | null> {
  const range = getDateRange(periodo);

  // Volume: leads CRIADOS no período — ambos os pipelines, sem perdidos
  let volumeQuery = supabase
    .from("dashboard_leads")
    .select("is_won, is_lost, is_active, price, ciclo_dias, created_at, closed_at")
    .in("pipeline_id", [9968344, 13215396])
    .eq("is_lost", false);

  if (range) {
    volumeQuery = volumeQuery.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(volumeQuery);

  // Resultados: leads FECHADOS no período (won/lost com closed_at no range)
  let closedLeads: any[] = [];
  if (range) {
    let closedQuery = supabase
      .from("dashboard_leads")
      .select("is_won, is_lost, price, ciclo_dias, closed_at")
      .in("pipeline_id", [9968344, 13215396])
      .not("closed_at", "is", null)
      .gte("closed_at", range.from)
      .lte("closed_at", range.to);
    closedLeads = await fetchAllRows<any>(closedQuery);
  } else {
    // "todos" — won/lost vêm dos próprios leads
    closedLeads = (leads || []).filter((l: any) => l.is_won || l.is_lost);
  }

  const totalLeads = leads?.length || 0;
  if (totalLeads === 0 && closedLeads.length === 0) return null;

  const won = closedLeads.filter((l: any) => l.is_won);
  const lost = closedLeads.filter((l: any) => l.is_lost);
  const active = (leads || []).filter((l: any) => l.is_active);
  const ciclos = [...won, ...lost].filter((l: any) => l.ciclo_dias != null).map((l: any) => l.ciclo_dias as number);

  return {
    metric_date: format(new Date(), "yyyy-MM-dd"),
    periodo: periodo,
    total_leads: totalLeads,
    leads_won: won.length,
    leads_lost: lost.length,
    leads_active: active.length,
    taxa_conversao_geral:
      totalLeads > 0
        ? Number(((won.length / totalLeads) * 100).toFixed(2))
        : null,
    ciclo_medio_dias:
      ciclos.length > 0
        ? Number((ciclos.reduce((a, b) => a + b, 0) / ciclos.length).toFixed(1))
        : null,
    ticket_medio:
      won.length > 0
        ? Number((won.reduce((a: number, l: any) => a + (l.price || 0), 0) / won.length).toFixed(2))
        : null,
    receita_total: won.reduce((a: number, l: any) => a + (l.price || 0), 0),
    tempo_medio_primeiro_atendimento_min: null,
    followups_medio_por_lead: null,
  };
}

export async function fetchMetricsHistory(
  days: number = 30
): Promise<DashboardMetrics[]> {
  const { data } = await supabase
    .from("dashboard_metrics")
    .select("*")
    .eq("periodo", "diario")
    .order("metric_date", { ascending: true })
    .limit(days);
  return data || [];
}

interface CanalRow {
  canal_venda: string | null;
  is_won: boolean;
  is_lost: boolean;
  price: number;
  ciclo_dias: number | null;
  qtd_followups: number;
}

export async function fetchCanalMetrics(
  periodo: Periodo,
  responsibleUserId?: number,
  pipelineId?: number
): Promise<DashboardMetricsCanal[]> {
  const range = getDateRange(periodo);
  const selectFields = "canal_venda, is_won, is_lost, price, ciclo_dias, qtd_followups, created_at, closed_at";

  // Volume: leads CRIADOS no período
  let query = supabase
    .from("dashboard_leads")
    .select(selectFields);

  if (responsibleUserId) {
    query = query.eq("responsible_user_id", responsibleUserId);
  }

  if (pipelineId) {
    query = query.eq("pipeline_id", pipelineId);
  }

  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);

  // Resultados: leads FECHADOS no período
  let closedLeads: any[] = [];
  if (range) {
    let closedQuery = supabase
      .from("dashboard_leads")
      .select(selectFields)
      .not("closed_at", "is", null)
      .gte("closed_at", range.from)
      .lte("closed_at", range.to);
    if (responsibleUserId) {
      closedQuery = closedQuery.eq("responsible_user_id", responsibleUserId);
    }
    if (pipelineId) {
      closedQuery = closedQuery.eq("pipeline_id", pipelineId);
    }
    closedLeads = await fetchAllRows<any>(closedQuery);
  }

  // Merge sem duplicatas
  const seen = new Set<string>();
  const allLeads: any[] = [];
  for (const l of [...(leads || []), ...closedLeads]) {
    const key = `${l.canal_venda}-${l.created_at}-${l.price}-${l.is_won}-${l.is_lost}`;
    if (!seen.has(key)) {
      seen.add(key);
      allLeads.push(l);
    }
  }

  if (allLeads.length === 0) return [];

  const byCanal = new Map<string, CanalRow[]>();
  for (const lead of allLeads) {
    const canal = lead.canal_venda || "Sem canal";
    if (!byCanal.has(canal)) byCanal.set(canal, []);
    byCanal.get(canal)!.push({ ...lead, canal_venda: canal });
  }

  return Array.from(byCanal.entries()).map(([canal, cLeads]) => {
    const won = cLeads.filter((l) => l.is_won);
    const lost = cLeads.filter((l) => l.is_lost);
    const totalDecided = won.length + lost.length;
    const ciclos = [...won, ...lost].filter((l) => l.ciclo_dias != null).map((l) => l.ciclo_dias!);

    return {
      metric_date: format(new Date(), "yyyy-MM-dd"),
      periodo: periodo,
      canal_venda: canal,
      total_leads: cLeads.length,
      leads_won: won.length,
      leads_lost: lost.length,
      taxa_conversao:
        totalDecided > 0
          ? Number(((won.length / totalDecided) * 100).toFixed(2))
          : null,
      ciclo_medio_dias:
        ciclos.length > 0
          ? Number((ciclos.reduce((a, b) => a + b, 0) / ciclos.length).toFixed(1))
          : null,
      ticket_medio:
        won.length > 0
          ? Number((won.reduce((a, l) => a + (l.price || 0), 0) / won.length).toFixed(2))
          : null,
      followups_medio:
        cLeads.length > 0
          ? Number((cLeads.reduce((a, l) => a + (l.qtd_followups || 0), 0) / cLeads.length).toFixed(1))
          : null,
    };
  });
}

interface VendedorRow {
  responsible_user_id: number;
  responsible_user_name: string | null;
  is_won: boolean;
  is_lost: boolean;
  price: number;
  ciclo_dias: number | null;
  qtd_followups: number;
  tempo_primeiro_atendimento_min: number | null;
  created_at: string | null;
  closed_at: string | null;
}

export async function fetchVendedorMetrics(
  periodo: Periodo
): Promise<DashboardMetricsVendedor[]> {
  const range = getDateRange(periodo);
  const selectFields = "responsible_user_id, responsible_user_name, is_won, is_lost, price, ciclo_dias, qtd_followups, tempo_primeiro_atendimento_min, pre_atendimento, canal_venda, created_at, closed_at";

  // Volume: leads CRIADOS no período
  let allQuery = supabase
    .from("dashboard_leads")
    .select(selectFields)
    .eq("pipeline_id", 9968344);

  if (range) {
    allQuery = allQuery.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(allQuery);

  // Resultados: leads FECHADOS no período (para capturar vendas de leads antigos)
  let closedLeads: any[] = [];
  if (range) {
    let closedQuery = supabase
      .from("dashboard_leads")
      .select(selectFields)
      .eq("pipeline_id", 9968344)
      .not("closed_at", "is", null)
      .gte("closed_at", range.from)
      .lte("closed_at", range.to);
    closedLeads = await fetchAllRows<any>(closedQuery);
  }

  // Merge: leads criados no período + leads fechados no período (sem duplicatas)
  const seenIds = new Set<string>();
  const allLeads: any[] = [];
  for (const l of [...(leads || []), ...closedLeads]) {
    const key = `${l.responsible_user_id}-${l.created_at}-${l.price}`;
    if (!seenIds.has(key)) {
      seenIds.add(key);
      allLeads.push(l);
    }
  }

  if (allLeads.length === 0) return [];

  // Busca metas do mês atual
  const mesReferencia = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const { data: metas } = await supabase
    .from("dashboard_metas")
    .select("responsible_user_id, meta_receita")
    .eq("mes_referencia", mesReferencia);
  const metasMap = new Map<number, { meta_receita: number }>();
  (metas || []).forEach((m: any) => metasMap.set(m.responsible_user_id, { meta_receita: m.meta_receita }));

  const byVendedor = new Map<number, VendedorRow[]>();
  for (const lead of allLeads) {
    if (!lead.responsible_user_id) continue;
    if (!byVendedor.has(lead.responsible_user_id))
      byVendedor.set(lead.responsible_user_id, []);
    byVendedor.get(lead.responsible_user_id)!.push(lead);
  }

  return Array.from(byVendedor.entries()).map(([userId, vLeads]) => {
    const wonTotal = vLeads.filter((l) => l.is_won);
    const lostTotal = vLeads.filter((l) => l.is_lost);
    const receita = wonTotal.reduce((a, l) => a + (l.price || 0), 0);
    const ciclos = [...wonTotal, ...lostTotal].filter((l) => l.ciclo_dias != null).map((l) => l.ciclo_dias!);

    // Taxa de conversão por VALOR: receita das vendas ganhas / valor total de todos os leads do vendedor
    // Se não houver valor monetário, usa contagem: vendas / (total leads + vendas)
    const valorTotalLeads = vLeads.reduce((a, l) => a + (l.price || 0), 0);
    const totalPool = vLeads.length + wonTotal.length; // soma os ganhos ao universo total
    const taxaConversaoValor = valorTotalLeads > 0
      ? Number(((receita / valorTotalLeads) * 100).toFixed(2))
      : totalPool > 0
        ? Number(((wonTotal.length / totalPool) * 100).toFixed(2))
        : null;

    const tempos = vLeads.filter((l) => l.tempo_primeiro_atendimento_min != null).map((l) => l.tempo_primeiro_atendimento_min!);

    return {
      metric_date: format(new Date(), "yyyy-MM-dd"),
      periodo: periodo,
      responsible_user_id: userId,
      responsible_user_name: vLeads[0]?.responsible_user_name || null,
      total_leads: vLeads.length,
      leads_won: wonTotal.length,
      leads_lost: lostTotal.length,
      taxa_conversao: taxaConversaoValor,
      ciclo_medio_dias:
        ciclos.length > 0
          ? Number((ciclos.reduce((a, b) => a + b, 0) / ciclos.length).toFixed(1))
          : null,
      ticket_medio:
        wonTotal.length > 0
          ? Number((receita / wonTotal.length).toFixed(2))
          : null,
      receita_total: receita,
      followups_medio:
        vLeads.length > 0
          ? Number((vLeads.reduce((a, l) => a + (l.qtd_followups || 0), 0) / vLeads.length).toFixed(1))
          : null,
      tempo_medio_primeiro_atendimento_min:
        tempos.length > 0
          ? Number((tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1))
          : null,
      meta_mensal: metasMap.get(userId)?.meta_receita ?? 0,
      percentual_meta: (() => {
        const metaReceita = metasMap.get(userId)?.meta_receita ?? 0;
        if (!metaReceita) return 0;
        return Number(((receita / metaReceita) * 100).toFixed(2));
      })(),
      pct_bot: (() => {
        const botCount = vLeads.filter(
          (l: any) =>
            (l.canal_venda && l.canal_venda.toLowerCase().includes("bot")) ||
            (l.pre_atendimento && l.pre_atendimento.toLowerCase().includes("bot"))
        ).length;
        return vLeads.length > 0 ? Number(((botCount / vLeads.length) * 100).toFixed(1)) : null;
      })(),
    };
  }).filter((v) => v.total_leads > 0 || v.leads_won > 0 || v.leads_lost > 0);
}

export const PIPELINE_STAGES: Record<number, string[]> = {
  9968344: [
    "CONTATO INICIAL",
    "EM ATENDIMENTO",
    "NEGOCIAÇÕES QUENTES",
    "[★] REAQUECER",
    "ACOMPANHAMENTO",
    "FECHADO-GANHO",
    "FECHADO-PERDIDO"
  ],
  13215396: [
    "DESCOBERTA",
    "MOSTRAR MODELOS",
    "FORMA DE PAGAMENTO",
    "TRANSFERENCIA",
    "TRATAMENTO",
    "PROPOSTA",
    "OBJEÇOES",
    "FECHAMENTO"
  ],
  11480160: [
    "Ligar",
    "nao atendeu",
    "mensagem",
    "ultima chamada",
    "resgate",
  ]
};

// Última etapa que participa do somatório cumulativo (inclusive).
// Etapas APÓS esta mostram valor exato.
const CUMULATIVE_UNTIL: Record<number, string> = {
  13215396: "FECHAMENTO",
};

export async function fetchFunilData(
  _periodo: Periodo = "todos",
  pipelineId?: number
): Promise<DashboardFunil[]> {
  // Funil mostra o estado ATUAL da pipeline — ignora filtro de data
  let query = supabase
    .from("dashboard_leads")
    .select("pipeline_id, pipeline_name, status_id, status_name, is_active");

  if (pipelineId) {
    query = query.eq("pipeline_id", pipelineId);
  }

  const leads = await fetchAllRows<any>(query);

  const stageMap = new Map<string, { pipeline_id: number; pipeline_name: string; status_id: number; status_name: string; count: number }>();

  // Pre-fill stages if we are querying one of the predefined pipelines
  if (pipelineId && PIPELINE_STAGES[pipelineId]) {
    const predefined = PIPELINE_STAGES[pipelineId];
    predefined.forEach((stageName, index) => {
      stageMap.set(stageName.toUpperCase(), {
        pipeline_id: pipelineId,
        pipeline_name: "", // populated later if a lead matches
        status_id: index + 1000, // placeholder ID
        status_name: stageName,
        count: 0,
      });
    });
  }

  if (leads) {
    for (const lead of leads) {
      if (pipelineId && PIPELINE_STAGES[pipelineId]) {
        // Map to exact stage by name
        const upperName = (lead.status_name || "").toUpperCase();
        if (stageMap.has(upperName)) {
          const stage = stageMap.get(upperName)!;
          stage.count++;
          stage.status_id = lead.status_id;
          stage.pipeline_name = lead.pipeline_name || stage.pipeline_name;
        } else {
          // Leads with stages outside our map, append to end
          const key = `${lead.pipeline_id}-${lead.status_id}`;
          if (!stageMap.has(key)) {
            stageMap.set(key, {
              pipeline_id: lead.pipeline_id,
              pipeline_name: lead.pipeline_name || "",
              status_id: lead.status_id,
              status_name: lead.status_name || "",
              count: 0,
            });
          }
          stageMap.get(key)!.count++;
        }
      } else {
        const key = `${lead.pipeline_id}-${lead.status_id}`;
        if (!stageMap.has(key)) {
          stageMap.set(key, {
            pipeline_id: lead.pipeline_id,
            pipeline_name: lead.pipeline_name || "",
            status_id: lead.status_id,
            status_name: lead.status_name || "",
            count: 0,
          });
        }
        stageMap.get(key)!.count++;
      }
    }
  }

  const result = Array.from(stageMap.values()).map((s) => ({
    metric_date: format(new Date(), "yyyy-MM-dd"),
    periodo: _periodo,
    pipeline_id: s.pipeline_id,
    pipeline_name: s.pipeline_name,
    status_id: s.status_id,
    status_name: s.status_name,
    stage_order: 0,
    leads_entrou: 0,
    leads_saiu: 0,
    leads_atual: s.count,
    taxa_passagem: null as number | null,
  }));

  // Lógica cumulativa parcial: soma apenas até a etapa limite (CUMULATIVE_UNTIL)
  if (pipelineId && PIPELINE_STAGES[pipelineId] && CUMULATIVE_UNTIL[pipelineId]) {
    const orderDefs = PIPELINE_STAGES[pipelineId].map(s => s.toUpperCase());
    const limitIdx = orderDefs.indexOf(CUMULATIVE_UNTIL[pipelineId].toUpperCase());
    const exact = new Map<string, number>();
    result.forEach(r => exact.set((r.status_name || "").toUpperCase(), r.leads_atual));

    result.forEach(r => {
      const name = (r.status_name || "").toUpperCase();
      const idx = orderDefs.indexOf(name);
      if (idx === -1 || idx > limitIdx) return; // após limite = valor exato

      let cumulative = 0;
      for (let i = idx; i < orderDefs.length; i++) {
        cumulative += exact.get(orderDefs[i]) || 0;
      }
      r.leads_atual = cumulative;
    });
  }

  if (pipelineId && PIPELINE_STAGES[pipelineId]) {
    const orderDefs = PIPELINE_STAGES[pipelineId].map(s => s.toUpperCase());
    result.sort((a, b) => {
      const idxA = orderDefs.indexOf((a.status_name || "").toUpperCase());
      const idxB = orderDefs.indexOf((b.status_name || "").toUpperCase());
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  } else {
    result.sort((a, b) => b.leads_atual - a.leads_atual);
  }

  return result;
}

export async function fetchPerdasData(
  periodo: Periodo
): Promise<DashboardPerdas[]> {
  const range = getDateRange(periodo);

  let query = supabase
    .from("dashboard_leads")
    .select("motivo_perda, canal_venda, responsible_user_name, pipeline_name")
    .eq("is_lost", true);

  if (range) {
    // Perdas: filtrar por closed_at (quando foi perdido), não created_at
    query = query.gte("closed_at", range.from).lte("closed_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);
  if (!leads || leads.length === 0) return [];

  const total = leads.length;
  const grouped = new Map<string, { motivo: string; canal: string; responsavel: string; pipeline: string; count: number }>();

  for (const lead of leads) {
    const motivo = lead.motivo_perda || "Sem motivo";
    const canal = lead.canal_venda || "Sem canal";
    const responsavel = lead.responsible_user_name || "Sem responsável";
    const pipeline = lead.pipeline_name || "Sem pipeline";
    const key = `${pipeline}|${motivo}|${canal}|${responsavel}`;
    if (!grouped.has(key)) grouped.set(key, { motivo, canal, responsavel, pipeline, count: 0 });
    grouped.get(key)!.count++;
  }

  return Array.from(grouped.values()).map((g) => ({
    metric_date: format(new Date(), "yyyy-MM-dd"),
    periodo: periodo,
    pipeline_name: g.pipeline,
    motivo_perda: g.motivo,
    canal_venda: g.canal,
    responsible_user_name: g.responsavel,
    quantidade: g.count,
    percentual_do_total: Number(((g.count / total) * 100).toFixed(2)),
  }));
}

export async function fetchIAMetrics(
  periodo: Periodo = "todos"
): Promise<DashboardMetricasIA[]> {
  const range = getDateRange(periodo);

  let query = supabase
    .from("dashboard_metricas_ia")
    .select("*");

  if (range) {
    query = query
      .gte("metric_date", range.from.slice(0, 10))
      .lte("metric_date", range.to.slice(0, 10));
  }

  const { data } = await query
    .order("metric_date", { ascending: false })
    .limit(90);
  return data || [];
}

/** Busca o registro mais recente para exibir as médias rolling de resposta (sempre 30d) */
export async function fetchIAResponseTimes(): Promise<{
  bot_seg: number | null;
  humano_min: number | null;
}> {
  const { data } = await supabase
    .from("dashboard_metricas_ia")
    .select("tempo_medio_resposta_bot_seg, tempo_medio_resposta_humano_min")
    .not("tempo_medio_resposta_bot_seg", "is", null)
    .order("metric_date", { ascending: false })
    .limit(1)
    .single();

  return {
    bot_seg: data?.tempo_medio_resposta_bot_seg ?? null,
    humano_min: data?.tempo_medio_resposta_humano_min ?? null,
  };
}

export async function fetchRespostaPorConversa(): Promise<DashboardRespostaPorConversa[]> {
  const from = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const { data } = await supabase
    .from("dashboard_resposta_por_conversa")
    .select("*")
    .gte("data_conversa", from)
    .order("data_conversa", { ascending: false })
    .limit(200);
  return data || [];
}

export async function fetchLeadsPerdidos(periodo: Periodo = "todos"): Promise<number> {
  const range = getDateRange(periodo);
  let query = supabase
    .from("chats")
    .select("*", { count: "exact", head: true });

  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const { count } = await query
    .eq("status_fup", true)
    .eq("fup_nivel_1", true)
    .eq("fup_nivel_2", true)
    .eq("fup_nivel_3", true)
    .eq("messagem_fup_1", true)
    .eq("messagem_fup_2", true)
    .eq("messagem_fup_3", true)
    .eq("status_final", false);
  return count ?? 0;
}

// Obsolete array removed

export async function fetchPipelineFunil(
  pipelineId?: number,
  periodo?: Periodo
): Promise<DashboardFunil[]> {
  // Query active leads for funnel visualization
  let query = supabase
    .from("dashboard_leads")
    .select("pipeline_id, pipeline_name, status_id, status_name");

  if (pipelineId) {
    query = query.eq("pipeline_id", pipelineId);
  }

  const leads = await fetchAllRows<any>(query);
  if (!leads && !pipelineId) return [];

  // Group by pipeline_id -> status_id
  const byPipeline = new Map<number, Map<number, {
    pipeline_id: number; pipeline_name: string;
    status_id: number; status_name: string; count: number;
  }>>();

  for (const lead of (leads || [])) {
    if (!byPipeline.has(lead.pipeline_id)) byPipeline.set(lead.pipeline_id, new Map());
    const stageMap = byPipeline.get(lead.pipeline_id)!;
    if (!stageMap.has(lead.status_id)) {
      stageMap.set(lead.status_id, {
        pipeline_id: lead.pipeline_id,
        pipeline_name: lead.pipeline_name || "",
        status_id: lead.status_id,
        status_name: lead.status_name || "",
        count: 0,
      });
    }
    stageMap.get(lead.status_id)!.count++;
  }

  let bestPipelineId = -1;
  if (pipelineId) {
    bestPipelineId = pipelineId;
  } else if (!pipelineId) {
    if (byPipeline.has(9968344)) bestPipelineId = 9968344;
    else if (byPipeline.has(13215396)) bestPipelineId = 13215396;
    else bestPipelineId = byPipeline.keys().next().value as number;
  }

  // If we couldn't resolve a valid pipeline, return empty
  if (bestPipelineId === -1) return [];

  // Create stage map for the chosen pipeline, pre-filling known stages
  const stageMap = new Map<string, any>();
  if (PIPELINE_STAGES[bestPipelineId]) {
    PIPELINE_STAGES[bestPipelineId].forEach((stageName, idx) => {
      stageMap.set(stageName.toUpperCase(), {
        pipeline_id: bestPipelineId,
        pipeline_name: byPipeline.get(bestPipelineId)?.values().next().value?.pipeline_name || "",
        status_id: idx + 1000,
        status_name: stageName,
        count: 0
      });
    });
  }

  // Populate counts
  if (byPipeline.has(bestPipelineId)) {
    for (const stage of byPipeline.get(bestPipelineId)!.values()) {
      const upper = stage.status_name.toUpperCase();
      if (stageMap.has(upper)) {
        const mapEntry = stageMap.get(upper)!;
        mapEntry.count += stage.count;
        mapEntry.status_id = stage.status_id;
      } else {
        stageMap.set(upper, { ...stage });
      }
    }
  }

  const stages = Array.from(stageMap.values());
  if (PIPELINE_STAGES[bestPipelineId]) {
    const orderDefs = PIPELINE_STAGES[bestPipelineId].map(s => s.toUpperCase());
    stages.sort((a, b) => {
      const idxA = orderDefs.indexOf((a.status_name || "").toUpperCase());
      const idxB = orderDefs.indexOf((b.status_name || "").toUpperCase());
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  } else {
    stages.sort((a, b) => b.count - a.count);
  }

  const result = stages.map((s) => ({
    metric_date: format(new Date(), "yyyy-MM-dd"),
    periodo: "all",
    pipeline_id: s.pipeline_id,
    pipeline_name: s.pipeline_name,
    status_id: s.status_id,
    status_name: s.status_name,
    stage_order: PIPELINE_STAGES[s.pipeline_id]
      ? PIPELINE_STAGES[s.pipeline_id].findIndex(name => name.toUpperCase() === (s.status_name || "").toUpperCase())
      : 0,
    leads_entrou: 0,
    leads_saiu: 0,
    leads_atual: s.count,
    taxa_passagem: null as number | null,
  }));

  // Lógica cumulativa parcial
  if (PIPELINE_STAGES[bestPipelineId] && CUMULATIVE_UNTIL[bestPipelineId]) {
    const orderDefs = PIPELINE_STAGES[bestPipelineId].map(s => s.toUpperCase());
    const limitIdx = orderDefs.indexOf(CUMULATIVE_UNTIL[bestPipelineId].toUpperCase());
    const exact = new Map<string, number>();
    result.forEach(r => exact.set((r.status_name || "").toUpperCase(), r.leads_atual));

    result.forEach(r => {
      const name = (r.status_name || "").toUpperCase();
      const idx = orderDefs.indexOf(name);
      if (idx === -1 || idx > limitIdx) return;

      let cumulative = 0;
      for (let i = idx; i < orderDefs.length; i++) {
        cumulative += exact.get(orderDefs[i]) || 0;
      }
      r.leads_atual = cumulative;
    });
  }

  return result;
}

export interface SDRMetrics {
  total_leads: number;
  leads_ativos: number;
  leads_encerrados: number;
  taxa_encerramento: number;
  por_etapa: { stage: string; count: number; pct: number }[];
  ciclo_medio_h: number | null;
}

export async function fetchSDRMetrics(periodo: Periodo): Promise<SDRMetrics> {
  const range = getDateRange(periodo);

  // KPIs de volume: leads RECEBIDOS no período (com filtro de data)
  let periodQuery = supabase
    .from("dashboard_leads")
    .select("is_lost, is_won, ciclo_dias")
    .eq("pipeline_id", 11480160);

  if (range) {
    periodQuery = periodQuery.gte("created_at", range.from).lte("created_at", range.to);
  }

  const periodLeads = await fetchAllRows<any>(periodQuery);
  const total = periodLeads.length;
  const encerrados = periodLeads.filter((l: any) => l.is_lost || l.is_won).length;
  const taxaEncerramento = total > 0 ? Number(((encerrados / total) * 100).toFixed(1)) : 0;

  const ciclos = periodLeads
    .filter((l: any) => (l.is_lost || l.is_won) && l.ciclo_dias != null)
    .map((l: any) => l.ciclo_dias as number);
  const cicloMedioH = ciclos.length > 0
    ? Number(((ciclos.reduce((a: number, b: number) => a + b, 0) / ciclos.length) * 24).toFixed(1))
    : null;

  // Estado ATUAL do pipeline: sem filtro de data
  // Leads ativos hoje independentemente de quando foram criados
  const allLeads = await fetchAllRows<any>(
    supabase
      .from("dashboard_leads")
      .select("status_name, is_active, is_lost, is_won")
      .eq("pipeline_id", 11480160)
  );

  const ativos = allLeads.filter((l: any) => l.is_active).length;

  // Distribuição por etapa — contagem exata de leads ativos por etapa (igual ao Kommo)
  const STAGE_ORDER = ["Ligar", "nao atendeu", "mensagem", "ultima chamada", "resgate"];
  const stageCount: Record<string, number> = {};
  allLeads.filter((l: any) => l.is_active).forEach((l: any) => {
    const name = l.status_name || "—";
    stageCount[name] = (stageCount[name] || 0) + 1;
  });

  const maxActive = Math.max(...STAGE_ORDER.map((s) => stageCount[s] || 0), 1);
  const porEtapa = STAGE_ORDER.map((stage) => ({
    stage,
    count: stageCount[stage] || 0,
    pct: Number((((stageCount[stage] || 0) / maxActive) * 100).toFixed(1)),
  }));

  return { total_leads: total, leads_ativos: ativos, leads_encerrados: encerrados, taxa_encerramento: taxaEncerramento, por_etapa: porEtapa, ciclo_medio_h: cicloMedioH };
}

export interface LeadsHumanoSemPropostaResult {
  semProposta: number;
  totalAtivos: number;
  leads: { name: string; stage: string; responsavel: string }[];
}

export async function fetchLeadsHumanoSemProposta(): Promise<LeadsHumanoSemPropostaResult> {
  const allAtivos = await fetchAllRows<any>(
    supabase
      .from("dashboard_leads")
      .select("lead_name, status_name, responsible_user_name")
      .eq("pipeline_id", 13215396)
      .eq("is_active", true)
  );

  const PROPOSTA_STAGES = ["PROPOSTA", "OBJEÇOES", "FECHAMENTO", "OBJEÇÕES"];
  const semProposta = allAtivos.filter(
    (l) => !PROPOSTA_STAGES.includes((l.status_name || "").toUpperCase())
  );

  return {
    semProposta: semProposta.length,
    totalAtivos: allAtivos.length,
    leads: semProposta.map((l) => ({
      name: l.lead_name || "—",
      stage: l.status_name || "—",
      responsavel: l.responsible_user_name || "—",
    })),
  };
}

export interface LeadsNegociacoesQuentes {
  total: number;
  won: number;
  lost: number;
  ativos: number;
  taxa_conversao: number | null;
}

export async function fetchLeadsNegociacoesQuentes(): Promise<LeadsNegociacoesQuentes> {
  const leads = await fetchAllRows<any>(
    supabase
      .from("dashboard_leads")
      .select("is_won, is_lost, is_active")
      .eq("pipeline_id", 9968344)
      .ilike("status_name", "NEGOCIAÇÕES QUENTES")
  );

  const won = leads.filter((l) => l.is_won).length;
  const lost = leads.filter((l) => l.is_lost).length;
  const ativos = leads.filter((l) => l.is_active).length;
  const decided = won + lost;

  return {
    total: leads.length,
    won,
    lost,
    ativos,
    taxa_conversao: decided > 0 ? Number(((won / decided) * 100).toFixed(1)) : null,
  };
}

// ── Leads por dia (daily snapshot) ──────────────────────────────────────────
export interface DailyLeadCount {
  date: string;
  total: number;
  won: number;
  lost: number;
}

export async function fetchDailyLeadCounts(
  periodo: Periodo,
  pipelineId?: number
): Promise<DailyLeadCount[]> {
  const range = getDateRange(periodo);
  // Default to last 30 days if "todos"
  const now = new Date();
  const effectiveFrom = range?.from ?? format(subDays(now, 30), "yyyy-MM-dd") + "T00:00:00";
  const effectiveTo = range?.to ?? format(now, "yyyy-MM-dd") + "T23:59:59";

  let query = supabase
    .from("dashboard_leads")
    .select("created_at, is_won, is_lost, closed_at")
    .gte("created_at", effectiveFrom)
    .lte("created_at", effectiveTo);

  if (pipelineId) {
    query = query.eq("pipeline_id", pipelineId);
  } else {
    query = query.in("pipeline_id", [9968344, 13215396]);
  }

  const leads = await fetchAllRows<any>(query);

  // Group by created_at date
  const byDate = new Map<string, { total: number; won: number; lost: number }>();
  for (const l of leads) {
    const date = (l.created_at || "").slice(0, 10);
    if (!date) continue;
    if (!byDate.has(date)) byDate.set(date, { total: 0, won: 0, lost: 0 });
    const d = byDate.get(date)!;
    d.total++;
    if (l.is_won) d.won++;
    if (l.is_lost) d.lost++;
  }

  return Array.from(byDate.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── SDR Response Time (dynamic) ─────────────────────────────────────────────
export interface SDRResponseTimeStats {
  mediana_h: number | null;
  pct_under_5min: number | null;
  pct_over_24h: number | null;
  p90_h: number | null;
  sample_size: number;
}

export async function fetchSDRResponseTimeStats(): Promise<SDRResponseTimeStats> {
  // Fetch leads from SDR pipeline with first event data
  // Uses tempo_primeiro_atendimento_min if available, otherwise calculates from events
  const leads = await fetchAllRows<any>(
    supabase
      .from("dashboard_leads")
      .select("tempo_primeiro_atendimento_min, created_at, closed_at")
      .eq("pipeline_id", 11480160)
      .not("closed_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(200)
  );

  // If tempo_primeiro_atendimento_min is populated, use it
  const tempos = leads
    .filter((l: any) => l.tempo_primeiro_atendimento_min != null && l.tempo_primeiro_atendimento_min > 0)
    .map((l: any) => l.tempo_primeiro_atendimento_min as number);

  if (tempos.length === 0) {
    return { mediana_h: null, pct_under_5min: null, pct_over_24h: null, p90_h: null, sample_size: 0 };
  }

  tempos.sort((a, b) => a - b);
  const n = tempos.length;
  const mediana = n % 2 === 0 ? (tempos[n / 2 - 1] + tempos[n / 2]) / 2 : tempos[Math.floor(n / 2)];
  const under5 = tempos.filter((t) => t <= 5).length;
  const over24h = tempos.filter((t) => t > 24 * 60).length;
  const p90idx = Math.min(Math.floor(n * 0.9), n - 1);

  return {
    mediana_h: Number((mediana / 60).toFixed(1)),
    pct_under_5min: Number(((under5 / n) * 100).toFixed(1)),
    pct_over_24h: Number(((over24h / n) * 100).toFixed(1)),
    p90_h: Number((tempos[p90idx] / 60).toFixed(1)),
    sample_size: n,
  };
}

// ── Cross-pipeline tracking: SDR → Vendedores conversion ────────────────────
export interface SDRConversionStats {
  /** Leads que originaram no SDR e agora estão em outros pipelines */
  total_transferred: number;
  won: number;
  lost: number;
  active: number;
  taxa_conversao: number | null;
  /** Pipeline de destino breakdown */
  by_destination: { pipeline_name: string; total: number; won: number; lost: number }[];
}

export async function fetchSDRConversionStats(periodo: Periodo): Promise<SDRConversionStats> {
  const range = getDateRange(periodo);

  // Find leads whose origin_pipeline_id is the SDR pipeline (11480160)
  // These are leads that started in SDR and moved to another pipeline
  let query = supabase
    .from("dashboard_leads")
    .select("pipeline_name, is_won, is_lost, is_active")
    .eq("origin_pipeline_id", 11480160);

  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);

  const won = leads.filter((l: any) => l.is_won).length;
  const lost = leads.filter((l: any) => l.is_lost).length;
  const active = leads.filter((l: any) => l.is_active).length;
  const decided = won + lost;

  // Group by destination pipeline
  const destMap = new Map<string, { total: number; won: number; lost: number }>();
  for (const l of leads) {
    const name = l.pipeline_name || "Desconhecido";
    if (!destMap.has(name)) destMap.set(name, { total: 0, won: 0, lost: 0 });
    const d = destMap.get(name)!;
    d.total++;
    if (l.is_won) d.won++;
    if (l.is_lost) d.lost++;
  }

  return {
    total_transferred: leads.length,
    won,
    lost,
    active,
    taxa_conversao: decided > 0 ? Number(((won / decided) * 100).toFixed(1)) : null,
    by_destination: Array.from(destMap.entries()).map(([pipeline_name, stats]) => ({
      pipeline_name,
      ...stats,
    })),
  };
}

// ── Perdas por etapa (using last_active_stage) ─────────────────────────────
export interface PerdasPorEtapa {
  stage: string;
  count: number;
  motivos: { motivo: string; count: number }[];
}

export async function fetchPerdasPorEtapa(
  periodo: Periodo,
  pipelineId?: number
): Promise<PerdasPorEtapa[]> {
  const range = getDateRange(periodo);

  let query = supabase
    .from("dashboard_leads")
    .select("last_active_stage, motivo_perda")
    .eq("is_lost", true)
    .not("last_active_stage", "is", null);

  if (pipelineId) {
    query = query.eq("pipeline_id", pipelineId);
  }
  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);

  const stageMap = new Map<string, Map<string, number>>();
  for (const l of leads) {
    const stage = l.last_active_stage || "Desconhecido";
    if (!stageMap.has(stage)) stageMap.set(stage, new Map());
    const motivos = stageMap.get(stage)!;
    const motivo = l.motivo_perda || "Sem motivo";
    motivos.set(motivo, (motivos.get(motivo) || 0) + 1);
  }

  return Array.from(stageMap.entries())
    .map(([stage, motivos]) => ({
      stage,
      count: Array.from(motivos.values()).reduce((a, b) => a + b, 0),
      motivos: Array.from(motivos.entries())
        .map(([motivo, count]) => ({ motivo, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count);
}

// ── Stage Durations ─────────────────────────────────────────────────────────
export interface StageDuration {
  pipeline_id: number;
  pipeline_name: string | null;
  status_name: string | null;
  avg_duration_hours: number;
  median_duration_hours: number;
  sample_size: number;
}

export async function fetchStageDurations(pipelineId?: number): Promise<StageDuration[]> {
  let query = supabase
    .from("dashboard_stage_durations")
    .select("pipeline_id, pipeline_name, status_name, avg_duration_hours, median_duration_hours, sample_size")
    .order("pipeline_id")
    .order("avg_duration_hours", { ascending: false });

  if (pipelineId) {
    query = query.eq("pipeline_id", pipelineId);
  }

  const { data } = await query;
  return (data || []) as StageDuration[];
}

// ── Response time per vendor ────────────────────────────────────────────────
export interface VendorResponseTime {
  responsible_user_id: number;
  responsible_user_name: string;
  avg_tempo_min: number;
  median_tempo_min: number;
  pct_under_10min: number;
  pct_under_30min: number;
  pct_over_24h: number;
  sample_size: number;
}

export async function fetchVendorResponseTimes(periodo: Periodo): Promise<VendorResponseTime[]> {
  const range = getDateRange(periodo);

  let query = supabase
    .from("dashboard_leads")
    .select("responsible_user_id, responsible_user_name, tempo_primeiro_atendimento_min")
    .not("tempo_primeiro_atendimento_min", "is", null)
    .gt("tempo_primeiro_atendimento_min", 0)
    .in("pipeline_id", [9968344, 13215396]);

  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);

  // Group by vendor
  const vendorMap = new Map<number, { name: string; tempos: number[] }>();
  for (const l of leads) {
    const id = l.responsible_user_id;
    if (!id) continue;
    if (!vendorMap.has(id)) {
      vendorMap.set(id, { name: l.responsible_user_name || "Sem nome", tempos: [] });
    }
    vendorMap.get(id)!.tempos.push(l.tempo_primeiro_atendimento_min);
  }

  const results: VendorResponseTime[] = [];
  for (const [userId, { name, tempos }] of vendorMap) {
    if (tempos.length < 1) continue;
    tempos.sort((a, b) => a - b);
    const n = tempos.length;
    const avg = tempos.reduce((s, t) => s + t, 0) / n;
    const mid = Math.floor(n / 2);
    const median = n % 2 === 0 ? (tempos[mid - 1] + tempos[mid]) / 2 : tempos[mid];

    results.push({
      responsible_user_id: userId,
      responsible_user_name: name,
      avg_tempo_min: Number(avg.toFixed(1)),
      median_tempo_min: Number(median.toFixed(1)),
      pct_under_10min: Number(((tempos.filter((t) => t <= 10).length / n) * 100).toFixed(1)),
      pct_under_30min: Number(((tempos.filter((t) => t <= 30).length / n) * 100).toFixed(1)),
      pct_over_24h: Number(((tempos.filter((t) => t > 1440).length / n) * 100).toFixed(1)),
      sample_size: n,
    });
  }

  return results.sort((a, b) => a.median_tempo_min - b.median_tempo_min);
}

// ── Follow-ups per vendor ───────────────────────────────────────────────────
export interface VendorFollowups {
  responsible_user_name: string;
  avg_followups: number;
  total_followups: number;
  sample_size: number;
}

export async function fetchVendorFollowups(periodo: Periodo): Promise<VendorFollowups[]> {
  const range = getDateRange(periodo);

  let query = supabase
    .from("dashboard_leads")
    .select("responsible_user_name, qtd_followups")
    .gt("qtd_followups", 0)
    .in("pipeline_id", [9968344, 13215396]);

  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);

  const vendorMap = new Map<string, { total: number; count: number }>();
  for (const l of leads) {
    const name = l.responsible_user_name || "Sem nome";
    if (!vendorMap.has(name)) vendorMap.set(name, { total: 0, count: 0 });
    const v = vendorMap.get(name)!;
    v.total += l.qtd_followups;
    v.count++;
  }

  return Array.from(vendorMap.entries())
    .map(([name, { total, count }]) => ({
      responsible_user_name: name,
      avg_followups: Number((total / count).toFixed(1)),
      total_followups: total,
      sample_size: count,
    }))
    .sort((a, b) => b.avg_followups - a.avg_followups);
}

// ── Daily Lead Counts by Canal ──────────────────────────────────────────────

export interface DailyLeadCountByCanal {
  date: string;
  canal: string;
  count: number;
}

export async function fetchDailyLeadCountsByCanal(
  periodo: Periodo
): Promise<DailyLeadCountByCanal[]> {
  const range = getDateRange(periodo);
  const now = new Date();
  const effectiveFrom = range?.from ?? format(subDays(now, 30), "yyyy-MM-dd") + "T00:00:00";
  const effectiveTo = range?.to ?? format(now, "yyyy-MM-dd") + "T23:59:59";

  const leads = await fetchAllRows<any>(
    supabase
      .from("dashboard_leads")
      .select("created_at, canal_venda")
      .gte("created_at", effectiveFrom)
      .lte("created_at", effectiveTo)
  );

  const byDateCanal = new Map<string, number>();
  for (const l of leads) {
    const date = (l.created_at || "").slice(0, 10);
    const canal = l.canal_venda || "Sem canal";
    if (!date) continue;
    const key = `${date}|${canal}`;
    byDateCanal.set(key, (byDateCanal.get(key) || 0) + 1);
  }

  return Array.from(byDateCanal.entries())
    .map(([key, count]) => {
      const [date, canal] = key.split("|");
      return { date, canal, count };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── Bot Conversion Rate ─────────────────────────────────────────────────────

export interface BotConversionData {
  total_bot_leads: number;
  bot_won: number;
  bot_lost: number;
  bot_active: number;
  taxa_conversao: number;
}

export async function fetchBotConversionRate(
  periodo: Periodo
): Promise<BotConversionData | null> {
  const range = getDateRange(periodo);

  let query = supabase
    .from("dashboard_leads")
    .select("is_won, is_lost, is_active, canal_venda, pre_atendimento");

  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);

  const botLeads = leads.filter(
    (l: any) =>
      (l.canal_venda && l.canal_venda.toLowerCase().includes("bot")) ||
      (l.pre_atendimento && l.pre_atendimento.toLowerCase().includes("bot"))
  );

  if (botLeads.length === 0) return null;

  const won = botLeads.filter((l: any) => l.is_won).length;
  const lost = botLeads.filter((l: any) => l.is_lost).length;
  const active = botLeads.filter((l: any) => l.is_active).length;
  const closed = won + lost;

  return {
    total_bot_leads: botLeads.length,
    bot_won: won,
    bot_lost: lost,
    bot_active: active,
    taxa_conversao: closed > 0 ? Number(((won / closed) * 100).toFixed(1)) : 0,
  };
}

// ── Humano vs Transferido Comparison ────────────────────────────────────────

export interface HumanoVsTransferidoData {
  direto: { total: number; won: number; lost: number; taxa: number };
  transferido: { total: number; won: number; lost: number; taxa: number };
}

export async function fetchHumanoVsTransferido(
  periodo: Periodo
): Promise<HumanoVsTransferidoData | null> {
  const range = getDateRange(periodo);

  let query = supabase
    .from("dashboard_leads")
    .select("is_won, is_lost, origin_pipeline_id");

  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);
  if (leads.length === 0) return null;

  const transferido = leads.filter((l: any) => l.origin_pipeline_id != null);
  const direto = leads.filter((l: any) => l.origin_pipeline_id == null);

  const calcSegment = (arr: any[]) => {
    const won = arr.filter((l: any) => l.is_won).length;
    const lost = arr.filter((l: any) => l.is_lost).length;
    const closed = won + lost;
    return {
      total: arr.length,
      won,
      lost,
      taxa: closed > 0 ? Number(((won / closed) * 100).toFixed(1)) : 0,
    };
  };

  return {
    direto: calcSegment(direto),
    transferido: calcSegment(transferido),
  };
}

// ── Perdas by Origin (SDR vs IA/Bot vs Direto) ─────────────────────────────

export interface PerdasByOriginData {
  origin: string;
  total_lost: number;
  motivos: Array<{ motivo: string; count: number }>;
}

export async function fetchPerdasByOrigin(
  periodo: Periodo
): Promise<PerdasByOriginData[]> {
  const range = getDateRange(periodo);

  let query = supabase
    .from("dashboard_leads")
    .select("pre_atendimento, loss_reason_name, origin_pipeline_id")
    .eq("is_lost", true);

  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);
  if (leads.length === 0) return [];

  // Classify origin
  const byOrigin = new Map<string, any[]>();
  for (const l of leads) {
    let origin = "Direto";
    if (l.pre_atendimento && l.pre_atendimento.toLowerCase().includes("bot")) {
      origin = "Bot/IA";
    } else if (l.origin_pipeline_id != null) {
      origin = "SDR";
    }
    if (!byOrigin.has(origin)) byOrigin.set(origin, []);
    byOrigin.get(origin)!.push(l);
  }

  return Array.from(byOrigin.entries()).map(([origin, originLeads]) => {
    const motivoMap = new Map<string, number>();
    for (const l of originLeads) {
      const motivo = l.loss_reason_name || "Sem motivo";
      motivoMap.set(motivo, (motivoMap.get(motivo) || 0) + 1);
    }
    const motivos = Array.from(motivoMap.entries())
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count);

    return { origin, total_lost: originLeads.length, motivos };
  }).sort((a, b) => b.total_lost - a.total_lost);
}

// ── Temperatura Distribution ────────────────────────────────────────────────

export interface TemperaturaDistribution {
  temperatura: string;
  count: number;
  won: number;
  lost: number;
  taxa_conversao: number;
}

export async function fetchTemperaturaDistribution(
  periodo: Periodo
): Promise<TemperaturaDistribution[]> {
  const range = getDateRange(periodo);

  let query = supabase
    .from("dashboard_leads")
    .select("temperatura, is_won, is_lost")
    .not("temperatura", "is", null);

  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);
  if (leads.length === 0) return [];

  const byTemp = new Map<string, any[]>();
  for (const l of leads) {
    const temp = l.temperatura || "Desconhecido";
    if (!byTemp.has(temp)) byTemp.set(temp, []);
    byTemp.get(temp)!.push(l);
  }

  return Array.from(byTemp.entries()).map(([temperatura, tLeads]) => {
    const won = tLeads.filter((l: any) => l.is_won).length;
    const lost = tLeads.filter((l: any) => l.is_lost).length;
    const closed = won + lost;
    return {
      temperatura,
      count: tLeads.length,
      won,
      lost,
      taxa_conversao: closed > 0 ? Number(((won / closed) * 100).toFixed(1)) : 0,
    };
  });
}

// ── Temperatura by Vendor ───────────────────────────────────────────────────

export interface TemperaturaByVendor {
  responsible_user_name: string;
  quente: number;
  medio: number;
  frio: number;
  total: number;
}

export async function fetchTemperaturaByVendor(
  periodo: Periodo
): Promise<TemperaturaByVendor[]> {
  const range = getDateRange(periodo);

  let query = supabase
    .from("dashboard_leads")
    .select("responsible_user_name, temperatura")
    .not("temperatura", "is", null);

  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);
  if (leads.length === 0) return [];

  const byVendor = new Map<string, { quente: number; medio: number; frio: number; total: number }>();
  for (const l of leads) {
    const name = l.responsible_user_name || "Sem responsável";
    if (!byVendor.has(name)) byVendor.set(name, { quente: 0, medio: 0, frio: 0, total: 0 });
    const v = byVendor.get(name)!;
    v.total++;
    const t = (l.temperatura || "").toLowerCase();
    if (t.includes("quente")) v.quente++;
    else if (t.includes("frio")) v.frio++;
    else v.medio++;
  }

  return Array.from(byVendor.entries())
    .map(([name, data]) => ({ responsible_user_name: name, ...data }))
    .sort((a, b) => b.total - a.total);
}

// ── Perdas em Leads Quentes ──────────────────────────────────────────────────

export interface PerdasLeadsQuentes {
  motivo: string;
  count: number;
}

export async function fetchPerdasLeadsQuentes(
  periodo: Periodo
): Promise<PerdasLeadsQuentes[]> {
  const range = getDateRange(periodo);

  let query = supabase
    .from("dashboard_leads")
    .select("loss_reason_name, temperatura")
    .eq("is_lost", true)
    .not("temperatura", "is", null);

  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);

  // Filter only "quente" temperatura
  const quentes = leads.filter(
    (l: any) => l.temperatura && l.temperatura.toLowerCase().includes("quente")
  );

  if (quentes.length === 0) return [];

  const byMotivo = new Map<string, number>();
  for (const l of quentes) {
    const motivo = l.loss_reason_name || "Sem motivo";
    byMotivo.set(motivo, (byMotivo.get(motivo) || 0) + 1);
  }

  return Array.from(byMotivo.entries())
    .map(([motivo, count]) => ({ motivo, count }))
    .sort((a, b) => b.count - a.count);
}

// ── Proposta Stats by Vendor (pipeline Teste Implantação) ───────────────────

export interface PropostaVendorStats {
  responsible_user_name: string;
  total: number;
  sem_proposta: number;
  com_proposta: number;
  pct_sem_proposta: number;
  pct_com_proposta: number;
  dentro_da_meta: boolean; // meta: <= 30% sem proposta
}

export interface PropostaStatsResult {
  total: number;
  sem_proposta: number;
  com_proposta: number;
  pct_sem_proposta: number;
  by_vendor: PropostaVendorStats[];
}

const SEM_PROPOSTA_STAGES = ["DESCOBERTA", "MOSTRAR MODELOS", "FORMA DE PAGAMENTO", "FILTRAGEM", "TRANSFERENCIA", "TRATAMENTO"];
const COM_PROPOSTA_STAGES = ["PROPOSTA", "OBJEÇOES", "OBJEÇÕES", "FECHAMENTO"];

export async function fetchPropostaStats(periodo: Periodo): Promise<PropostaStatsResult> {
  const range = getDateRange(periodo);

  let query = supabase
    .from("dashboard_leads")
    .select("responsible_user_name, status_name")
    .eq("pipeline_id", 13215396)
    .eq("is_active", true);

  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);

  const byVendor = new Map<string, { total: number; sem: number; com: number }>();

  for (const l of leads) {
    const vendor = l.responsible_user_name || "Sem responsável";
    if (!byVendor.has(vendor)) byVendor.set(vendor, { total: 0, sem: 0, com: 0 });
    const v = byVendor.get(vendor)!;
    v.total++;
    const stage = (l.status_name || "").toUpperCase();
    if (COM_PROPOSTA_STAGES.includes(stage)) {
      v.com++;
    } else if (SEM_PROPOSTA_STAGES.includes(stage)) {
      v.sem++;
    }
  }

  const totalAll = leads.length;
  const semAll = leads.filter((l: any) => SEM_PROPOSTA_STAGES.includes((l.status_name || "").toUpperCase())).length;
  const comAll = leads.filter((l: any) => COM_PROPOSTA_STAGES.includes((l.status_name || "").toUpperCase())).length;

  const vendors = Array.from(byVendor.entries())
    .map(([name, data]) => {
      const classified = data.sem + data.com;
      const pctSem = classified > 0 ? Number(((data.sem / classified) * 100).toFixed(1)) : 0;
      const pctCom = classified > 0 ? Number(((data.com / classified) * 100).toFixed(1)) : 0;
      return {
        responsible_user_name: name,
        total: data.total,
        sem_proposta: data.sem,
        com_proposta: data.com,
        pct_sem_proposta: pctSem,
        pct_com_proposta: pctCom,
        dentro_da_meta: pctSem <= 30,
      };
    })
    .sort((a, b) => b.total - a.total);

  const classifiedAll = semAll + comAll;

  return {
    total: totalAll,
    sem_proposta: semAll,
    com_proposta: comAll,
    pct_sem_proposta: classifiedAll > 0 ? Number(((semAll / classifiedAll) * 100).toFixed(1)) : 0,
    by_vendor: vendors,
  };
}

// ── SDR Stage Response Time (first stage duration) ──────────────────────────

export interface SDRStageResponseTime {
  stage_name: string;
  avg_hours: number;
  median_hours: number;
  sample_size: number;
}

export async function fetchSDRStageResponseTime(): Promise<SDRStageResponseTime | null> {
  // Get the duration of the first stage in the SDR pipeline (Ligar)
  // This represents the time from lead entering the SDR pipeline to first action
  const { data } = await supabase
    .from("dashboard_stage_durations")
    .select("status_name, avg_duration_hours, median_duration_hours, sample_size")
    .eq("pipeline_id", 11480160)
    .limit(10);

  if (!data || data.length === 0) return null;

  // Find the first stage (Ligar) or the one with shortest avg as proxy
  const firstStage = data.find((d: any) =>
    (d.status_name || "").toLowerCase() === "ligar"
  ) || data[0];

  return {
    stage_name: firstStage.status_name || "—",
    avg_hours: firstStage.avg_duration_hours,
    median_hours: firstStage.median_duration_hours,
    sample_size: firstStage.sample_size,
  };
}

// ── Vendor Stage Response Time (TRANSFERENCIA stage duration) ────────────────

export interface VendorStageResponseTime {
  stage_name: string;
  avg_hours: number;
  median_hours: number;
  sample_size: number;
}

export async function fetchVendorStageResponseTime(): Promise<VendorStageResponseTime | null> {
  // Get the duration of the TRANSFERENCIA stage in pipeline Teste Implantação
  // This represents time between transfer and vendor picking up the lead
  const { data } = await supabase
    .from("dashboard_stage_durations")
    .select("status_name, avg_duration_hours, median_duration_hours, sample_size")
    .eq("pipeline_id", 13215396)
    .limit(20);

  if (!data || data.length === 0) return null;

  const transferStage = data.find((d: any) =>
    (d.status_name || "").toUpperCase() === "TRANSFERENCIA"
  );

  if (!transferStage) return null;

  return {
    stage_name: transferStage.status_name || "TRANSFERENCIA",
    avg_hours: transferStage.avg_duration_hours,
    median_hours: transferStage.median_duration_hours,
    sample_size: transferStage.sample_size,
  };
}

// ── Temperatura by Canal ────────────────────────────────────────────────────

export interface TemperaturaByCanal {
  canal_venda: string;
  quente: number;
  medio: number;
  frio: number;
  total: number;
}

export async function fetchTemperaturaByCanal(
  periodo: Periodo
): Promise<TemperaturaByCanal[]> {
  const range = getDateRange(periodo);

  let query = supabase
    .from("dashboard_leads")
    .select("canal_venda, temperatura")
    .not("temperatura", "is", null);

  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);
  if (leads.length === 0) return [];

  const byCanal = new Map<string, { quente: number; medio: number; frio: number; total: number }>();
  for (const l of leads) {
    const canal = l.canal_venda || "Sem canal";
    if (!byCanal.has(canal)) byCanal.set(canal, { quente: 0, medio: 0, frio: 0, total: 0 });
    const c = byCanal.get(canal)!;
    c.total++;
    const t = (l.temperatura || "").toLowerCase();
    if (t.includes("quente")) c.quente++;
    else if (t.includes("frio")) c.frio++;
    else c.medio++;
  }

  return Array.from(byCanal.entries())
    .map(([canal, data]) => ({ canal_venda: canal, ...data }))
    .sort((a, b) => b.total - a.total);
}

// ── Leads Quentes by Vendor by Day ─────────────────────────────────────────

export interface LeadsQuentesByVendorDay {
  responsible_user_name: string;
  date: string;
  count: number;
}

export async function fetchLeadsQuentesByVendorByDay(
  periodo: Periodo
): Promise<LeadsQuentesByVendorDay[]> {
  const range = getDateRange(periodo);

  let query = supabase
    .from("dashboard_leads")
    .select("responsible_user_name, created_at, temperatura")
    .not("temperatura", "is", null);

  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);

  const quentes = leads.filter(
    (l: any) => l.temperatura && l.temperatura.toLowerCase().includes("quente")
  );

  if (quentes.length === 0) return [];

  const grouped = new Map<string, number>();
  for (const l of quentes) {
    const vendor = l.responsible_user_name || "Sem responsável";
    const date = l.created_at ? l.created_at.slice(0, 10) : "desconhecido";
    const key = `${vendor}|${date}`;
    grouped.set(key, (grouped.get(key) || 0) + 1);
  }

  return Array.from(grouped.entries())
    .map(([key, count]) => {
      const [responsible_user_name, date] = key.split("|");
      return { responsible_user_name, date, count };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.count - a.count);
}

// ── % Leads Quentes SDR Humano vs IA ───────────────────────────────────────

export interface QuentesByOrigin {
  origin: string;
  count: number;
  pct: number;
}

export async function fetchQuentesByOrigin(
  periodo: Periodo
): Promise<QuentesByOrigin[]> {
  const range = getDateRange(periodo);

  let query = supabase
    .from("dashboard_leads")
    .select("temperatura, pre_atendimento, origin_pipeline_id")
    .not("temperatura", "is", null);

  if (range) {
    query = query.gte("created_at", range.from).lte("created_at", range.to);
  }

  const leads = await fetchAllRows<any>(query);

  const quentes = leads.filter(
    (l: any) => l.temperatura && l.temperatura.toLowerCase().includes("quente")
  );

  if (quentes.length === 0) return [];

  let botCount = 0;
  let sdrCount = 0;
  let directCount = 0;

  for (const l of quentes) {
    const preAtend = (l.pre_atendimento || "").toLowerCase();
    if (preAtend.includes("bot") || preAtend.includes("ia") || preAtend.includes("automati")) {
      botCount++;
    } else if (l.origin_pipeline_id === 11480160) {
      sdrCount++;
    } else {
      directCount++;
    }
  }

  const total = quentes.length;
  return [
    { origin: "Bot / IA", count: botCount, pct: Number(((botCount / total) * 100).toFixed(1)) },
    { origin: "SDR Humano", count: sdrCount, pct: Number(((sdrCount / total) * 100).toFixed(1)) },
    { origin: "Direto", count: directCount, pct: Number(((directCount / total) * 100).toFixed(1)) },
  ].filter((o) => o.count > 0);
}

export async function fetchLastSync(): Promise<DashboardSyncLog | null> {
  const { data } = await supabase
    .from("dashboard_sync_log")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}
