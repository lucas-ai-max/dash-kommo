"use client";

import type { ReactNode } from "react";

import Header from "@/components/layout/Header";
import VendorRankingTable from "@/components/tables/VendorRankingTable";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useVendedorMetrics, usePipelineFunil } from "@/hooks/useMetrics";
import FunnelChart from "@/components/charts/FunnelChart";
import { Users, ShoppingCart, DollarSign, Percent, Trophy } from "lucide-react";

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
        <p className="text-sm text-gray-400 mb-1">{label}</p>
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

  const currentData = (vendedores || [])
    .filter((v) => !EXCLUDED_VENDORS.includes(v.responsible_user_name || ""))
    .sort((a, b) => b.leads_won - a.leads_won);

  const totalReceita = currentData.reduce((s, v) => s + (v.receita_total || 0), 0);
  const totalVendas = currentData.reduce((s, v) => s + v.leads_won, 0);
  const avgConversao =
    currentData.length > 0
      ? (currentData.reduce((s, v) => s + (v.taxa_conversao || 0), 0) / currentData.length).toFixed(1)
      : "0";

  const top3 = currentData.slice(0, 3);

  return (
    <>
      <Header
        title="Ranking de Vendedores Moderno"
        subtitle="Métricas individuais e comparativo"
        showDateFilter={false}
      />

      <div className="space-y-6 p-6">
        {/* KPI Cards — glow style */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlowKPICard
            label="Vendedores Ativos"
            value={currentData.length}
            icon={<Users className="h-6 w-6" />}
            glowColor="rgba(59,130,246,0.4)"
            iconBg="rgba(59,130,246,0.1)"
            iconText="#60a5fa"
            loading={isLoading}
          />
          <GlowKPICard
            label="Total Vendas"
            value={totalVendas}
            icon={<ShoppingCart className="h-6 w-6" />}
            glowColor="rgba(168,85,247,0.4)"
            iconBg="rgba(168,85,247,0.1)"
            iconText="#c084fc"
            loading={isLoading}
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
          />
        </section>

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

        {/* Funnel Preview */}
        <section
          className="rounded-t-xl overflow-hidden relative"
          style={{ backgroundColor: CARD_BG, border: `1px solid #2A303C`, height: 200 }}
        >
          <div className="px-6 py-4">
            <h3 className="text-lg font-bold text-white">Funnel de Vendas (Preview)</h3>
          </div>

          {/* Neon horizon effect */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            {/* Radial glow */}
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{
                height: 100,
                background: "radial-gradient(ellipse at center bottom, rgba(59,130,246,0.5) 0%, transparent 70%)",
              }}
            />
            {/* Neon line */}
            <div
              className="absolute bottom-0 w-full h-px"
              style={{ backgroundColor: "#3b82f6", boxShadow: "0 0 20px 2px rgba(59,130,246,0.8)" }}
            />
            {/* Curved purple line */}
            <div
              className="absolute w-[120%] border-t-2 border-purple-500 rounded-[100%]"
              style={{
                bottom: -40,
                left: "-10%",
                height: 128,
                filter: "blur(2px)",
                boxShadow: "0 -5px 20px rgba(168,85,247,0.6)",
              }}
            />
          </div>

          {/* Top3 lead count label */}
          {top3[0] && (
            <div className="relative z-10 text-center mt-2">
              <p className="text-xs text-gray-400 tracking-wide">Contato Inicial</p>
              <span className="text-white font-bold text-lg">{top3[0].total_leads?.toLocaleString("pt-BR")}</span>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
