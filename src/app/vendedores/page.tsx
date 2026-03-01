"use client";

import Header from "@/components/layout/Header";
import KPICard from "@/components/cards/KPICard";
import VendorRankingTable from "@/components/tables/VendorRankingTable";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useVendedorMetrics, usePipelineFunil } from "@/hooks/useMetrics";
import FunnelChart from "@/components/charts/FunnelChart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";


export default function VendedoresPage() {
  const { periodo } = useDateFilter();
  const { data: vendedores, isLoading } = useVendedorMetrics(periodo);
  const { data: pipelineStages } = usePipelineFunil(periodo);

  const EXCLUDED_VENDORS = ["Velocity Digital Company", "Eryck Henrique Matos"];

  const currentData = (vendedores || [])
    .filter((v) => !EXCLUDED_VENDORS.includes(v.responsible_user_name || ""))
    .sort((a, b) => b.leads_won - a.leads_won);

  const totalReceita = currentData.reduce(
    (s, v) => s + (v.receita_total || 0),
    0
  );
  const totalVendas = currentData.reduce((s, v) => s + v.leads_won, 0);
  const avgConversao =
    currentData.length > 0
      ? (
        currentData.reduce((s, v) => s + (v.taxa_conversao || 0), 0) /
        currentData.length
      ).toFixed(1)
      : "0";

  // Meta progress chart
  const metaData = currentData
    .filter((v) => v.percentual_meta != null && v.percentual_meta > 0)
    .sort((a, b) => (b.percentual_meta || 0) - (a.percentual_meta || 0))
    .map((v) => ({
      nome: v.responsible_user_name || "—",
      meta: Math.min(v.percentual_meta || 0, 150),
    }));

  return (
    <>
      <Header
        title="Performance por Vendedor"
        subtitle="Métricas individuais e comparativo"
        showDateFilter={false}
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard
            label="Vendedores Ativos"
            value={currentData.length}
            loading={isLoading}
          />
          <KPICard
            label="Total Vendas"
            value={totalVendas}
            loading={isLoading}
          />
          <KPICard
            label="Receita Total"
            value={totalReceita.toLocaleString("pt-BR")}
            prefix="R$"
            loading={isLoading}
          />
          <KPICard
            label="Conversão Média"
            value={avgConversao}
            suffix="%"
            loading={isLoading}
          />
        </div>




        <VendorRankingTable data={currentData} />

        <div>
          <h2 className="mb-3 text-lg font-semibold text-white">
            Funil de Vendas
          </h2>
          <FunnelChart data={pipelineStages ?? []} preserveOrder />
        </div>
      </div>
    </>
  );
}
