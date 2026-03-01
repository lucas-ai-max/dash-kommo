"use client";

import Header from "@/components/layout/Header";
import ChannelBarChart from "@/components/charts/ChannelBarChart";
import KPICard from "@/components/cards/KPICard";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useCanalMetrics } from "@/hooks/useMetrics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function CanaisPage() {
  const { periodo } = useDateFilter();
  const { data: canais, isLoading } = useCanalMetrics(periodo);

  const currentData = canais || [];

  const totalLeads = currentData.reduce((s, c) => s + c.total_leads, 0);
  const totalWon = currentData.reduce((s, c) => s + c.leads_won, 0);
  const bestCanal = currentData.reduce(
    (best, c) =>
      (c.taxa_conversao || 0) > (best.taxa_conversao || 0) ? c : best,
    currentData[0] || { canal_venda: "—", taxa_conversao: 0 }
  );

  const conversionData = currentData
    .filter((c) => c.taxa_conversao != null)
    .map((c) => ({
      canal: c.canal_venda,
      conversao: c.taxa_conversao,
    }))
    .sort((a, b) => (b.conversao || 0) - (a.conversao || 0));

  return (
    <>
      <Header
        title="Performance por Canal"
        subtitle="Análise de cada canal de aquisição"
        showDateFilter={false}
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard
            label="Total de Canais"
            value={currentData.length}
            loading={isLoading}
          />
          <KPICard
            label="Total de Leads"
            value={totalLeads}
            loading={isLoading}
          />
          <KPICard
            label="Total de Vendas"
            value={totalWon}
            loading={isLoading}
          />
          <KPICard
            label="Melhor Canal"
            value={bestCanal?.canal_venda || "—"}
            suffix={
              bestCanal?.taxa_conversao
                ? `${bestCanal.taxa_conversao}%`
                : undefined
            }
            loading={isLoading}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ChannelBarChart data={currentData} />

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">
              Conversão por Canal
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  type="number"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="canal"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  formatter={(value) => [`${value}%`, "Conversão"]}
                />
                <Bar dataKey="conversao" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Full table */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="text-sm font-semibold text-white">
              Tabela Completa por Canal
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800 text-xs font-medium text-gray-500 uppercase">
                  <th className="px-5 py-3">Canal</th>
                  <th className="px-5 py-3 text-right">Leads</th>
                  <th className="px-5 py-3 text-right">Ganhos</th>
                  <th className="px-5 py-3 text-right">Perdidos</th>
                  <th className="px-5 py-3 text-right">Conversão</th>
                  <th className="px-5 py-3 text-right">Ciclo</th>
                  <th className="px-5 py-3 text-right">Ticket</th>
                  <th className="px-5 py-3 text-right">Follow-ups</th>
                </tr>
              </thead>
              <tbody>
                {currentData
                  .sort((a, b) => b.total_leads - a.total_leads)
                  .map((c) => (
                    <tr
                      key={c.canal_venda}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30"
                    >
                      <td className="px-5 py-3 text-sm font-medium text-white">
                        {c.canal_venda}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-300">
                        {c.total_leads}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-green-400">
                        {c.leads_won}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-red-400">
                        {c.leads_lost}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-300">
                        {c.taxa_conversao != null ? `${c.taxa_conversao}%` : "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-300">
                        {c.ciclo_medio_dias != null
                          ? `${c.ciclo_medio_dias}d`
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-300">
                        {c.ticket_medio != null
                          ? `R$ ${Number(c.ticket_medio).toLocaleString("pt-BR")}`
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-gray-300">
                        {c.followups_medio ?? "—"}
                      </td>
                    </tr>
                  ))}
                {currentData.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-8 text-center text-sm text-gray-500"
                    >
                      Sem dados de canais disponíveis
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
