import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateInsights } from "@/lib/openai";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: metricsRow } = await supabaseAdmin
      .from("dashboard_metrics")
      .select("*")
      .eq("periodo", "mensal")
      .order("metric_date", { ascending: false })
      .limit(1)
      .single();

    const { data: canais } = await supabaseAdmin
      .from("dashboard_metrics_canal")
      .select("*")
      .eq("periodo", "mensal")
      .order("metric_date", { ascending: false })
      .limit(20);

    const { data: vendedores } = await supabaseAdmin
      .from("dashboard_metrics_vendedor")
      .select("*")
      .eq("periodo", "mensal")
      .order("metric_date", { ascending: false })
      .limit(20);

    const { data: perdas } = await supabaseAdmin
      .from("dashboard_perdas")
      .select("*")
      .eq("periodo", "mensal")
      .order("quantidade", { ascending: false })
      .limit(30);

    const latestCanalDate = canais?.[0]?.metric_date;
    const latestVendedorDate = vendedores?.[0]?.metric_date;
    const latestPerdaDate = perdas?.[0]?.metric_date;

    const insights = await generateInsights({
      total_leads: metricsRow?.total_leads ?? 0,
      leads_won: metricsRow?.leads_won ?? 0,
      leads_lost: metricsRow?.leads_lost ?? 0,
      taxa_conversao: metricsRow?.taxa_conversao_geral ?? null,
      ciclo_medio_dias: metricsRow?.ciclo_medio_dias ?? null,
      ticket_medio: metricsRow?.ticket_medio ?? null,
      receita_total: metricsRow?.receita_total ?? null,
      canais: (canais || [])
        .filter((c) => c.metric_date === latestCanalDate)
        .map((c) => ({
          canal: c.canal_venda,
          leads: c.total_leads,
          won: c.leads_won,
          conversao: c.taxa_conversao,
          ticket: c.ticket_medio,
        })),
      vendedores: (vendedores || [])
        .filter((v) => v.metric_date === latestVendedorDate)
        .map((v) => ({
          nome: v.responsible_user_name || `ID ${v.responsible_user_id}`,
          leads: v.total_leads,
          won: v.leads_won,
          conversao: v.taxa_conversao,
          ticket: v.ticket_medio,
          receita: v.receita_total,
        })),
      perdas: (perdas || [])
        .filter((p) => p.metric_date === latestPerdaDate)
        .map((p) => ({
          motivo: p.motivo_perda || "Sem motivo",
          quantidade: p.quantidade,
          canal: p.canal_venda,
        })),
    });

    return NextResponse.json({ success: true, insights });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[insights] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
