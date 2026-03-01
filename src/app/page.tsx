"use client";

import Header from "@/components/layout/Header";
import KPICard from "@/components/cards/KPICard";
import ConversionLineChart from "@/components/charts/ConversionLineChart";
import ChannelBarChart from "@/components/charts/ChannelBarChart";
import DonutChart from "@/components/charts/DonutChart";
import { useDateFilter } from "@/hooks/useDateFilter";
import {
  useOverviewMetrics,
  useMetricsHistory,
  useCanalMetrics,
  useVendedorMetrics,
  useFunilData,
} from "@/hooks/useMetrics";
import { Users, Percent, CreditCard, DollarSign } from "lucide-react";

const EXCLUDED_VENDORS = ["Velocity Digital Company", "Eryck Henrique Matos"];

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-orange-600",
  "bg-cyan-600",
  "bg-pink-600",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function OverviewPage() {
  const { periodo } = useDateFilter();
  const { data: metrics, isLoading } = useOverviewMetrics(periodo);
  const { data: history } = useMetricsHistory(30);
  const { data: canais } = useCanalMetrics(periodo);
  const { data: vendedores } = useVendedorMetrics(periodo);
  const { data: funil } = useFunilData(periodo);

  const filteredVendedores = (vendedores || []).filter(
    (v) => !EXCLUDED_VENDORS.includes(v.responsible_user_name || "")
  );

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
            icon={<Users className="h-5 w-5" />}
            color="blue"
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
            icon={<Percent className="h-5 w-5" />}
            color="green"
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
            icon={<CreditCard className="h-5 w-5" />}
            color="purple"
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
            icon={<DollarSign className="h-5 w-5" />}
            color="orange"
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

          {/* Enhanced Ranking Table */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-white">
                Ranking de Vendedores
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800 text-xs font-medium text-gray-500 uppercase">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Vendedor</th>
                    <th className="px-4 py-3 text-right">Leads</th>
                    <th className="px-4 py-3 text-right">Vendas</th>
                    <th className="px-4 py-3 text-right">Conversão</th>
                    <th className="px-4 py-3 text-right">Ticket Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendedores.map((v, i) => (
                    <tr
                      key={v.responsible_user_id}
                      className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
                          >
                            {getInitials(v.responsible_user_name || "?")}
                          </div>
                          <span className="text-sm font-medium text-white">
                            {v.responsible_user_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-sm font-medium text-blue-400">
                          {v.total_leads}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-sm font-bold text-green-400">
                          {v.leads_won}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-cyan-400 font-medium">
                        {v.taxa_conversao != null
                          ? `${v.taxa_conversao}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-400">
                        R${" "}
                        {v.ticket_medio != null
                          ? Number(v.ticket_medio).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })
                          : "0,00"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
