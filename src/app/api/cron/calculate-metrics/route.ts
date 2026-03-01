import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { format, startOfMonth, startOfWeek, subDays } from "date-fns";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(today), "yyyy-MM-dd");

    await Promise.all([
      calculateGeneralMetrics(todayStr, "diario", todayStr, todayStr),
      calculateGeneralMetrics(todayStr, "semanal", weekStart, todayStr),
      calculateGeneralMetrics(todayStr, "mensal", monthStart, todayStr),
    ]);

    await Promise.all([
      calculateCanalMetrics(todayStr, "diario", todayStr, todayStr),
      calculateCanalMetrics(todayStr, "semanal", weekStart, todayStr),
      calculateCanalMetrics(todayStr, "mensal", monthStart, todayStr),
    ]);

    await Promise.all([
      calculateVendedorMetrics(todayStr, "mensal", monthStart, todayStr),
    ]);

    await calculateFunilMetrics(todayStr, "diario");

    await calculatePerdasMetrics(todayStr, "mensal", monthStart, todayStr);

    // Historical: last 30 days daily
    for (let i = 1; i <= 30; i++) {
      const date = subDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      await calculateGeneralMetrics(dateStr, "diario", dateStr, dateStr);
    }

    return NextResponse.json({ success: true, calculated_at: todayStr });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[calculate-metrics] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

async function calculateGeneralMetrics(
  metricDate: string,
  periodo: string,
  dateFrom: string,
  dateTo: string
) {
  const { data: leads } = await supabaseAdmin
    .from("dashboard_leads")
    .select("*")
    .gte("created_at", `${dateFrom}T00:00:00`)
    .lte("created_at", `${dateTo}T23:59:59`);

  if (!leads) return;

  const won = leads.filter((l) => l.is_won);
  const lost = leads.filter((l) => l.is_lost);
  const active = leads.filter((l) => l.is_active);

  const totalDecided = won.length + lost.length;
  const taxaConversao =
    totalDecided > 0
      ? Number(((won.length / totalDecided) * 100).toFixed(2))
      : null;

  const ciclosValidos = won
    .filter((l) => l.ciclo_dias != null)
    .map((l) => l.ciclo_dias);
  const cicloMedio =
    ciclosValidos.length > 0
      ? Number(
          (
            ciclosValidos.reduce((a: number, b: number) => a + b, 0) /
            ciclosValidos.length
          ).toFixed(1)
        )
      : null;

  const ticketMedio =
    won.length > 0
      ? Number(
          (
            won.reduce((a: number, l) => a + (l.price || 0), 0) / won.length
          ).toFixed(2)
        )
      : null;

  const receitaTotal = won.reduce((a: number, l) => a + (l.price || 0), 0);

  const temposAtendimento = leads
    .filter((l) => l.tempo_primeiro_atendimento_min != null)
    .map((l) => l.tempo_primeiro_atendimento_min);
  const tempoMedio =
    temposAtendimento.length > 0
      ? Number(
          (
            temposAtendimento.reduce((a: number, b: number) => a + b, 0) /
            temposAtendimento.length
          ).toFixed(1)
        )
      : null;

  const followupsTotal = leads.reduce(
    (a: number, l) => a + (l.qtd_followups || 0),
    0
  );
  const followupsMedio =
    leads.length > 0
      ? Number((followupsTotal / leads.length).toFixed(1))
      : null;

  await supabaseAdmin.from("dashboard_metrics").upsert(
    {
      metric_date: metricDate,
      periodo,
      total_leads: leads.length,
      leads_won: won.length,
      leads_lost: lost.length,
      leads_active: active.length,
      taxa_conversao_geral: taxaConversao,
      ciclo_medio_dias: cicloMedio,
      ticket_medio: ticketMedio,
      receita_total: receitaTotal,
      tempo_medio_primeiro_atendimento_min: tempoMedio,
      followups_medio_por_lead: followupsMedio,
      calculated_at: new Date().toISOString(),
    },
    { onConflict: "metric_date,periodo" }
  );
}

async function calculateCanalMetrics(
  metricDate: string,
  periodo: string,
  dateFrom: string,
  dateTo: string
) {
  const { data: leads } = await supabaseAdmin
    .from("dashboard_leads")
    .select("*")
    .gte("created_at", `${dateFrom}T00:00:00`)
    .lte("created_at", `${dateTo}T23:59:59`);

  if (!leads) return;

  const byCanal = new Map<string, typeof leads>();
  for (const lead of leads) {
    const canal = lead.canal_venda || "Sem canal";
    if (!byCanal.has(canal)) byCanal.set(canal, []);
    byCanal.get(canal)!.push(lead);
  }

  const rows = Array.from(byCanal.entries()).map(([canal, canalLeads]) => {
    const won = canalLeads.filter((l) => l.is_won);
    const lost = canalLeads.filter((l) => l.is_lost);
    const totalDecided = won.length + lost.length;

    const ciclosValidos = won
      .filter((l) => l.ciclo_dias != null)
      .map((l) => l.ciclo_dias);

    return {
      metric_date: metricDate,
      periodo,
      canal_venda: canal,
      total_leads: canalLeads.length,
      leads_won: won.length,
      leads_lost: lost.length,
      taxa_conversao:
        totalDecided > 0
          ? Number(((won.length / totalDecided) * 100).toFixed(2))
          : null,
      ciclo_medio_dias:
        ciclosValidos.length > 0
          ? Number(
              (
                ciclosValidos.reduce((a: number, b: number) => a + b, 0) /
                ciclosValidos.length
              ).toFixed(1)
            )
          : null,
      ticket_medio:
        won.length > 0
          ? Number(
              (
                won.reduce((a: number, l) => a + (l.price || 0), 0) /
                won.length
              ).toFixed(2)
            )
          : null,
      followups_medio:
        canalLeads.length > 0
          ? Number(
              (
                canalLeads.reduce(
                  (a: number, l) => a + (l.qtd_followups || 0),
                  0
                ) / canalLeads.length
              ).toFixed(1)
            )
          : null,
      calculated_at: new Date().toISOString(),
    };
  });

  for (const row of rows) {
    await supabaseAdmin
      .from("dashboard_metrics_canal")
      .upsert(row, { onConflict: "metric_date,periodo,canal_venda" });
  }
}

async function calculateVendedorMetrics(
  metricDate: string,
  periodo: string,
  dateFrom: string,
  dateTo: string
) {
  const { data: leads } = await supabaseAdmin
    .from("dashboard_leads")
    .select("*")
    .gte("created_at", `${dateFrom}T00:00:00`)
    .lte("created_at", `${dateTo}T23:59:59`);

  if (!leads) return;

  const { data: metas } = await supabaseAdmin
    .from("dashboard_metas")
    .select("*")
    .eq("mes_referencia", dateFrom);

  const metasMap = new Map<number, { meta_quantidade: number; meta_receita: number }>();
  if (metas) {
    for (const m of metas) {
      metasMap.set(m.responsible_user_id, {
        meta_quantidade: m.meta_quantidade,
        meta_receita: m.meta_receita,
      });
    }
  }

  const byVendedor = new Map<number, typeof leads>();
  for (const lead of leads) {
    if (!lead.responsible_user_id) continue;
    if (!byVendedor.has(lead.responsible_user_id))
      byVendedor.set(lead.responsible_user_id, []);
    byVendedor.get(lead.responsible_user_id)!.push(lead);
  }

  const rows = Array.from(byVendedor.entries()).map(([userId, vLeads]) => {
    const won = vLeads.filter((l) => l.is_won);
    const lost = vLeads.filter((l) => l.is_lost);
    const totalDecided = won.length + lost.length;
    const receita = won.reduce((a: number, l) => a + (l.price || 0), 0);
    const meta = metasMap.get(userId);

    const ciclosValidos = won
      .filter((l) => l.ciclo_dias != null)
      .map((l) => l.ciclo_dias);

    const tempos = vLeads
      .filter((l) => l.tempo_primeiro_atendimento_min != null)
      .map((l) => l.tempo_primeiro_atendimento_min);

    return {
      metric_date: metricDate,
      periodo,
      responsible_user_id: userId,
      responsible_user_name: vLeads[0]?.responsible_user_name || null,
      total_leads: vLeads.length,
      leads_won: won.length,
      leads_lost: lost.length,
      taxa_conversao:
        totalDecided > 0
          ? Number(((won.length / totalDecided) * 100).toFixed(2))
          : null,
      ciclo_medio_dias:
        ciclosValidos.length > 0
          ? Number(
              (
                ciclosValidos.reduce((a: number, b: number) => a + b, 0) /
                ciclosValidos.length
              ).toFixed(1)
            )
          : null,
      ticket_medio:
        won.length > 0
          ? Number((receita / won.length).toFixed(2))
          : null,
      receita_total: receita,
      followups_medio:
        vLeads.length > 0
          ? Number(
              (
                vLeads.reduce(
                  (a: number, l) => a + (l.qtd_followups || 0),
                  0
                ) / vLeads.length
              ).toFixed(1)
            )
          : null,
      tempo_medio_primeiro_atendimento_min:
        tempos.length > 0
          ? Number(
              (
                tempos.reduce((a: number, b: number) => a + b, 0) /
                tempos.length
              ).toFixed(1)
            )
          : null,
      meta_mensal: meta?.meta_receita || 0,
      percentual_meta:
        meta?.meta_receita && meta.meta_receita > 0
          ? Number(((receita / meta.meta_receita) * 100).toFixed(2))
          : 0,
      calculated_at: new Date().toISOString(),
    };
  });

  for (const row of rows) {
    await supabaseAdmin
      .from("dashboard_metrics_vendedor")
      .upsert(row, {
        onConflict: "metric_date,periodo,responsible_user_id",
      });
  }
}

async function calculateFunilMetrics(metricDate: string, periodo: string) {
  const { data: leads } = await supabaseAdmin
    .from("dashboard_leads")
    .select("pipeline_id, pipeline_name, status_id, status_name, is_active");

  if (!leads) return;

  const stageMap = new Map<
    string,
    {
      pipeline_id: number;
      pipeline_name: string;
      status_id: number;
      status_name: string;
      count: number;
    }
  >();

  for (const lead of leads) {
    if (!lead.is_active) continue;
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

  const rows = Array.from(stageMap.values()).map((stage) => ({
    metric_date: metricDate,
    periodo,
    pipeline_id: stage.pipeline_id,
    pipeline_name: stage.pipeline_name,
    status_id: stage.status_id,
    status_name: stage.status_name,
    stage_order: 0,
    leads_entrou: 0,
    leads_saiu: 0,
    leads_atual: stage.count,
    taxa_passagem: null,
    calculated_at: new Date().toISOString(),
  }));

  for (const row of rows) {
    await supabaseAdmin.from("dashboard_funil").upsert(row, {
      onConflict: "metric_date,periodo,pipeline_id,status_id",
    });
  }
}

async function calculatePerdasMetrics(
  metricDate: string,
  periodo: string,
  dateFrom: string,
  dateTo: string
) {
  const { data: leads } = await supabaseAdmin
    .from("dashboard_leads")
    .select("*")
    .eq("is_lost", true)
    .gte("closed_at", `${dateFrom}T00:00:00`)
    .lte("closed_at", `${dateTo}T23:59:59`);

  if (!leads || leads.length === 0) return;

  const total = leads.length;
  const grouped = new Map<
    string,
    { motivo: string; canal: string; responsavel: string; count: number }
  >();

  for (const lead of leads) {
    const motivo = lead.motivo_perda || "Sem motivo";
    const canal = lead.canal_venda || "Sem canal";
    const responsavel = lead.responsible_user_name || "Sem responsável";
    const key = `${motivo}|${canal}|${responsavel}`;

    if (!grouped.has(key)) {
      grouped.set(key, { motivo, canal, responsavel, count: 0 });
    }
    grouped.get(key)!.count++;
  }

  const rows = Array.from(grouped.values()).map((g) => ({
    metric_date: metricDate,
    periodo,
    motivo_perda: g.motivo,
    canal_venda: g.canal,
    responsible_user_name: g.responsavel,
    quantidade: g.count,
    percentual_do_total: Number(((g.count / total) * 100).toFixed(2)),
    calculated_at: new Date().toISOString(),
  }));

  // Clear old data for this period then insert
  await supabaseAdmin
    .from("dashboard_perdas")
    .delete()
    .eq("metric_date", metricDate)
    .eq("periodo", periodo);

  if (rows.length > 0) {
    await supabaseAdmin.from("dashboard_perdas").insert(rows);
  }
}
