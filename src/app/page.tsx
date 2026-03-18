"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import KPICard from "@/components/cards/KPICard";
import ChannelBarChart from "@/components/charts/ChannelBarChart";
import DonutChart from "@/components/charts/DonutChart";
import { useDateFilter } from "@/hooks/useDateFilter";
import {
  useOverviewMetrics,
  useCanalMetrics,
  useVendedorMetrics,
  useFunilData,
  useDailyLeadCounts,
  useTemperaturaDistribution,
  useTemperaturaByVendor,
  useLeadsNegociacoesQuentes,
  useTemperaturaByCanal,
  useLeadsQuentesByVendorByDay,
  useQuentesByOrigin,
  useTemperaturaByOriginFull,
} from "@/hooks/useMetrics";
import { Users, Percent, CreditCard, DollarSign, ChevronRight, Clock, Flame } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const EXCLUDED_VENDORS = ["Velocity Digital Company", "Eryck Henrique Matos"];

const AVATAR_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#10b981", // emerald
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#ec4899", // pink
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const PIPELINE_OPTIONS = [
  { id: undefined as number | undefined, name: "Todos" },
  { id: 9968344, name: "Vendedores" },
  { id: 13215396, name: "Teste Implantacao" },
  { id: 11480160, name: "SDR Eryck" },
];

export default function OverviewPage() {
  const { periodo } = useDateFilter();
  const [selectedPipeline, setSelectedPipeline] = useState<number | undefined>(undefined);
  const [selectedVendorId, setSelectedVendorId] = useState<number | undefined>(undefined);
  const { data: metrics, isLoading } = useOverviewMetrics(periodo, selectedVendorId);
  const { data: canais } = useCanalMetrics(periodo);
  const { data: vendedores } = useVendedorMetrics(periodo);
  const { data: funilTeste } = useFunilData(periodo, 13215396);
  const { data: dailyLeads } = useDailyLeadCounts(periodo, selectedPipeline, selectedVendorId);
  const { data: tempDist } = useTemperaturaDistribution(periodo);
  const { data: tempByVendor } = useTemperaturaByVendor(periodo);
  const { data: tempByCanal } = useTemperaturaByCanal(periodo);
  const { data: quentesByVendorDay } = useLeadsQuentesByVendorByDay(periodo);
  const { data: quentesByOrigin } = useQuentesByOrigin(periodo);
  const { data: tempByOriginFull } = useTemperaturaByOriginFull(periodo);
  const { data: leadsEmPotencial } = useLeadsNegociacoesQuentes();

  const chartData = (dailyLeads || []).map((d) => ({
    date: new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    leads: d.total,
    ganhos: d.won,
  }));

  const filteredVendedores = (vendedores || [])
    .filter((v) => !EXCLUDED_VENDORS.includes(v.responsible_user_name || ""))
    .sort((a, b) => (b.leads_won ?? 0) - (a.leads_won ?? 0));

  const EXCLUDED_STAGES = [
    "deffinir modelo",
    "Venda perdida",
    "definir forma de pagamento",
    "Venda ganha",
  ];

  const filteredFunilTeste = (funilTeste || []).filter(
    (f) => !EXCLUDED_STAGES.some((s) => s.toLowerCase() === (f.status_name || "").toLowerCase())
  );

  return (
    <>
      <Header
        title="Overview"
        subtitle="Visão geral do desempenho comercial"
      />

      {/* Scrollable content area matching Stitch HTML */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

        {/* KPI Cards Grid — 4 cols, glow variant */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 md:gap-6">
          <KPICard
            label="Total de Leads"
            value={metrics?.total_leads ?? 0}
            loading={isLoading}
            icon={<Users className="h-6 w-6" />}
            color="blue"
            variant="glow"
            tooltip="Leads ativos + ganhos das pipelines Vendedores e Teste Implementação. Leads com status 'Venda perdida' (fechados como perdidos no Kommo) são excluídos da contagem."
          />
          <KPICard
            label="Taxa de Conversão"
            value={
              metrics?.taxa_conversao_geral != null
                ? `${metrics.taxa_conversao_geral}`
                : "—"
            }
            suffix="%"
            loading={isLoading}
            icon={<Percent className="h-6 w-6" />}
            color="green"
            variant="glow"
            tooltip="Leads ganhos ÷ total de leads × 100."
          />
          <KPICard
            label="Ticket Médio"
            value={
              metrics?.ticket_medio != null
                ? Number(metrics.ticket_medio).toLocaleString("pt-BR")
                : "0"
            }
            prefix="R$"
            loading={isLoading}
            icon={<CreditCard className="h-6 w-6" />}
            color="purple"
            variant="glow"
            tooltip="Receita total ÷ quantidade de vendas ganhas."
          />
          <KPICard
            label="Receita Total"
            value={
              metrics?.receita_total != null
                ? Number(metrics.receita_total).toLocaleString("pt-BR")
                : "0"
            }
            prefix="R$"
            loading={isLoading}
            icon={<DollarSign className="h-6 w-6" />}
            color="green"
            variant="glow"
            tooltip="Soma dos valores de todos os leads ganhos."
          />
          <KPICard
            label="Ciclo Médio"
            value={
              metrics?.ciclo_medio_dias != null
                ? metrics.ciclo_medio_dias
                : "—"
            }
            suffix="dias"
            loading={isLoading}
            icon={<Clock className="h-6 w-6" />}
            color="orange"
            variant="glow"
            tooltip="Tempo médio em dias entre criação e fechamento dos leads ganhos."
          />
          <KPICard
            label="Conv. Potenciais"
            value={
              leadsEmPotencial?.taxa_conversao != null
                ? `${leadsEmPotencial.taxa_conversao}`
                : "—"
            }
            suffix="%"
            loading={!leadsEmPotencial}
            icon={<Flame className="h-6 w-6" />}
            color="orange"
            variant="glow"
            tooltip={`Taxa de conversão dos leads em Negociações Quentes (pipeline Vendedores). ${leadsEmPotencial ? `Total: ${leadsEmPotencial.total} | Ganhos: ${leadsEmPotencial.won} | Perdidos: ${leadsEmPotencial.lost} | Ativos: ${leadsEmPotencial.ativos}` : ''}`}
          />
        </section>

        {/* Filtro por Vendedor */}
        {filteredVendedores.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedVendorId(undefined)}
              className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-all ${
                selectedVendorId === undefined
                  ? "bg-blue-600 text-white border border-white/10"
                  : "bg-transparent text-gray-500 hover:text-white border border-white/10 hover:border-white/30"
              }`}
            >
              Todos
            </button>
            {filteredVendedores.map((v) => (
              <button
                key={v.responsible_user_id}
                onClick={() => setSelectedVendorId(v.responsible_user_id)}
                className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-all ${
                  selectedVendorId === v.responsible_user_id
                    ? "bg-blue-600 text-white border border-white/10"
                    : "bg-transparent text-gray-500 hover:text-white border border-white/10 hover:border-white/30"
                }`}
              >
                {(v.responsible_user_name || "").split(" ").slice(0, 2).join(" ")}
              </button>
            ))}
          </div>
        )}

        {/* Row 2: Leads por Dia chart */}
        <section>
          <div className="rounded-2xl border border-white/5 p-6" style={{ backgroundColor: "#1b1e2b" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-200">Leads por Dia</h2>
              <div className="flex gap-2">
                {PIPELINE_OPTIONS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setSelectedPipeline(p.id)}
                    className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-all ${
                      selectedPipeline === p.id
                        ? "bg-purple-600 text-white border border-white/10"
                        : "bg-transparent text-gray-500 hover:text-white border border-white/10 hover:border-white/30"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradGanhos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(55,65,81,0.2)" />
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "rgba(17,24,39,0.95)", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="#3b82f6" strokeWidth={2} fill="url(#gradLeads)" dot={false} />
                  <Area type="monotone" dataKey="ganhos" name="Ganhos" stroke="#10b981" strokeWidth={2} fill="url(#gradGanhos)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-600 text-sm py-12">Sem dados para o periodo selecionado</p>
            )}
          </div>
        </section>

        {/* Row 3: Ranking de Vendedores (full width) */}
        <section>
          <div
            className="rounded-2xl border border-white/5 flex flex-col overflow-hidden"
            style={{ backgroundColor: "#1b1e2b" }}
          >
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-200">
                Ranking de Vendedores
              </h2>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm text-gray-400">
                <thead>
                  <tr
                    className="text-xs uppercase text-gray-500"
                    style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
                  >
                    <th className="px-4 py-3 rounded-l-lg" scope="col">#</th>
                    <th className="px-4 py-3" scope="col">Vendedor</th>
                    <th className="px-4 py-3" scope="col">Leads</th>
                    <th className="px-4 py-3" scope="col">Vendas</th>
                    <th className="px-4 py-3" scope="col">Conversão</th>
                    <th className="px-4 py-3 rounded-r-lg" scope="col">Ticket Médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {filteredVendedores.map((v, i) => {
                    const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                    return (
                      <tr
                        key={v.responsible_user_id}
                        className="border-b border-gray-800/50 hover:bg-white/5 transition-colors group"
                      >
                        <td className="px-4 py-4 font-medium text-gray-500">{i + 1}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                              style={{ backgroundColor: color }}
                            >
                              {getInitials(v.responsible_user_name || "?")}
                            </div>
                            <span className="text-gray-200 text-sm font-medium">
                              {v.responsible_user_name}
                            </span>
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-300">
                          {v.total_leads}{" "}
                          <span className="text-green-500 text-xs ml-1">↑</span>
                        </td>
                        <td className="px-4 py-4 text-gray-300">
                          {v.leads_won}{" "}
                          {i < 2 ? (
                            <span className="text-green-500 text-xs ml-1">↑</span>
                          ) : (
                            <span className="text-red-500 text-xs ml-1">↓</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-gray-300">
                          {v.taxa_conversao != null ? `${v.taxa_conversao}%` : "—"}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">
                              R${" "}
                              {v.ticket_medio != null
                                ? Number(v.ticket_medio).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                })
                                : "0,00"}
                            </span>
                            <ChevronRight className="h-4 w-4 text-gray-600" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredVendedores.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                        Sem dados de vendedores
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Row 3: Distribuição por Etapa + Performance por Canal */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ backgroundColor: "#1b1e2b" }}>
            <DonutChart data={filteredFunilTeste} title="Teste Implantação" />
          </div>
          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ backgroundColor: "#1b1e2b" }}>
            <ChannelBarChart data={canais || []} />
          </div>
        </section>

        {/* Row 4: Temperatura de Leads */}
        {tempDist && tempDist.length > 0 ? (
          <>
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Donut-style summary */}
            <div className="rounded-2xl border border-white/5 p-6" style={{ backgroundColor: "#1b1e2b" }}>
              <h3 className="text-sm font-semibold text-white mb-4">Temperatura de Leads</h3>
              <div className="space-y-3">
                {tempDist.map((t) => {
                  const total = tempDist.reduce((s, d) => s + d.count, 0);
                  const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                  const color = t.temperatura.toLowerCase().includes("quente")
                    ? "#ef4444"
                    : t.temperatura.toLowerCase().includes("frio")
                    ? "#3b82f6"
                    : "#f59e0b";
                  return (
                    <div key={t.temperatura}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300 capitalize">{t.temperatura}</span>
                        <span className="text-gray-400 font-mono">{t.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        Conversão: {t.taxa_conversao}% ({t.won} ganhos / {t.won + t.lost} fechados)
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* O3: Conversões por nível de temperatura */}
              {(() => {
                const totalWon = tempDist.reduce((s, t) => s + t.won, 0);
                if (totalWon === 0) return null;
                return (
                  <div className="mt-4 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Conversões por nível</p>
                    <p className="text-xs text-gray-300">
                      Dos <span className="text-white font-bold">{totalWon}</span> leads convertidos:
                    </p>
                    <div className="flex gap-3 mt-1.5">
                      {tempDist.map((t) => {
                        const color = t.temperatura.toLowerCase().includes("quente")
                          ? "text-red-400" : t.temperatura.toLowerCase().includes("frio")
                          ? "text-blue-400" : "text-yellow-400";
                        return (
                          <span key={t.temperatura} className={`text-xs font-mono ${color}`}>
                            {t.won} {t.temperatura.toLowerCase()}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* By vendor table */}
            <div className="lg:col-span-2 rounded-2xl border border-white/5 overflow-hidden" style={{ backgroundColor: "#1b1e2b" }}>
              <div className="px-5 py-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white">Temperatura por Vendedor</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-gray-600 border-b border-white/5">
                      <th className="px-4 py-2.5 text-left">Vendedor</th>
                      <th className="px-3 py-2.5 text-right">Quente</th>
                      <th className="px-3 py-2.5 text-right">Médio</th>
                      <th className="px-3 py-2.5 text-right">Frio</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                      <th className="px-3 py-2.5 text-right">% Quente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(tempByVendor || []).map((v) => (
                      <tr key={v.responsible_user_name} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2.5 text-gray-200 font-medium">{v.responsible_user_name}</td>
                        <td className="px-3 py-2.5 text-right text-red-400 font-mono">{v.quente}</td>
                        <td className="px-3 py-2.5 text-right text-yellow-400 font-mono">{v.medio}</td>
                        <td className="px-3 py-2.5 text-right text-blue-400 font-mono">{v.frio}</td>
                        <td className="px-3 py-2.5 text-right text-gray-300 font-mono">{v.total}</td>
                        <td className="px-3 py-2.5 text-right font-mono">
                          <span className={v.total > 0 && (v.quente / v.total) >= 0.3 ? "text-red-400 font-bold" : "text-gray-400"}>
                            {v.total > 0 ? Math.round((v.quente / v.total) * 100) : 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* H1: Temperatura por Canal */}
          {tempByCanal && tempByCanal.length > 0 && (
            <section className="rounded-2xl border border-white/5 overflow-hidden" style={{ backgroundColor: "#1b1e2b" }}>
              <div className="px-5 py-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white">Temperatura por Canal</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-gray-600 border-b border-white/5">
                      <th className="px-4 py-2.5 text-left">Canal</th>
                      <th className="px-3 py-2.5 text-right">Quente</th>
                      <th className="px-3 py-2.5 text-right">Médio</th>
                      <th className="px-3 py-2.5 text-right">Frio</th>
                      <th className="px-3 py-2.5 text-right">Total</th>
                      <th className="px-3 py-2.5 text-right">% Quente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tempByCanal.map((c) => (
                      <tr key={c.canal_venda} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2.5 text-gray-200 font-medium">{c.canal_venda}</td>
                        <td className="px-3 py-2.5 text-right text-red-400 font-mono">{c.quente}</td>
                        <td className="px-3 py-2.5 text-right text-yellow-400 font-mono">{c.medio}</td>
                        <td className="px-3 py-2.5 text-right text-blue-400 font-mono">{c.frio}</td>
                        <td className="px-3 py-2.5 text-right text-gray-300 font-mono">{c.total}</td>
                        <td className="px-3 py-2.5 text-right font-mono">
                          <span className={c.total > 0 && (c.quente / c.total) >= 0.3 ? "text-red-400 font-bold" : "text-gray-400"}>
                            {c.total > 0 ? Math.round((c.quente / c.total) * 100) : 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* H2 + H3: Leads Quentes por Vendedor/Dia + Quentes por Origem */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* H2: Leads quentes por vendedor por dia */}
            {quentesByVendorDay && quentesByVendorDay.length > 0 && (
              <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ backgroundColor: "#1b1e2b" }}>
                <div className="px-5 py-4 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-white">Leads Quentes por Vendedor / Dia</h3>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: 280, scrollbarWidth: "thin" }}>
                  <table className="w-full text-xs">
                    <thead className="sticky top-0" style={{ backgroundColor: "#1b1e2b" }}>
                      <tr className="text-[10px] uppercase tracking-widest text-gray-600 border-b border-white/5">
                        <th className="px-4 py-2.5 text-left">Vendedor</th>
                        <th className="px-3 py-2.5 text-left">Data</th>
                        <th className="px-3 py-2.5 text-right">Leads Quentes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {quentesByVendorDay.slice(0, 30).map((r, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2 text-gray-200 font-medium">{r.responsible_user_name}</td>
                          <td className="px-3 py-2 text-gray-400 font-mono">
                            {new Date(r.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                          </td>
                          <td className="px-3 py-2 text-right text-red-400 font-bold font-mono">{r.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* H3: Temperatura por Origem (IA / SDR / Direto) */}
            {tempByOriginFull && tempByOriginFull.length > 0 && (
              <div className="rounded-2xl border border-white/5 p-6" style={{ backgroundColor: "#1b1e2b" }}>
                <h3 className="text-sm font-semibold text-white mb-2">Temperatura por Origem</h3>
                <p className="text-xs text-gray-500 mb-4">Distribuição completa (frio/médio/quente) por canal de entrada</p>
                <div className="space-y-4">
                  {tempByOriginFull.map((o) => {
                    const pctQ = o.total > 0 ? Math.round((o.quente / o.total) * 100) : 0;
                    const pctM = o.total > 0 ? Math.round((o.medio / o.total) * 100) : 0;
                    const pctF = o.total > 0 ? Math.round((o.frio / o.total) * 100) : 0;
                    return (
                      <div key={o.origin}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-300 font-medium">{o.origin}</span>
                          <span className="text-gray-500 font-mono">{o.total} leads</span>
                        </div>
                        <div className="h-3 rounded-full bg-white/5 overflow-hidden flex">
                          {o.quente > 0 && <div className="h-full" style={{ width: `${pctQ}%`, backgroundColor: "#ef4444" }} />}
                          {o.medio > 0 && <div className="h-full" style={{ width: `${pctM}%`, backgroundColor: "#f59e0b" }} />}
                          {o.frio > 0 && <div className="h-full" style={{ width: `${pctF}%`, backgroundColor: "#3b82f6" }} />}
                        </div>
                        <div className="flex gap-3 mt-0.5 text-[10px]">
                          <span className="text-red-400">{o.quente} quente ({pctQ}%)</span>
                          <span className="text-yellow-400">{o.medio} médio ({pctM}%)</span>
                          <span className="text-blue-400">{o.frio} frio ({pctF}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
          </>
        ) : (
          <section className="rounded-2xl border border-amber-800/30 bg-amber-950/20 p-5">
            <p className="text-sm text-amber-200 font-medium">Temperatura de Leads</p>
            <p className="text-xs text-amber-300/70 mt-1">
              Campo temperatura não encontrado nos leads. Crie um campo personalizado no Kommo com opções: frio, medio, quente.
            </p>
          </section>
        )}
      </div>
    </>
  );
}
