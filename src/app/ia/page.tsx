"use client";

import Header from "@/components/layout/Header";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useIAMetrics, useIAResponseTimes, useLeadsPerdidos } from "@/hooks/useMetrics";
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
}: {
  label: string;
  value: string | number;
  unit?: string;
  sparkData: number[];
  sparkColor: string;
  loading?: boolean;
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
      <h3 className="text-gray-400 text-sm font-medium mb-2">{label}</h3>
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

export default function IAPage() {
  const { periodo } = useDateFilter();
  const { data: iaData, isLoading } = useIAMetrics(periodo);
  const { data: responseTimes } = useIAResponseTimes();
  const { data: totalPerdidos = 0 } = useLeadsPerdidos(periodo);

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
        title="Métricas da IA - Telemetria Moderna"
        subtitle="Performance do atendimento automatizado"
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 pb-12 space-y-6">

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
          />
          <KPICardIA
            label="Transferidos p/ Vendedor"
            value={totalFinalizadas}
            sparkData={dailyFinalizadas.length > 0 ? dailyFinalizadas : stubSpark}
            sparkColor="#10b981"
            loading={isLoading}
          />
          <KPICardIA
            label="Tempo Médio Resposta"
            value={responseTimes?.bot_seg != null ? responseTimes.bot_seg : "—"}
            unit="seg"
            sparkData={stubSpark}
            sparkColor="#3b82f6"
            loading={isLoading}
          />
          <KPICardIA
            label="Taxa de Conversão IA"
            value={taxaHandoff != null ? taxaHandoff : "—"}
            unit="%"
            sparkData={dailyFinalizadas.length > 0 ? dailyFinalizadas : stubSpark}
            sparkColor="#10b981"
            loading={isLoading}
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
