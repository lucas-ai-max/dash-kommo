"use client";

import Header from "@/components/layout/Header";
import FunnelChart from "@/components/charts/FunnelChart";
import { useFunilData } from "@/hooks/useMetrics";
import { useState } from "react";

const PIPELINES = [
  { id: 9968344, name: "Vendedores" },
  { id: 13215396, name: "Teste Implantação" },
];

export default function FunilPage() {
  const [selectedPipelineId, setSelectedPipelineId] = useState<number>(PIPELINES[0].id);
  const { data: funil, isLoading } = useFunilData("mes_atual", selectedPipelineId);

  const todayData = funil || [];

  const grouped = new Map<number, typeof todayData>();
  for (const item of todayData) {
    if (!grouped.has(item.pipeline_id)) grouped.set(item.pipeline_id, []);
    grouped.get(item.pipeline_id)!.push(item);
  }

  return (
    <>
      <Header
        title="Funil de Conversão"
        subtitle="Análise detalhada das etapas do pipeline"
        showDateFilter={false}
      />

      <div className="space-y-6 p-6">
        {/* Pipeline Selector */}
        <div className="flex gap-2">
          {PIPELINES.map((pipeline) => (
            <button
              key={pipeline.id}
              onClick={() => setSelectedPipelineId(pipeline.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${selectedPipelineId === pipeline.id
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
            >
              {pipeline.name}
            </button>
          ))}
        </div>
        {isLoading ? (
          <div className="grid gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-xl border border-gray-800 bg-gray-900"
              />
            ))}
          </div>
        ) : (
          <>
            {Array.from(grouped.entries()).map(([pipelineId, stages]) => (
              <div key={pipelineId}>
                <h2 className="mb-3 text-lg font-semibold text-white">
                  {stages[0]?.pipeline_name || `Pipeline ${pipelineId}`}
                </h2>
                <div className="grid gap-6 lg:grid-cols-2">
                  <FunnelChart data={stages} preserveOrder={true} />

                  {/* Stage details table */}
                  <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-800">
                      <h3 className="text-sm font-semibold text-white">
                        Detalhes por Etapa
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-800 text-xs font-medium text-gray-500 uppercase">
                            <th className="px-5 py-3">Etapa</th>
                            <th className="px-5 py-3 text-right">Leads</th>
                            <th className="px-5 py-3 text-right">
                              Taxa Passagem
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {stages
                            .map((stage) => (
                              <tr
                                key={stage.status_id}
                                className="border-b border-gray-800/50 hover:bg-gray-800/30"
                              >
                                <td className="px-5 py-3 text-sm text-white">
                                  {stage.status_name}
                                </td>
                                <td className="px-5 py-3 text-right text-sm font-medium text-blue-400">
                                  {stage.leads_atual}
                                </td>
                                <td className="px-5 py-3 text-right text-sm text-gray-400">
                                  {stage.taxa_passagem != null
                                    ? `${stage.taxa_passagem}%`
                                    : "—"}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {grouped.size === 0 && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
                <p className="text-gray-500">
                  Sem dados de funil disponíveis. Execute a sincronização primeiro.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
