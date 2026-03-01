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

function getDateRange(periodo: Periodo): { from: string; to: string } {
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
    default:
      return {
        from: format(subDays(now, 30), "yyyy-MM-dd") + "T00:00:00",
        to,
      };
  }
}

export async function fetchOverviewMetrics(
  periodo: Periodo
): Promise<DashboardMetrics | null> {
  // Busca TODOS os leads de TODOS os pipelines (sem filtro de data)
  // para calcular o total real e a taxa de conversão histórica
  const query = supabase
    .from("dashboard_leads")
    .select("is_won, is_lost, is_active, price");

  const leads = await fetchAllRows<any>(query);
  if (!leads || leads.length === 0) return null;

  const won = leads.filter((l) => l.is_won);
  const lost = leads.filter((l) => l.is_lost);
  const active = leads.filter((l) => l.is_active);

  return {
    metric_date: format(new Date(), "yyyy-MM-dd"),
    periodo: periodo,
    total_leads: leads.length,
    leads_won: won.length,
    leads_lost: lost.length,
    leads_active: active.length,
    // Conversão = vendas realizadas (FECHADO-GANHO) / total de leads (todos os pipelines)
    taxa_conversao_geral:
      leads.length > 0
        ? Number(((won.length / leads.length) * 100).toFixed(2))
        : null,
    ciclo_medio_dias: null,
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
  periodo: Periodo
): Promise<DashboardMetricsCanal[]> {
  const { from, to } = getDateRange(periodo);

  const query = supabase
    .from("dashboard_leads")
    .select("canal_venda, is_won, is_lost, price, ciclo_dias, qtd_followups")
    .gte("created_at", from)
    .lte("created_at", to);

  const leads = await fetchAllRows<any>(query);
  if (!leads) return [];

  const byCanal = new Map<string, CanalRow[]>();
  for (const lead of leads) {
    const canal = lead.canal_venda || "Sem canal";
    if (!byCanal.has(canal)) byCanal.set(canal, []);
    byCanal.get(canal)!.push({ ...lead, canal_venda: canal });
  }

  return Array.from(byCanal.entries()).map(([canal, cLeads]) => {
    const won = cLeads.filter((l) => l.is_won);
    const lost = cLeads.filter((l) => l.is_lost);
    const totalDecided = won.length + lost.length;
    const ciclos = won.filter((l) => l.ciclo_dias != null).map((l) => l.ciclo_dias!);

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
  const { from, to } = getDateRange(periodo);

  // Fetch ALL leads in the Vendedores pipeline (no date restriction)
  const allQuery = supabase
    .from("dashboard_leads")
    .select("responsible_user_id, responsible_user_name, is_won, is_lost, price, ciclo_dias, qtd_followups, tempo_primeiro_atendimento_min, created_at, closed_at")
    .eq("pipeline_id", 9968344);

  const leads = await fetchAllRows<any>(allQuery);
  if (!leads) return [];

  const byVendedor = new Map<number, VendedorRow[]>();
  for (const lead of leads) {
    if (!lead.responsible_user_id) continue;
    if (!byVendedor.has(lead.responsible_user_id))
      byVendedor.set(lead.responsible_user_id, []);
    byVendedor.get(lead.responsible_user_id)!.push(lead);
  }

  return Array.from(byVendedor.entries()).map(([userId, vLeads]) => {
    const wonTotal = vLeads.filter((l) => l.is_won);
    const lostTotal = vLeads.filter((l) => l.is_lost);
    const receita = wonTotal.reduce((a, l) => a + (l.price || 0), 0);
    const ciclos = wonTotal.filter((l) => l.ciclo_dias != null).map((l) => l.ciclo_dias!);

    // Taxa de conversão por VALOR: receita das vendas ganhas / valor total de todos os leads do vendedor
    // Se não houver valor monetário, usa contagem: vendas / (total leads + vendas)
    const valorTotalLeads = vLeads.reduce((a, l) => a + (l.price || 0), 0);
    const totalPool = vLeads.length + wonTotal.length; // soma os ganhos ao universo total
    const taxaConversaoValor = valorTotalLeads > 0
      ? Number(((receita / valorTotalLeads) * 100).toFixed(2))
      : totalPool > 0
        ? Number(((wonTotal.length / totalPool) * 100).toFixed(2))
        : null;

    const leadsNoPeriodo = vLeads.filter((l) =>
      l.created_at && l.created_at >= from && l.created_at <= to
    );
    const tempos = leadsNoPeriodo.filter((l) => l.tempo_primeiro_atendimento_min != null).map((l) => l.tempo_primeiro_atendimento_min!);

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
        leadsNoPeriodo.length > 0
          ? Number((leadsNoPeriodo.reduce((a, l) => a + (l.qtd_followups || 0), 0) / leadsNoPeriodo.length).toFixed(1))
          : null,
      tempo_medio_primeiro_atendimento_min:
        tempos.length > 0
          ? Number((tempos.reduce((a, b) => a + b, 0) / tempos.length).toFixed(1))
          : null,
      meta_mensal: 0,
      percentual_meta: 0,
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
    "TRANSFERÊNCIA",
    "PROPOSTA",
    "OBJEÇÕES",
    "FECHAMENTO"
  ]
};

export async function fetchFunilData(
  periodo: Periodo = "mes_atual",
  pipelineId?: number
): Promise<DashboardFunil[]> {
  const { from, to } = getDateRange(periodo);

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
    periodo: periodo,
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

  if (pipelineId === 9968344) {
    const total = result.reduce((a, b) => a + b.leads_atual, 0);
    const exact = new Map<string, number>();
    result.forEach(r => exact.set((r.status_name || "").toUpperCase(), r.leads_atual));

    result.forEach(r => {
      const name = (r.status_name || "").toUpperCase();
      const cInici = exact.get("CONTATO INICIAL") || 0;
      const eAtend = exact.get("EM ATENDIMENTO") || 0;
      const nQuent = exact.get("NEGOCIAÇÕES QUENTES") || 0;
      const reaq = exact.get("[★] REAQUECER") || 0;

      if (name === "CONTATO INICIAL") {
        r.leads_atual = total;
      } else if (name === "EM ATENDIMENTO") {
        r.leads_atual = total - cInici;
      } else if (name === "NEGOCIAÇÕES QUENTES") {
        r.leads_atual = total - cInici - eAtend;
      } else if (name === "[★] REAQUECER") {
        r.leads_atual = reaq;
      } else if (name === "ACOMPANHAMENTO") {
        r.leads_atual = total - cInici - eAtend - nQuent - reaq;
      }
    });

    // Re-calculate taxa_passagem baseada na ordem cumulativa após o ajuste:
    // This part ensures the UI still shows correct conversion percentages if needed.
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
  // Busca todos os leads perdidos de todos os pipelines (sem filtro de data)
  const query = supabase
    .from("dashboard_leads")
    .select("motivo_perda, canal_venda, responsible_user_name, pipeline_name")
    .eq("is_lost", true);

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
  periodo: Periodo = "mes_atual"
): Promise<DashboardMetricasIA[]> {
  const { from, to } = getDateRange(periodo);
  const dateFrom = from.slice(0, 10);
  const dateTo = to.slice(0, 10);

  const { data } = await supabase
    .from("dashboard_metricas_ia")
    .select("*")
    .gte("metric_date", dateFrom)
    .lte("metric_date", dateTo)
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

export async function fetchLeadsPerdidos(periodo: Periodo = "mes_atual"): Promise<number> {
  const { from, to } = getDateRange(periodo);
  const { count } = await supabase
    .from("chats")
    .select("*", { count: "exact", head: true })
    .gte("created_at", from)
    .lte("created_at", to)
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

  // Aplica lógica cumulativa para pipeline Vendedores (9968344)
  if (bestPipelineId === 9968344) {
    const total = result.reduce((a, b) => a + b.leads_atual, 0);
    const exact = new Map<string, number>();
    result.forEach(r => exact.set((r.status_name || "").toUpperCase(), r.leads_atual));

    result.forEach(r => {
      const name = (r.status_name || "").toUpperCase();
      const cInici = exact.get("CONTATO INICIAL") || 0;
      const eAtend = exact.get("EM ATENDIMENTO") || 0;
      const nQuent = exact.get("NEGOCIAÇÕES QUENTES") || 0;
      const reaq = exact.get("[★] REAQUECER") || 0;

      if (name === "CONTATO INICIAL") {
        r.leads_atual = total;
      } else if (name === "EM ATENDIMENTO") {
        r.leads_atual = total - cInici;
      } else if (name === "NEGOCIAÇÕES QUENTES") {
        r.leads_atual = total - cInici - eAtend;
      } else if (name === "[★] REAQUECER") {
        r.leads_atual = reaq;
      } else if (name === "ACOMPANHAMENTO") {
        r.leads_atual = total - cInici - eAtend - nQuent - reaq;
      }
      // FECHADO-GANHO e FECHADO-PERDIDO mantêm o valor exato
    });
  }

  return result;
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
