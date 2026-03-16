"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useIAMetrics, useIAResponseTimes, useLeadsPerdidos, useSDRMetrics, useSDRResponseTimeStats, useSDRConversionStats, useBotConversionRate, useHumanoVsTransferido, useSDRStageResponseTime, useVendorStageResponseTime } from "@/hooks/useMetrics";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import InfoTooltip from "@/components/ui/InfoTooltip";

const PANEL_BG = "#1F2937";

/** Mini sparkline shown at the bottom of each KPI card */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <defs>
          <linearGradient id={`fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.15} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      </LineChart>
    </ResponsiveContainer>
  );
}

function KPICardIA({
  label,
  value,
  unit,
  sparkData,
  sparkColor,
  loading,
  tooltip,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sparkData: number[];
  sparkColor: string;
  loading?: boolean;
  tooltip?: string;
}) {
  if (loading) {
    return (
      <article className="rounded-xl border border-gray-700 p-5 animate-pulse" style={{ backgroundColor: PANEL_BG }}>
        <div className="h-4 w-32 rounded bg-gray-700 mb-3" />
        <div className="h-10 w-20 rounded bg-gray-700 mb-4" />
        <div className="h-10 w-full rounded bg-gray-700" />
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-gray-700 p-5 relative overflow-hidden" style={{ backgroundColor: PANEL_BG }}>
      <h3 className="text-gray-400 text-sm font-medium mb-2 flex items-center gap-1.5">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </h3>
      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-4xl font-bold text-white">{value}</span>
        {unit && <span className="text-xl font-normal text-gray-500">{unit}</span>}
      </div>
      <div className="h-10 w-full">
        <Sparkline data={sparkData} color={sparkColor} />
      </div>
    </article>
  );
}

const TABS = [
  { id: "ia", label: "IA" },
  { id: "sdr", label: "SDR — Eryck" },
] as const;
type Tab = typeof TABS[number]["id"];

export default function IAPage() {
  const [activeTab, setActiveTab] = useState<Tab>("ia");
  const { periodo } = useDateFilter();
  const { data: iaData, isLoading } = useIAMetrics(periodo);
  const { data: responseTimes } = useIAResponseTimes();
  const { data: totalPerdidos = 0 } = useLeadsPerdidos(periodo);
  const { data: sdr, isLoading: sdrLoading } = useSDRMetrics(periodo);
  const { data: sdrResponseTime } = useSDRResponseTimeStats();
  const { data: sdrConversion } = useSDRConversionStats(periodo);
  const { data: botConversion } = useBotConversionRate(periodo);
  const { data: humanoVsTransf } = useHumanoVsTransferido(periodo);
  const { data: sdrStageRT } = useSDRStageResponseTime();
  const { data: vendorStageRT } = useVendorStageResponseTime();

  const totalConversas = (iaData || []).reduce((s, d) => s + (d.total_conversas ?? 0), 0);
  const totalFinalizadas = (iaData || []).reduce((s, d) => s + (d.conversas_finalizadas ?? 0), 0);
  const totalFup1 = (iaData || []).reduce((s, d) => s + (d.fup_nivel_1_enviados ?? 0), 0);
  const totalFup2 = (iaData || []).reduce((s, d) => s + (d.fup_nivel_2_enviados ?? 0), 0);
  const totalFup3 = (iaData || []).reduce((s, d) => s + (d.fup_nivel_3_enviados ?? 0), 0);
  const taxaHandoff =
    totalConversas > 0
      ? Number(((totalFinalizadas / totalConversas) * 100).toFixed(2))
      : null;

  const hasAnyData = totalConversas > 0 || totalFup1 > 0;

  // Sparkline data from daily history
  const dailyConversas = (iaData || []).slice().reverse().map((d) => d.total_conversas ?? 0);
  const dailyFinalizadas = (iaData || []).slice().reverse().map((d) => d.conversas_finalizadas ?? 0);
  // Fallback stub sparklines when no data
  const stubSpark = [5, 8, 6, 10, 9, 12, 10, 11, 13, 12];

  const historyData = (iaData || [])
    .slice()
    .reverse()
    .map((d) => ({
      date: new Date(d.metric_date + "T12:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      conversas: d.total_conversas ?? 0,
      finalizadas: d.conversas_finalizadas ?? 0,
    }));

  const fupData = [
    { nivel: "FUP 1", enviados: totalFup1 },
    { nivel: "FUP 2", enviados: totalFup2 },
    { nivel: "FUP 3", enviados: totalFup3 },
    { nivel: "Perdidos", enviados: totalPerdidos },
  ];
  const FUP_COLORS = ["#3b82f6", "#3b82f6", "#8b5cf6", "#ef4444"];

  return (
    <div className="flex flex-col h-full">
      <Header
        title="IA / SDR"
        subtitle="Atendimento automatizado e performance do SDR"
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 pb-12 space-y-6">

        {/* Tab selector */}
        <div className="flex gap-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-all ${
                activeTab === tab.id
                  ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)] border border-white/10"
                  : "bg-transparent text-gray-400 hover:text-white border border-white/10 hover:border-white/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* IA tab */}
        {activeTab === "ia" && <>

        {/* No-data warning */}
        {!isLoading && !hasAnyData && (
          <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 p-4 text-sm text-amber-200">
            <p className="font-medium">Nenhum dado de IA/Bot no período selecionado.</p>
            <p className="mt-1 text-amber-300/90">
              As métricas vêm das tabelas{" "}
              <code className="rounded bg-amber-900/50 px-1">chats</code> e{" "}
              <code className="rounded bg-amber-900/50 px-1">chat_messages</code> no Supabase.
            </p>
          </div>
        )}

        {/* KPI Cards — each with sparkline at bottom */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICardIA
            label="Total Conversas"
            value={totalConversas}
            sparkData={dailyConversas.length > 0 ? dailyConversas : stubSpark}
            sparkColor="#3b82f6"
            loading={isLoading}
            tooltip="Quantidade total de conversas iniciadas pelo bot no período."
          />
          <KPICardIA
            label="Transferidos p/ Vendedor"
            value={totalFinalizadas}
            sparkData={dailyFinalizadas.length > 0 ? dailyFinalizadas : stubSpark}
            sparkColor="#10b981"
            loading={isLoading}
            tooltip="Conversas finalizadas pelo bot e encaminhadas para um vendedor."
          />
          <KPICardIA
            label="Tempo Médio Resposta"
            value={responseTimes?.bot_seg != null ? responseTimes.bot_seg : "—"}
            unit="seg"
            sparkData={stubSpark}
            sparkColor="#3b82f6"
            loading={isLoading}
            tooltip="Tempo médio que o bot leva para responder, em segundos."
          />
          <KPICardIA
            label="Taxa de Conversão IA"
            value={taxaHandoff != null ? taxaHandoff : "—"}
            unit="%"
            sparkData={dailyFinalizadas.length > 0 ? dailyFinalizadas : stubSpark}
            sparkColor="#10b981"
            loading={isLoading}
            tooltip="Conversas transferidas ÷ total de conversas × 100."
          />
        </section>

        {/* Charts — 3-col layout */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Area chart: Conversas por Dia (col-span-2) */}
          <div
            className="lg:col-span-2 rounded-xl p-6 border border-gray-700"
            style={{ backgroundColor: PANEL_BG }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Conversas por Dia</h3>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> Total Conversas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Transferidos
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="gradConversas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradTransferidos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(55,65,81,0.2)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={45}
                />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(17,24,39,0.9)",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="conversas"
                  name="Total Conversas"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#gradConversas)"
                  dot={{ r: 3, fill: "#3b82f6" }}
                />
                <Area
                  type="monotone"
                  dataKey="finalizadas"
                  name="Transferidos"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gradTransferidos)"
                  dot={{ r: 3, fill: "#10b981" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart: Follow-ups por Nível */}
          <div
            className="rounded-xl p-6 border border-gray-700"
            style={{ backgroundColor: PANEL_BG }}
          >
            <h3 className="font-semibold text-white mb-4">Follow-ups por Nível</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fupData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(55,65,81,0.2)" />
                <XAxis dataKey="nivel" tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    backgroundColor: "rgba(17,24,39,0.9)",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="enviados" name="Enviados" radius={[6, 6, 0, 0]}>
                  {fupData.map((_, i) => (
                    <Cell key={i} fill={FUP_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Bot Conversion + Humano vs Transferido */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* C1: Taxa Conversão Bot */}
          <div className="rounded-xl border border-white/5 p-5" style={{ backgroundColor: PANEL_BG }}>
            <div className="flex items-center gap-1.5 mb-4">
              <h3 className="text-sm font-semibold text-white">Taxa de Conversão do Bot</h3>
              <InfoTooltip text="Leads originados via Bot (canal_venda ou pre_atendimento contém 'bot'). Taxa = ganhos ÷ (ganhos + perdidos)." />
            </div>
            {botConversion ? (
              <div>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 mb-1">Total Bot</p>
                    <span className="text-xl font-bold text-white">{botConversion.total_bot_leads}</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 mb-1">Ganhos</p>
                    <span className="text-xl font-bold text-green-400">{botConversion.bot_won}</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 mb-1">Perdidos</p>
                    <span className="text-xl font-bold text-red-400">{botConversion.bot_lost}</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 mb-1">Conversão</p>
                    <span className={`text-xl font-bold ${botConversion.taxa_conversao >= 20 ? "text-green-400" : botConversion.taxa_conversao >= 10 ? "text-yellow-400" : "text-red-400"}`}>
                      {botConversion.taxa_conversao}%
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-600">
                  {botConversion.bot_active} leads ainda ativos
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">
                Sem leads identificados como Bot no período.
              </p>
            )}
          </div>

          {/* C2: Humano vs Transferido */}
          <div className="rounded-xl border border-white/5 p-5" style={{ backgroundColor: PANEL_BG }}>
            <div className="flex items-center gap-1.5 mb-4">
              <h3 className="text-sm font-semibold text-white">Direto vs Transferido</h3>
              <InfoTooltip text="Compara leads que entraram direto no pipeline (origin_pipeline_id = null) vs leads transferidos de outro pipeline (ex: SDR → Vendas)." />
            </div>
            {humanoVsTransf ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Direto */}
                <div className="rounded-lg border border-blue-500/20 p-4 text-center" style={{ backgroundColor: "rgba(59,130,246,0.05)" }}>
                  <p className="text-[10px] text-blue-400 uppercase tracking-widest mb-2">Direto</p>
                  <p className="text-2xl font-bold text-white">{humanoVsTransf.direto.total}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {humanoVsTransf.direto.won} ganhos · {humanoVsTransf.direto.lost} perdidos
                  </p>
                  <p className={`text-lg font-bold mt-2 ${humanoVsTransf.direto.taxa >= 20 ? "text-green-400" : humanoVsTransf.direto.taxa >= 10 ? "text-yellow-400" : "text-red-400"}`}>
                    {humanoVsTransf.direto.taxa}%
                  </p>
                  <p className="text-[10px] text-gray-600">taxa conversão</p>
                </div>
                {/* Transferido */}
                <div className="rounded-lg border border-purple-500/20 p-4 text-center" style={{ backgroundColor: "rgba(139,92,246,0.05)" }}>
                  <p className="text-[10px] text-purple-400 uppercase tracking-widest mb-2">Transferido</p>
                  <p className="text-2xl font-bold text-white">{humanoVsTransf.transferido.total}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {humanoVsTransf.transferido.won} ganhos · {humanoVsTransf.transferido.lost} perdidos
                  </p>
                  <p className={`text-lg font-bold mt-2 ${humanoVsTransf.transferido.taxa >= 20 ? "text-green-400" : humanoVsTransf.transferido.taxa >= 10 ? "text-yellow-400" : "text-red-400"}`}>
                    {humanoVsTransf.transferido.taxa}%
                  </p>
                  <p className="text-[10px] text-gray-600">taxa conversão</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">
                Sem dados de comparativo no período.
              </p>
            )}
          </div>
        </section>
        </>}

        {/* SDR tab */}
        {activeTab === "sdr" && <div className="space-y-6">

          {/* KPI cards */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICardIA
              label="Total Leads"
              value={sdr?.total_leads ?? 0}
              sparkData={stubSpark}
              sparkColor="#a855f7"
              loading={sdrLoading}
              tooltip="Total de leads recebidos pelo SDR Eryck no período selecionado."
            />
            <KPICardIA
              label="Leads Ativos"
              value={sdr?.leads_ativos ?? 0}
              sparkData={stubSpark}
              sparkColor="#3b82f6"
              loading={sdrLoading}
              tooltip="Leads ainda em tratamento no pipeline do Eryck."
            />
            <KPICardIA
              label="Encerrados"
              value={sdr?.leads_encerrados ?? 0}
              sparkData={stubSpark}
              sparkColor="#ef4444"
              loading={sdrLoading}
              tooltip="Leads encerrados (não qualificados ou fechados)."
            />
            <KPICardIA
              label="Taxa Encerramento"
              value={sdr?.taxa_encerramento ?? 0}
              unit="%"
              sparkData={stubSpark}
              sparkColor="#f59e0b"
              loading={sdrLoading}
              tooltip="% de leads encerrados sobre o total recebido."
            />
          </section>

          {/* Stage funnel + ciclo info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Funil por etapa */}
            <div className="rounded-xl border border-white/5 p-5" style={{ backgroundColor: PANEL_BG }}>
              <h3 className="text-sm font-semibold text-white mb-4">Funil — Rastro por Etapa</h3>
              {sdrLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-8 rounded animate-pulse bg-gray-700" />)}
                </div>
              ) : (sdr?.por_etapa || []).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Sem leads ativos no período</p>
              ) : (
                <div className="space-y-3">
                  {(sdr?.por_etapa || []).map((s) => (
                    <div key={s.stage}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300 capitalize">{s.stage}</span>
                        <span className="text-gray-400 font-mono">{s.count} <span className="text-gray-600">({s.pct}%)</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(s.pct, 2)}%`,
                            background: "linear-gradient(90deg, #a855f7, #7c3aed)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info cards */}
            <div className="space-y-4">
              {/* Ciclo médio */}
              <div className="rounded-xl border border-white/5 p-5" style={{ backgroundColor: PANEL_BG }}>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Ciclo Médio de Encerramento</p>
                {sdrLoading ? (
                  <div className="h-10 w-32 rounded animate-pulse bg-gray-700" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white">
                      {sdr?.ciclo_medio_h != null
                        ? sdr.ciclo_medio_h < 24
                          ? sdr.ciclo_medio_h.toFixed(1)
                          : (sdr.ciclo_medio_h / 24).toFixed(1)
                        : "—"}
                    </span>
                    <span className="text-xl text-gray-500">
                      {sdr?.ciclo_medio_h != null ? (sdr.ciclo_medio_h < 24 ? "h" : "d") : ""}
                    </span>
                    <span className="text-xs text-gray-600 ml-2">tempo médio até encerramento</span>
                  </div>
                )}
              </div>

              {/* Insight tempo de resposta (dynamic) */}
              <div className="rounded-xl border border-purple-500/20 p-5" style={{ backgroundColor: "rgba(139,92,246,0.06)" }}>
                <div className="flex items-center gap-1.5 mb-3">
                  <p className="text-xs text-purple-400 uppercase tracking-widest font-semibold">Tempo de Resposta</p>
                  <InfoTooltip text="Tempo entre a criacao do lead e o primeiro contato do Eryck. Calculado com base nos leads fechados do pipeline SDR." />
                </div>
                {sdrResponseTime && sdrResponseTime.sample_size > 0 ? (
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-gray-300">Tempo mediano</span>
                        <p className="text-[11px] text-gray-500">Metade dos leads sao respondidos antes desse tempo</p>
                      </div>
                      <span className="text-white font-mono font-bold text-base ml-4 shrink-0">
                        {sdrResponseTime.mediana_h != null
                          ? sdrResponseTime.mediana_h < 24
                            ? `${sdrResponseTime.mediana_h}h`
                            : `${(sdrResponseTime.mediana_h / 24).toFixed(1)}d`
                          : "—"}
                      </span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-gray-300">Respondidos em &lt; 5 min</span>
                        <p className="text-[11px] text-gray-500">Atendimento imediato</p>
                      </div>
                      <span className="text-green-400 font-mono font-bold text-base ml-4 shrink-0">
                        {sdrResponseTime.pct_under_5min != null ? `${sdrResponseTime.pct_under_5min}%` : "—"}
                      </span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-gray-300">Demora acima de 24h</span>
                        <p className="text-[11px] text-gray-500">Leads com alto risco de esfriamento</p>
                      </div>
                      <span className="text-red-400 font-mono font-bold text-base ml-4 shrink-0">
                        {sdrResponseTime.pct_over_24h != null ? `${sdrResponseTime.pct_over_24h}%` : "—"}
                      </span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-gray-300">P90 (percentil 90)</span>
                        <p className="text-[11px] text-gray-500">90% dos leads sao respondidos ate esse prazo</p>
                      </div>
                      <span className="text-yellow-400 font-mono font-bold text-base ml-4 shrink-0">
                        {sdrResponseTime.p90_h != null
                          ? sdrResponseTime.p90_h < 24
                            ? `${sdrResponseTime.p90_h}h`
                            : `${(sdrResponseTime.p90_h / 24).toFixed(1)} dias`
                          : "—"}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-3">Amostra: {sdrResponseTime.sample_size} leads</p>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 py-4 text-center">
                    <p>Sem dados de tempo de resposta.</p>
                    <p className="text-[10px] mt-1 text-gray-600">O campo tempo_primeiro_atendimento_min precisa ser populado no sync.</p>
                  </div>
                )}
              </div>

              {/* Tempo de Resposta por Marco de Etapa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SDR: Tempo na etapa "Ligar" */}
                {sdrStageRT && (
                  <div className="rounded-xl border border-purple-500/20 p-4" style={{ backgroundColor: "rgba(139,92,246,0.06)" }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <p className="text-[10px] text-purple-400 uppercase tracking-widest font-semibold">Tempo SDR — Etapa "{sdrStageRT.stage_name}"</p>
                      <InfoTooltip text="Tempo que o lead permanece na primeira etapa do pipeline SDR antes de ser avançado. Representa a velocidade do primeiro contato do SDR." />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold" style={{ color: sdrStageRT.median_hours <= 1 ? "#4ade80" : sdrStageRT.median_hours <= 4 ? "#fbbf24" : "#f87171" }}>
                        {sdrStageRT.median_hours < 1
                          ? `${Math.round(sdrStageRT.median_hours * 60)}`
                          : sdrStageRT.median_hours < 24
                          ? sdrStageRT.median_hours.toFixed(1)
                          : (sdrStageRT.median_hours / 24).toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {sdrStageRT.median_hours < 1 ? "min" : sdrStageRT.median_hours < 24 ? "h" : "d"} (mediana)
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">
                      Média: {sdrStageRT.avg_hours < 1 ? `${Math.round(sdrStageRT.avg_hours * 60)}min` : sdrStageRT.avg_hours < 24 ? `${sdrStageRT.avg_hours.toFixed(1)}h` : `${(sdrStageRT.avg_hours / 24).toFixed(1)}d`} · Amostra: {sdrStageRT.sample_size}
                    </p>
                  </div>
                )}

                {/* Vendedor: Tempo na etapa TRANSFERENCIA */}
                {vendorStageRT && (
                  <div className="rounded-xl border border-blue-500/20 p-4" style={{ backgroundColor: "rgba(59,130,246,0.06)" }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <p className="text-[10px] text-blue-400 uppercase tracking-widest font-semibold">Tempo Vendedor — Etapa "{vendorStageRT.stage_name}"</p>
                      <InfoTooltip text="Tempo que o lead permanece na etapa de Transferência antes de ser assumido pelo vendedor. Meta: 10 minutos." />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold" style={{ color: vendorStageRT.median_hours <= (10/60) ? "#4ade80" : vendorStageRT.median_hours <= 1 ? "#fbbf24" : "#f87171" }}>
                        {vendorStageRT.median_hours < 1
                          ? `${Math.round(vendorStageRT.median_hours * 60)}`
                          : vendorStageRT.median_hours < 24
                          ? vendorStageRT.median_hours.toFixed(1)
                          : (vendorStageRT.median_hours / 24).toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {vendorStageRT.median_hours < 1 ? "min" : vendorStageRT.median_hours < 24 ? "h" : "d"} (mediana)
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-gray-500">Meta: 10 min</span>
                        <span className={vendorStageRT.median_hours <= (10/60) ? "text-green-400" : "text-red-400"}>
                          {vendorStageRT.median_hours <= (10/60) ? "DENTRO" : "FORA"} da meta
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min((10/60) / Math.max(vendorStageRT.median_hours, 10/60) * 100, 100)}%`,
                            backgroundColor: vendorStageRT.median_hours <= (10/60) ? "#4ade80" : "#f87171",
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">
                      Média: {vendorStageRT.avg_hours < 1 ? `${Math.round(vendorStageRT.avg_hours * 60)}min` : vendorStageRT.avg_hours < 24 ? `${vendorStageRT.avg_hours.toFixed(1)}h` : `${(vendorStageRT.avg_hours / 24).toFixed(1)}d`} · Amostra: {vendorStageRT.sample_size}
                    </p>
                  </div>
                )}
              </div>

              {/* Ciclo Comparativo: IA vs SDR */}
              <div className="rounded-xl border border-white/5 p-5" style={{ backgroundColor: "#1F2937" }}>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Ciclo Medio Comparativo</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-blue-400 uppercase tracking-widest mb-1">IA (Bot)</p>
                    <span className="text-2xl font-bold text-white">
                      {responseTimes?.humano_min != null ? `${responseTimes.humano_min}` : "—"}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">min</span>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-purple-400 uppercase tracking-widest mb-1">SDR (Eryck)</p>
                    <span className="text-2xl font-bold text-white">
                      {sdr?.ciclo_medio_h != null
                        ? sdr.ciclo_medio_h < 24
                          ? sdr.ciclo_medio_h.toFixed(1)
                          : (sdr.ciclo_medio_h / 24).toFixed(1)
                        : "—"}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">
                      {sdr?.ciclo_medio_h != null ? (sdr.ciclo_medio_h < 24 ? "h" : "d") : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cross-pipeline: SDR → Vendas */}
              <div className="rounded-xl border border-white/5 p-5" style={{ backgroundColor: "#1F2937" }}>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                  Conversao SDR → Vendas
                  <InfoTooltip text="Leads que originaram no pipeline SDR (Eryck) e foram transferidos para outros pipelines. Mostra a taxa de conversao real desses leads." />
                </p>
                {sdrConversion && sdrConversion.total_transferred > 0 ? (
                  <>
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 mb-1">Transferidos</p>
                        <span className="text-xl font-bold text-white">{sdrConversion.total_transferred}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 mb-1">Ganhos</p>
                        <span className="text-xl font-bold text-green-400">{sdrConversion.won}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 mb-1">Perdidos</p>
                        <span className="text-xl font-bold text-red-400">{sdrConversion.lost}</span>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-500 mb-1">Conversao</p>
                        <span className="text-xl font-bold text-blue-400">
                          {sdrConversion.taxa_conversao != null ? `${sdrConversion.taxa_conversao}%` : "—"}
                        </span>
                      </div>
                    </div>
                    {sdrConversion.by_destination.length > 0 && (
                      <div className="border-t border-white/5 pt-3">
                        <p className="text-[10px] text-gray-600 mb-2">Por pipeline de destino:</p>
                        {sdrConversion.by_destination.map((d) => (
                          <div key={d.pipeline_name} className="flex items-center justify-between text-xs text-gray-400 py-1">
                            <span>{d.pipeline_name}</span>
                            <span className="text-gray-300">{d.total} leads · {d.won} ganhos · {d.lost} perdidos</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-500 py-4 text-center">
                    <p>Sem dados de cross-pipeline ainda.</p>
                    <p className="text-[10px] mt-1 text-gray-600">O rastreamento de origem sera populado nas proximas sincronizacoes.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>}
      </div>

      {/* Fixed status bar at bottom */}
      <footer
        className="border-t border-gray-700 py-2 px-8 flex justify-center items-center gap-2 text-xs text-gray-400 flex-shrink-0"
        style={{ backgroundColor: PANEL_BG }}
      >
        <span>System Status: <span className="text-gray-300">Live Data</span></span>
        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-green-500">All Systems Operational</span>
      </footer>
    </div>
  );
}
