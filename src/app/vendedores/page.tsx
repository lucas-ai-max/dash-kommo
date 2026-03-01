"use client";

import Header from "@/components/layout/Header";
import KPICard from "@/components/cards/KPICard";
import VendorRankingTable from "@/components/tables/VendorRankingTable";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useVendedorMetrics, usePipelineFunil } from "@/hooks/useMetrics";
import FunnelChart from "@/components/charts/FunnelChart";
import { Users, ShoppingCart, DollarSign, Percent, Trophy } from "lucide-react";

const EXCLUDED_VENDORS = ["Velocity Digital Company", "Eryck Henrique Matos"];

const PODIUM_STYLES = [
  { border: "border-yellow-500/60", bg: "from-yellow-500/10 to-transparent", medal: "🥇", textColor: "text-yellow-400" },
  { border: "border-gray-400/60", bg: "from-gray-400/10 to-transparent", medal: "🥈", textColor: "text-gray-300" },
  { border: "border-orange-700/60", bg: "from-orange-700/10 to-transparent", medal: "🥉", textColor: "text-orange-400" },
];

const AVATAR_COLORS = [
  "bg-yellow-600",
  "bg-gray-500",
  "bg-orange-700",
];

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
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
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard
            label="Vendedores Ativos"
            value={currentData.length}
            loading={isLoading}
            icon={<Users className="h-5 w-5" />}
            color="blue"
          />
          <KPICard
            label="Total Vendas"
            value={totalVendas}
            loading={isLoading}
            icon={<ShoppingCart className="h-5 w-5" />}
            color="green"
          />
          <KPICard
            label="Receita Total"
            value={totalReceita.toLocaleString("pt-BR")}
            prefix="R$"
            loading={isLoading}
            icon={<DollarSign className="h-5 w-5" />}
            color="purple"
          />
          <KPICard
            label="Conversão Média"
            value={avgConversao}
            suffix="%"
            loading={isLoading}
            icon={<Percent className="h-5 w-5" />}
            color="cyan"
          />
        </div>

        {/* Top 3 Podium Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {top3.map((v, i) => (
            <div
              key={v.responsible_user_id}
              className={`relative rounded-xl border-2 ${PODIUM_STYLES[i].border} bg-gradient-to-b ${PODIUM_STYLES[i].bg} bg-gray-900 p-5 transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white ${AVATAR_COLORS[i]}`}
                >
                  {getInitials(v.responsible_user_name || "?")}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {v.responsible_user_name}
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-3xl">{PODIUM_STYLES[i].medal}</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Vendas</p>
                  <p className={`text-xl font-bold ${PODIUM_STYLES[i].textColor}`}>
                    {v.leads_won}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Conversão</p>
                  <p className="text-xl font-bold text-green-400">
                    {v.taxa_conversao != null ? `${v.taxa_conversao}%` : "—"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Ranking Table */}
        <VendorRankingTable data={currentData} />

        {/* Funnel */}
        <div>
          <h2 className="mb-3 text-lg font-semibold text-white">
            Funnel de Vendas (Preview)
          </h2>
          <FunnelChart data={pipelineStages ?? []} preserveOrder />
        </div>
      </div>
    </>
  );
}
