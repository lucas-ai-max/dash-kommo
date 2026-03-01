"use client";

import Header from "@/components/layout/Header";
import FunnelChart from "@/components/charts/FunnelChart";
import { useFunilData } from "@/hooks/useMetrics";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const PIPELINES = [
  { id: 9968344, name: "Vendedores" },
  { id: 13215396, name: "Teste Implantação" },
];

function StageBadge({ name }: { name: string }) {
  const upper = name.toUpperCase();
  if (upper.includes("GANHO") || upper.includes("GANHA")) {
    return <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-green-500/20 text-green-400 uppercase">Ganho</span>;
  }
  if (upper.includes("PERDIDO") || upper.includes("PERDIDA")) {
    return <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 uppercase">Perdido</span>;
  }
  if (upper.includes("REAQUECER")) {
    return <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-yellow-500/20 text-yellow-400">★</span>;
  }
  return <span className="rounded px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-400 uppercase">Status</span>;
}

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
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${selectedPipelineId === pipeline.id
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
            >
              {pipeline.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl border border-gray-800 bg-gray-900" />
            ))}
          </div>
        ) : (
          <>
            {Array.from(grouped.entries()).map(([pipelineId, stages]) => (
              <div key={pipelineId}>
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Funnel with percentage arrows */}
                  <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                    <h3 className="mb-4 text-sm font-semibold text-white">Funil de Conversão</h3>
                    <div className="space-y-0">
                      {stages.map((stage, idx) => {
                        const maxLeads = stages[0]?.leads_atual || 1;
                        const widthPct = Math.max(20, (stage.leads_atual / maxLeads) * 100);
                        const isGanho = stage.status_name?.toUpperCase().includes("GANHO");
                        const isPerdido = stage.status_name?.toUpperCase().includes("PERDIDO");

                        // Compute pass-through rate
                        let passRate: number | null = null;
                        if (idx > 0 && stages[idx - 1].leads_atual > 0) {
                          passRate = Number(((stage.leads_atual / stages[idx - 1].leads_atual) * 100).toFixed(1));
                        }

                        return (
                          <div key={stage.status_id}>
                            {/* Stage bar */}
                            <div className="flex items-center gap-3 py-1">
                              <span className="w-40 text-right text-xs text-gray-400 truncate shrink-0">
                                {stage.status_name}
                              </span>
                              <div
                                className={`relative rounded-md py-2 px-3 text-center transition-all ${isGanho
                                    ? "bg-green-600/80"
                                    : isPerdido
                                      ? "bg-red-600/80"
                                      : "bg-gradient-to-r from-purple-700 to-purple-500"
                                  }`}
                                style={{
                                  width: `${widthPct}%`,
                                  minWidth: 60,
                                }}
                              >
                                <span className="text-xs font-bold text-white">
                                  {stage.leads_atual.toLocaleString("pt-BR")}
                                </span>
                              </div>
                              {/* Pass rate arrow */}
                              {passRate !== null && (
                                <div className={`flex items-center gap-0.5 text-xs shrink-0 ${passRate > 50 ? "text-green-400" : passRate > 10 ? "text-yellow-400" : "text-red-400"
                                  }`}>
                                  <ChevronDown className="h-3 w-3" />
                                  {passRate}%
                                  {passRate > 100 && " ↑"}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Details table with badges */}
                  <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-800">
                      <h3 className="text-sm font-semibold text-white">Detalhes por Etapa</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-800 text-xs font-medium text-gray-500 uppercase">
                            <th className="px-5 py-3">Etapa</th>
                            <th className="px-5 py-3 text-right">Leads</th>
                            <th className="px-5 py-3 text-right">Taxa Passagem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stages.map((stage) => {
                            const isGanho = stage.status_name?.toUpperCase().includes("GANHO");
                            const isPerdido = stage.status_name?.toUpperCase().includes("PERDIDO");
                            const isQuente = stage.status_name?.toUpperCase().includes("QUENTE");
                            return (
                              <tr
                                key={stage.status_id}
                                className={`border-b border-gray-800/50 transition-colors ${isQuente
                                    ? "bg-purple-900/10"
                                    : isGanho
                                      ? "bg-green-900/10"
                                      : isPerdido
                                        ? "bg-red-900/10"
                                        : "hover:bg-gray-800/30"
                                  }`}
                              >
                                <td className="px-5 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-white">
                                      {stage.status_name}
                                    </span>
                                    <StageBadge name={stage.status_name || ""} />
                                  </div>
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <span className={`text-sm font-bold ${isGanho ? "text-green-400" : isPerdido ? "text-red-400" : "text-blue-400"
                                    }`}>
                                    {stage.leads_atual.toLocaleString("pt-BR")}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-right text-sm text-gray-400">
                                  {stage.taxa_passagem != null ? `${stage.taxa_passagem}%` : "—"}
                                </td>
                              </tr>
                            );
                          })}
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
