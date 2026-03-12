"use client";

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
} from "@/hooks/useMetrics";
import { Users, Percent, CreditCard, DollarSign, ChevronRight, Clock } from "lucide-react";

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

export default function OverviewPage() {
  const { periodo } = useDateFilter();
  const { data: metrics, isLoading } = useOverviewMetrics(periodo);
  const { data: canais } = useCanalMetrics(periodo);
  const { data: vendedores } = useVendedorMetrics(periodo);
  const { data: funilVendedores } = useFunilData(periodo, 9968344);
  const { data: funilTeste } = useFunilData(periodo, 13215396);

  const filteredVendedores = (vendedores || [])
    .filter((v) => !EXCLUDED_VENDORS.includes(v.responsible_user_name || ""))
    .sort((a, b) => (b.leads_won ?? 0) - (a.leads_won ?? 0));

  const EXCLUDED_STAGES = [
    "deffinir modelo",
    "Venda perdida",
    "definir forma de pagamento",
    "Venda ganha",
  ];

  const filteredFunilVendedores = (funilVendedores || []).filter(
    (f) => !EXCLUDED_STAGES.some((s) => s.toLowerCase() === (f.status_name || "").toLowerCase())
  );
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
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
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
        </section>

        {/* Row 2: Ranking de Vendedores (full width) */}
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

        {/* Row 3: Distribuição por Etapa (separado por pipeline) + Performance por Canal */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/5 overflow-hidden flex" style={{ backgroundColor: "#1b1e2b" }}>
            <div className="flex-1 min-w-0">
              <DonutChart data={filteredFunilVendedores} title="Vendedores" />
            </div>
            <div className="w-px bg-white/5 self-stretch" />
            <div className="flex-1 min-w-0">
              <DonutChart data={filteredFunilTeste} title="Teste Implantação" />
            </div>
          </div>
          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{ backgroundColor: "#1b1e2b" }}>
            <ChannelBarChart data={canais || []} />
          </div>
        </section>
      </div>
    </>
  );
}
