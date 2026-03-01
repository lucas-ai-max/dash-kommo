"use client";

import type { DashboardPerdas } from "@/types/database";

interface Props {
  data: DashboardPerdas[];
}

export default function LossDetailTable({ data }: Props) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">
          Detalhamento de Perdas
        </h3>
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 text-xs font-medium text-gray-500 uppercase sticky top-0 bg-gray-900 z-10">
              <th className="px-5 py-3">Motivo</th>
              <th className="px-5 py-3">Canal</th>
              <th className="px-5 py-3">Responsável</th>
              <th className="px-5 py-3 text-right">Qtd</th>
              <th className="px-5 py-3 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30"
              >
                <td className="px-5 py-3 text-sm font-medium text-white">
                  {row.motivo_perda || "Sem motivo"}
                </td>
                <td className="px-5 py-3 text-sm text-gray-400">
                  {row.canal_venda || "—"}
                </td>
                <td className="px-5 py-3 text-sm text-gray-400">
                  {row.responsible_user_name || "—"}
                </td>
                <td className="px-5 py-3 text-right text-sm text-red-400 font-medium">
                  {row.quantidade}
                </td>
                <td className="px-5 py-3 text-right text-sm text-gray-400">
                  {row.percentual_do_total != null
                    ? `${row.percentual_do_total}%`
                    : "—"}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-8 text-center text-sm text-gray-500"
                >
                  Sem dados de perdas disponíveis
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
