"use client";

import Header from "@/components/layout/Header";
import KPICard from "@/components/cards/KPICard";
import ConversionLineChart from "@/components/charts/ConversionLineChart";
import ChannelBarChart from "@/components/charts/ChannelBarChart";
import DonutChart from "@/components/charts/DonutChart";
import VendorRankingTable from "@/components/tables/VendorRankingTable";
import { useDateFilter } from "@/hooks/useDateFilter";
import {
  useOverviewMetrics,
  useMetricsHistory,
  useCanalMetrics,
  useVendedorMetrics,
  useFunilData,
} from "@/hooks/useMetrics";

export default function OverviewPage() {
  const { periodo } = useDateFilter();
  const { data: metrics, isLoading } = useOverviewMetrics(periodo);
  const { data: history } = useMetricsHistory(30);
  const { data: canais } = useCanalMetrics(periodo);
  const { data: vendedores } = useVendedorMetrics(periodo);
  const { data: funil } = useFunilData(periodo);

  return (
    <>
      <Header
        title="Overview"
        subtitle="Visão geral do desempenho comercial"
        showDateFilter={false}
      />

      <div className="space-y-6 p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard
            label="Total de Leads"
            value={metrics?.total_leads ?? 0}
            loading={isLoading}
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
          />
          <KPICard
            label="Ticket Médio"
            value={
              metrics?.ticket_medio != null
                ? Number(metrics.ticket_medio).toLocaleString("pt-BR")
                : "—"
            }
            prefix="R$"
            loading={isLoading}
          />
          <KPICard
            label="Receita Total"
            value={
              metrics?.receita_total != null
                ? Number(metrics.receita_total).toLocaleString("pt-BR")
                : "—"
            }
            prefix="R$"
            loading={isLoading}
          />
        </div>

        {/* Charts row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ConversionLineChart data={history || []} />
          <ChannelBarChart data={canais || []} />
        </div>

        {/* Charts row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          <DonutChart data={funil || []} />
          <VendorRankingTable data={(vendedores || []).filter(
            (v) => !["Velocity Digital Company", "Eryck Henrique Matos"].includes(v.responsible_user_name || "")
          )} />
        </div>
      </div>
    </>
  );
}
