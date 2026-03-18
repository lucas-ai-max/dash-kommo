"use client";

import { useState, type ReactNode } from "react";

import Header from "@/components/layout/Header";
import VendorRankingTable from "@/components/tables/VendorRankingTable";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useVendedorMetrics, usePipelineFunil, useVendorResponseTimes, useStageDurations, usePropostaStats } from "@/hooks/useMetrics";
import FunnelChart from "@/components/charts/FunnelChart";
import { Users, ShoppingCart, DollarSign, Percent, Trophy, Clock } from "lucide-react";
import InfoTooltip from "@/components/ui/InfoTooltip";

/** Format minutes into human-readable string */
function formatTempo(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
}

/** Format hours into human-readable string */
function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

const EXCLUDED_VENDORS = ["Velocity Digital Company", "Eryck Henrique Matos"];
const CARD_BG = "#161B26";

const RANK_STYLES = [
  {
    trophy: "text-yellow-400",
    border: "border-yellow-500",
    glow: "rgba(245,158,11,0.3)",
    innerGlow: "rgba(245,158,11,0.2)",
    gradient: "from-yellow-500/10 via-transparent to-yellow-500/10",
    medal: "text-yellow-400",
    avatarRing: "border-yellow-500/50",
    rank: 1,
  },
  {
    trophy: "text-gray-400",
    border: "border-gray-400",
    glow: "rgba(156,163,175,0.3)",
    innerGlow: "rgba(156,163,175,0.2)",
    gradient: "from-gray-400/5 via-transparent to-gray-400/5",
    medal: "text-gray-400",
    avatarRing: "border-gray-400/50",
    rank: 2,
  },
  {
    trophy: "text-orange-700",
    border: "border-orange-700",
    glow: "rgba(180,83,9,0.3)",
    innerGlow: "rgba(180,83,9,0.2)",
    gradient: "from-orange-700/5 via-transparent to-orange-700/5",
    medal: "text-orange-700",
    avatarRing: "border-orange-700/50",
    rank: 3,
  },
];

const AVATAR_COLORS = ["#ca8a04", "#6b7280", "#b45309"];

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function GlowKPICard({
  label,
  value,
  prefix,
  suffix,
  icon,
  glowColor,
  iconBg,
  iconText,
  loading,
  tooltip,
}: {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  icon: ReactNode;
  glowColor: string;
  iconBg: string;
  iconText: string;
  loading?: boolean;
  tooltip?: string;
}) {
  if (loading) {
    return (
      <div className="rounded-xl p-6 animate-pulse" style={{ backgroundColor: CARD_BG, border: `1px solid ${glowColor}` }}>
        <div className="h-4 w-28 rounded bg-gray-700 mb-3" />
        <div className="h-10 w-20 rounded bg-gray-700" />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-6 relative overflow-hidden flex justify-between items-center"
      style={{
        backgroundColor: CARD_BG,
        boxShadow: `0 0 25px -5px ${glowColor}`,
        border: `1px solid ${glowColor}`,
      }}
    >
      {/* Decorative bottom-left glow */}
      <div
        className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full blur-2xl pointer-events-none"
        style={{ backgroundColor: glowColor.replace("0.3", "0.15") }}
      />
      <div className="relative z-10">
        <p className="text-sm text-gray-400 mb-1 flex items-center gap-1.5">
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
        </p>
        <div className="flex items-baseline gap-1">
          {prefix && <span className="text-2xl text-gray-400">{prefix}</span>}
          <h3 className="text-4xl font-bold text-white">
            {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
          </h3>
          {suffix && <span className="text-xl font-normal text-gray-500">{suffix}</span>}
        </div>
      </div>
      <div
        className="relative z-10 w-12 h-12 rounded-lg flex items-center justify-center border"
        style={{ backgroundColor: iconBg, color: iconText, borderColor: glowColor }}
      >
        {icon}
      </div>
    </div>
  );
}

export default function VendedoresPage() {
  const { periodo } = useDateFilter();
  const { data: vendedores, isLoading } = useVendedorMetrics(periodo);
  const { data: pipelineStages } = usePipelineFunil(periodo);
  const { data: vendorResponseTimes } = useVendorResponseTimes(periodo);
  const { data: stageDurations } = useStageDurations();
  const { data: propostaStats } = usePropostaStats(periodo);
  const [selectedVendorId, setSelectedVendorId] = useState<number | undefined>(undefined);

  const currentData = (vendedores || [])
    .filter((v) => !EXCLUDED_VENDORS.includes(v.responsible_user_name || ""))
    .sort((a, b) => b.leads_won - a.leads_won);

  // Filter KPI data by selected vendor
  const kpiData = selectedVendorId
    ? currentData.filter((v) => v.responsible_user_id === selectedVendorId)
    : currentData;

  const totalReceita = kpiData.reduce((s, v) => s + (v.receita_total || 0), 0);
  const totalVendas = kpiData.reduce((s, v) => s + v.leads_won, 0);
  const avgConversao =
    kpiData.length > 0
      ? (kpiData.reduce((s, v) => s + (v.taxa_conversao || 0), 0) / kpiData.length).toFixed(1)
      : "0";

  const top3 = currentData.slice(0, 3);

  const eryck = (vendedores || []).find((v) =>
    (v.responsible_user_name || "").toLowerCase().includes("eryck")
  );

  return (
    <>
      <Header
        title="Ranking de Vendedores Moderno"
        subtitle="Métricas individuais e comparativo"
      />

      <div className="space-y-6 p-6">
        {/* Filtro por Vendedor */}
        {currentData.length > 0 && (
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
            {currentData.map((v) => (
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

        {/* KPI Cards — glow style */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlowKPICard
            label={selectedVendorId ? "Leads" : "Vendedores Ativos"}
            value={selectedVendorId ? kpiData.reduce((s, v) => s + v.total_leads, 0) : currentData.length}
            icon={<Users className="h-6 w-6" />}
            glowColor="rgba(59,130,246,0.4)"
            iconBg="rgba(59,130,246,0.1)"
            iconText="#60a5fa"
            loading={isLoading}
            tooltip="Quantidade de vendedores com leads atribuídos no período."
          />
          <GlowKPICard
            label="Total Vendas"
            value={totalVendas}
            icon={<ShoppingCart className="h-6 w-6" />}
            glowColor="rgba(168,85,247,0.4)"
            iconBg="rgba(168,85,247,0.1)"
            iconText="#c084fc"
            loading={isLoading}
            tooltip="Soma de leads ganhos de todos os vendedores."
          />
          <GlowKPICard
            label="Receita Total"
            value={totalReceita.toLocaleString("pt-BR")}
            prefix="R$"
            icon={<DollarSign className="h-6 w-6" />}
            glowColor="rgba(34,197,94,0.4)"
            iconBg="rgba(34,197,94,0.1)"
            iconText="#4ade80"
            loading={isLoading}
            tooltip="Soma dos valores de todos os leads ganhos por vendedores."
          />
          <GlowKPICard
            label="Conversão Média"
            value={avgConversao}
            suffix="%"
            icon={<Percent className="h-6 w-6" />}
            glowColor="rgba(59,130,246,0.4)"
            iconBg="rgba(59,130,246,0.1)"
            iconText="#60a5fa"
            loading={isLoading}
            tooltip="Média da taxa de conversão individual de cada vendedor."
          />
        </section>

        {/* Card Eryck (SDR) */}
        {eryck && (
          <section
            className="rounded-xl border border-purple-500/30 p-4 flex items-center gap-6"
            style={{ backgroundColor: CARD_BG, boxShadow: "inset 0 0 30px rgba(168,85,247,0.1), 0 0 12px rgba(168,85,247,0.2)" }}
          >
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: "rgba(168,85,247,0.3)" }}>
                {(eryck.responsible_user_name || "E").slice(0, 1)}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-purple-400 font-semibold uppercase tracking-wide">SDR — {eryck.responsible_user_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">Leads qualificados e repassados para vendedores</p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-right">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Leads</p>
                <p className="text-lg font-bold text-white">{eryck.total_leads}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Vendas</p>
                <p className="text-lg font-bold text-green-400">{eryck.leads_won}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Conversão</p>
                <p className="text-lg font-bold text-purple-400">
                  {eryck.taxa_conversao != null ? `${eryck.taxa_conversao}%` : "—"}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Leaderboard — horizontal rows (gold / silver / bronze) */}
        <section className="space-y-4">
          {top3.map((v, i) => {
            const s = RANK_STYLES[i];
            return (
              <div
                key={v.responsible_user_id}
                className={`relative rounded-xl p-4 flex items-center overflow-hidden`}
                style={{
                  backgroundColor: CARD_BG,
                  boxShadow: `inset 0 0 30px ${s.innerGlow}, 0 0 15px ${s.glow}`,
                  border: `1px solid ${s.border.replace("border-", "")}`,
                }}
              >
                {/* Left: trophy + avatar + name */}
                <div className="flex items-center gap-6 z-10 flex-1 min-w-0">
                  <Trophy className={`h-6 w-6 ml-2 shrink-0 ${s.trophy}`} />
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Avatar with initials */}
                    <div
                      className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 ${s.avatarRing}`}
                      style={{ backgroundColor: AVATAR_COLORS[i] }}
                    >
                      {getInitials(v.responsible_user_name || "?")}
                    </div>
                    <span className="text-lg font-bold text-white truncate">
                      {v.responsible_user_name}
                    </span>
                  </div>
                </div>

                {/* Middle: Vendas + Conversão */}
                <div className="flex items-center gap-8 z-10 mr-8 shrink-0">
                  <div className="text-center w-20">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Vendas</p>
                    <p className="text-xl font-bold text-green-500">{v.leads_won}</p>
                  </div>
                  <div className="text-center w-24">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Conversão</p>
                    <p className="text-xl font-bold text-green-500">
                      {v.taxa_conversao != null ? `${v.taxa_conversao}%` : "—"}
                    </p>
                  </div>
                </div>

                {/* Right: medal with rank number */}
                <div className="pr-4 z-10 flex items-center justify-center w-16 h-16 relative shrink-0">
                  <Trophy className={`h-12 w-12 ${s.medal}`} />
                  <span className="absolute text-lg font-bold text-white mb-2">{s.rank}</span>
                </div>

                {/* Gradient overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${s.gradient} pointer-events-none`}
                />
              </div>
            );
          })}

          {top3.length === 0 && !isLoading && (
            <p className="text-center text-sm text-gray-500 py-8">Sem dados de vendedores</p>
          )}
        </section>

        {/* Data Table */}
        <VendorRankingTable data={currentData} />

        {/* Tempo de Resposta por Vendedor */}
        {vendorResponseTimes && vendorResponseTimes.length > 0 && (
          <section
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: CARD_BG, border: "1px solid #2A303C" }}
          >
            <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Tempo de Primeira Resposta por Vendedor</h3>
              <InfoTooltip text="Tempo entre a criação do lead e a primeira atividade do vendedor. Para o tempo específico após a transferência (etapa TRANSFERENCIA → vendedor assumir), veja os cards na página IA/SDR. Meta: até 10 minutos." />
            </div>
            <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
              <table className="w-full text-xs">
                <thead className="uppercase text-[9px] text-gray-500 font-semibold" style={{ backgroundColor: CARD_BG }}>
                  <tr>
                    <th className="px-4 py-2.5 text-left">Vendedor</th>
                    <th className="px-3 py-2.5 text-right">Mediana</th>
                    <th className="px-3 py-2.5 text-right">Media</th>
                    <th className="px-3 py-2.5 text-right">{"< 10min"}</th>
                    <th className="px-3 py-2.5 text-right">{"< 30min"}</th>
                    <th className="px-3 py-2.5 text-right">{"> 24h"}</th>
                    <th className="px-3 py-2.5 text-right">Amostra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40 text-gray-300">
                  {vendorResponseTimes.map((v) => {
                    const isGood = v.pct_under_10min >= 50;
                    const isBad = v.pct_over_24h > 30;
                    return (
                      <tr key={v.responsible_user_id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 font-medium text-white">{v.responsible_user_name}</td>
                        <td className="px-3 py-2 text-right font-bold" style={{ color: v.median_tempo_min <= 10 ? "#4ade80" : v.median_tempo_min <= 60 ? "#fbbf24" : "#f87171" }}>
                          {formatTempo(v.median_tempo_min)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">{formatTempo(v.avg_tempo_min)}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={isGood ? "text-green-400 font-semibold" : "text-gray-400"}>{v.pct_under_10min}%</span>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">{v.pct_under_30min}%</td>
                        <td className="px-3 py-2 text-right">
                          <span className={isBad ? "text-red-400 font-semibold" : "text-gray-400"}>{v.pct_over_24h}%</span>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500">{v.sample_size}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tempo Medio por Etapa (apenas Teste Implantação + SDR) */}
        {stageDurations && stageDurations.filter(sd => [13215396, 11480160].includes(sd.pipeline_id)).length > 0 && (
          <section
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: CARD_BG, border: "1px solid #2A303C" }}
          >
            <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Tempo Medio por Etapa do Funil</h3>
              <InfoTooltip text="Tempo medio e mediano que leads permanecem em cada etapa antes de avancar. Baseado em eventos de mudanca de status dos ultimos 90 dias." />
            </div>
            <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
              <table className="w-full text-xs">
                <thead className="uppercase text-[9px] text-gray-500 font-semibold" style={{ backgroundColor: CARD_BG }}>
                  <tr>
                    <th className="px-4 py-2.5 text-left">Pipeline</th>
                    <th className="px-3 py-2.5 text-left">Etapa</th>
                    <th className="px-3 py-2.5 text-right">Media</th>
                    <th className="px-3 py-2.5 text-right">Mediana</th>
                    <th className="px-3 py-2.5 text-right">Amostra</th>
                    <th className="px-3 py-2.5 text-left" style={{ width: "30%" }}>Visual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40 text-gray-300">
                  {stageDurations.filter(sd => [13215396, 11480160].includes(sd.pipeline_id)).map((sd, i) => {
                    const filtered = stageDurations.filter(s => [13215396, 11480160].includes(s.pipeline_id));
                    const maxH = Math.max(...filtered.map((s) => s.avg_duration_hours), 1);
                    const pct = Math.round((sd.avg_duration_hours / maxH) * 100);
                    return (
                      <tr key={`${sd.pipeline_id}-${sd.status_name}-${i}`} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 text-gray-500 truncate">{sd.pipeline_name}</td>
                        <td className="px-3 py-2 font-medium text-white">{sd.status_name || "—"}</td>
                        <td className="px-3 py-2 text-right font-bold" style={{ color: sd.avg_duration_hours > 48 ? "#f87171" : sd.avg_duration_hours > 12 ? "#fbbf24" : "#4ade80" }}>
                          {formatDuration(sd.avg_duration_hours)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">{formatDuration(sd.median_duration_hours)}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{sd.sample_size}</td>
                        <td className="px-3 py-2">
                          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: sd.avg_duration_hours > 48 ? "#f87171" : sd.avg_duration_hours > 12 ? "#fbbf24" : "#4ade80",
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Sem Proposta vs Com Proposta + Meta 30/70 */}
        {propostaStats && propostaStats.total > 0 && (
          <section
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: CARD_BG, border: "1px solid #2A303C" }}
          >
            <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Sem Proposta vs Com Proposta</h3>
              <InfoTooltip text="Pipeline Teste Implantação: leads em etapas de filtragem (Descoberta, Mostrar Modelos, Forma de Pagamento, etc.) vs etapas de proposta (Proposta, Objeções, Fechamento). Meta: máx 30% sem proposta." />
            </div>

            {/* Overall gauge */}
            <div className="px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-400">Sem proposta: <span className="font-bold text-yellow-400">{propostaStats.sem_proposta}</span></span>
                    <span className="text-gray-400">Com proposta: <span className="font-bold text-green-400">{propostaStats.com_proposta}</span></span>
                  </div>
                  <div className="h-4 rounded-full bg-white/5 overflow-hidden flex">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${propostaStats.pct_sem_proposta}%`,
                        backgroundColor: propostaStats.pct_sem_proposta > 30 ? "#f87171" : "#fbbf24",
                      }}
                    />
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${100 - propostaStats.pct_sem_proposta}%`,
                        backgroundColor: "#4ade80",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] mt-1">
                    <span className={propostaStats.pct_sem_proposta > 30 ? "text-red-400 font-bold" : "text-yellow-400"}>
                      {propostaStats.pct_sem_proposta}% sem proposta
                    </span>
                    <span className="text-gray-600">Meta: max 30% sem proposta</span>
                  </div>
                </div>
                <div className="text-center shrink-0 px-3">
                  <div
                    className="text-2xl font-bold"
                    style={{ color: propostaStats.pct_sem_proposta <= 30 ? "#4ade80" : "#f87171" }}
                  >
                    {propostaStats.pct_sem_proposta <= 30 ? "OK" : "ALERTA"}
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {propostaStats.total} leads ativos
                  </p>
                </div>
              </div>
            </div>

            {/* Per vendor table */}
            <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
              <table className="w-full text-xs">
                <thead className="uppercase text-[9px] text-gray-500 font-semibold" style={{ backgroundColor: CARD_BG }}>
                  <tr>
                    <th className="px-4 py-2.5 text-left">Vendedor</th>
                    <th className="px-3 py-2.5 text-right">Total</th>
                    <th className="px-3 py-2.5 text-right">Sem Proposta</th>
                    <th className="px-3 py-2.5 text-right">Com Proposta</th>
                    <th className="px-3 py-2.5 text-right">% Sem</th>
                    <th className="px-3 py-2.5 text-center">Meta</th>
                    <th className="px-3 py-2.5 text-left" style={{ width: "25%" }}>Distribuição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40 text-gray-300">
                  {propostaStats.by_vendor.map((v) => (
                    <tr key={v.responsible_user_name} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2 font-medium text-white">{v.responsible_user_name}</td>
                      <td className="px-3 py-2 text-right text-gray-400">{v.total}</td>
                      <td className="px-3 py-2 text-right text-yellow-400 font-mono">{v.sem_proposta}</td>
                      <td className="px-3 py-2 text-right text-green-400 font-mono">{v.com_proposta}</td>
                      <td className="px-3 py-2 text-right font-bold" style={{ color: v.pct_sem_proposta > 30 ? "#f87171" : "#4ade80" }}>
                        {v.pct_sem_proposta}%
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.dentro_da_meta ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {v.dentro_da_meta ? "OK" : "ACIMA"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
                          <div className="h-full" style={{ width: `${v.pct_sem_proposta}%`, backgroundColor: v.pct_sem_proposta > 30 ? "#f87171" : "#fbbf24" }} />
                          <div className="h-full" style={{ width: `${v.pct_com_proposta}%`, backgroundColor: "#4ade80" }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>
    </>
  );
}
