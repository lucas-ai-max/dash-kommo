"use client";

import type { DashboardMetricsVendedor } from "@/types/database";

interface Props {
  data: DashboardMetricsVendedor[];
}

export default function VendorRankingTable({ data }: Props) {
  const sorted = [...data].sort(
    (a, b) => (b.receita_total || 0) - (a.receita_total || 0)
  );

  return (
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
              <th className="px-5 py-3">#</th>
              <th className="px-5 py-3">Vendedor</th>
              <th className="px-5 py-3 text-right">Leads</th>
              <th className="px-5 py-3 text-right">Vendas</th>
              <th className="px-5 py-3 text-right">Conversão</th>
              <th className="px-5 py-3 text-right">Ticket Médio</th>
              <th className="px-5 py-3 text-right">Receita</th>
              <th className="px-5 py-3 text-right">Meta</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((v, i) => (
              <tr
                key={v.responsible_user_id}
                className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30"
              >
                <td className="px-5 py-3 text-sm text-gray-500">{i + 1}</td>
                <td className="px-5 py-3 text-sm font-medium text-white">
                  {v.responsible_user_name || "—"}
                </td>
                <td className="px-5 py-3 text-right text-sm text-gray-300">
                  {v.total_leads}
                </td>
                <td className="px-5 py-3 text-right text-sm text-green-400">
                  {v.leads_won}
                </td>
                <td className="px-5 py-3 text-right text-sm text-gray-300">
                  {v.taxa_conversao != null ? `${v.taxa_conversao}%` : "—"}
                </td>
                <td className="px-5 py-3 text-right text-sm text-gray-300">
                  {v.ticket_medio != null
                    ? `R$ ${Number(v.ticket_medio).toLocaleString("pt-BR")}`
                    : "—"}
                </td>
                <td className="px-5 py-3 text-right text-sm font-medium text-white">
                  {v.receita_total != null
                    ? `R$ ${Number(v.receita_total).toLocaleString("pt-BR")}`
                    : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  {v.percentual_meta != null && v.percentual_meta > 0 ? (
                    <span
                      className={`text-sm font-medium ${
                        v.percentual_meta >= 100
                          ? "text-green-400"
                          : v.percentual_meta >= 70
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {v.percentual_meta}%
                    </span>
                  ) : (
                    <span className="text-sm text-gray-600">—</span>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-8 text-center text-sm text-gray-500"
                >
                  Sem dados disponíveis
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
