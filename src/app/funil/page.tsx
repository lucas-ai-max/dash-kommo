"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { useFunilData, useLeadsHumanoSemProposta } from "@/hooks/useMetrics";
import { useDateFilter } from "@/hooks/useDateFilter";

const PIPELINES = [
  { id: 9968344, name: "Vendedores" },
  { id: 13215396, name: "Teste Implantação" },
];

// Funnel layers: width and clip-path narrowing toward bottom
const LAYER_STYLES = [
  { width: "96%", clip: "polygon(0% 0%, 100% 0%, 96% 100%, 4% 100%)" },
  { width: "88%", clip: "polygon(0% 0%, 100% 0%, 95% 100%, 5% 100%)" },
  { width: "80%", clip: "polygon(0% 0%, 100% 0%, 94% 100%, 6% 100%)" },
  { width: "72%", clip: "polygon(0% 0%, 100% 0%, 93% 100%, 7% 100%)" },
  { width: "64%", clip: "polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)" },
  { width: "56%", clip: "polygon(0% 0%, 100% 0%, 91% 100%, 9% 100%)" },
  { width: "48%", clip: "polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)" },
];

// Upward sparkline SVG
function SparkUp({ color }: { color: string }) {
  return (
    <svg className="w-8 h-4" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 12">
      <path d="M1 11L5 9L9 10L15 3L19 5L23 1" />
    </svg>
  );
}
function SparkDown({ color }: { color: string }) {
  return (
    <svg className="w-8 h-4" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 12">
      <path d="M1 2L6 4L12 3L18 10L23 11" />
    </svg>
  );
}

function stageColor(name: string) {
  const u = (name || "").toUpperCase();
  if (u.includes("GANHO") || u.includes("GANHA")) return "emerald";
  if (u.includes("PERDIDO") || u.includes("PERDIDA")) return "red";
  if (u.includes("NEGOCIA")) return "purple";
  if (u.includes("ACOMPANHA") || u.includes("FOLLOW")) return "orange";
  if (u.includes("REAQUECER")) return "yellow";
  return "blue";
}

export default function FunilPage() {
  const [selectedPipelineId, setSelectedPipelineId] = useState<number>(PIPELINES[0].id);
  const [semPropostaExpanded, setSemPropostaExpanded] = useState(false);
  const { periodo } = useDateFilter();
  const { data: funil, isLoading } = useFunilData(periodo, selectedPipelineId);
  const { data: humanoSemProposta, isLoading: loadingHumano } = useLeadsHumanoSemProposta();

  const stages = funil || [];
  const maxLeads = stages[0]?.leads_atual || 1;

  return (
    <>
      <Header
        title="Funil de Conversão"
        subtitle="Análise de pipeline em tempo real"
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Pipeline selector buttons */}
        <div className="flex gap-3 mb-6">
          {PIPELINES.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPipelineId(p.id)}
              className={`px-5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition-all ${selectedPipelineId === p.id
                ? "bg-purple-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)] border border-white/10"
                : "bg-transparent text-gray-400 hover:text-white border border-white/10 hover:border-white/30"
                }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid xl:grid-cols-12 gap-6">
            <div className="xl:col-span-7 h-96 animate-pulse rounded-2xl bg-gray-900" />
            <div className="xl:col-span-5 h-96 animate-pulse rounded-2xl bg-gray-900" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

            {/* ── Left: Visual Funnel ── */}
            <div
              className="xl:col-span-7 rounded-2xl p-6 border border-white/5 relative overflow-hidden flex flex-col"
              style={{ backgroundColor: "rgba(22,24,31,0.8)" }}
            >
              {/* Purple ambient glow */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)" }}
              />

              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Visualização de Etapas</h2>
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Fluxo & Retenção</p>
                </div>
              </div>

              {/* Funnel layers */}
              <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-4 space-y-1">
                {stages.map((stage, idx) => {
                  const layerIdx = Math.min(idx, LAYER_STYLES.length - 1);
                  const layer = LAYER_STYLES[layerIdx];
                  const color = stageColor(stage.status_name || "");
                  const isGanho = color === "emerald";
                  const isPerdido = color === "red";
                  const isNeg = color === "purple";

                  // Pass-through rate
                  let passRate: string | null = null;
                  if (idx > 0 && stages[idx - 1].leads_atual > 0) {
                    passRate = ((stage.leads_atual / stages[idx - 1].leads_atual) * 100).toFixed(1);
                  }

                  const funnelBg = isGanho
                    ? "linear-gradient(90deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.5) 50%, rgba(16,185,129,0.2) 100%)"
                    : isPerdido
                      ? "linear-gradient(90deg, rgba(239,68,68,0.2) 0%, rgba(239,68,68,0.5) 50%, rgba(239,68,68,0.2) 100%)"
                      : isNeg
                        ? "linear-gradient(90deg, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0.65) 50%, rgba(139,92,246,0.35) 100%)"
                        : "linear-gradient(90deg, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.4) 50%, rgba(139,92,246,0.15) 100%)";

                  const funnelBorder = isGanho
                    ? "1px solid rgba(16,185,129,0.3)"
                    : isPerdido
                      ? "1px solid rgba(239,68,68,0.3)"
                      : isNeg
                        ? "1px solid rgba(167,139,250,0.5)"
                        : "1px solid rgba(139,92,246,0.2)";

                  const passColor =
                    passRate === null ? "" :
                      Number(passRate) > 50 ? "#00FF87" :
                        Number(passRate) > 10 ? "#FFC107" : "#FF2200";

                  return (
                    <div key={stage.status_id} className="flex items-center w-full group" style={{ height: isNeg ? 52 : 40 }}>
                      {/* Label */}
                      <div className="text-right pr-3 shrink-0" style={{ width: "20%" }}>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isNeg ? "text-purple-400" : "text-gray-500 group-hover:text-white"
                            }`}
                        >
                          {stage.status_name}
                        </span>
                      </div>

                      {/* Funnel shape */}
                      <div className="flex justify-center" style={{ width: "60%" }}>
                        <div style={{ width: layer.width, position: "relative", height: isNeg ? 52 : 40 }}>
                          <div
                            className="absolute inset-0 flex items-center justify-center font-bold text-white text-sm"
                            style={{
                              clipPath: layer.clip,
                              background: funnelBg,
                              border: funnelBorder,
                              boxShadow: isNeg ? "0 0 20px rgba(139,92,246,0.3)" : undefined,
                            }}
                          >
                            {stage.leads_atual.toLocaleString("pt-BR")}
                          </div>
                        </div>
                      </div>

                      {/* Pass rate */}
                      <div className="pl-3 flex items-center" style={{ width: "20%" }}>
                        {passRate !== null && (
                          <span className="font-mono font-bold text-xs flex items-center gap-1" style={{ color: passColor }}>
                            {passRate}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {stages.length === 0 && (
                  <p className="text-gray-500 text-sm">Sem dados para este pipeline.</p>
                )}
              </div>
            </div>

            {/* ── Right: Detail table ── */}
            <div
              className="xl:col-span-5 rounded-2xl border border-white/5 flex flex-col overflow-hidden"
              style={{ backgroundColor: "rgba(22,24,31,0.8)" }}
            >
              <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center" style={{ backgroundColor: "rgba(255,255,255,0.01)" }}>
                <h2 className="text-xs font-bold text-white uppercase tracking-wide">Detalhes por Etapa</h2>
              </div>

              <div className="overflow-y-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] border-b border-white/5 uppercase tracking-widest" style={{ backgroundColor: "rgba(255,255,255,0.01)", color: "#666" }}>
                      <th className="px-5 py-3 font-medium">Etapa</th>
                      <th className="px-5 py-3 font-medium text-right">Leads</th>
                      <th className="px-5 py-3 font-medium text-right w-28">Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map((stage, idx) => {
                      const color = stageColor(stage.status_name || "");
                      const isGanho = color === "emerald";
                      const isPerdido = color === "red";
                      const isNeg = color === "purple";

                      let passRate: string | null = null;
                      if (idx > 0 && stages[idx - 1].leads_atual > 0) {
                        passRate = ((stage.leads_atual / stages[idx - 1].leads_atual) * 100).toFixed(1);
                      }

                      const dotColor = isGanho ? "#10b981" : isPerdido ? "#ef4444" : isNeg ? "#8b5cf6" : "#3b82f6";
                      const passColor = passRate == null ? "#666" : Number(passRate) > 50 ? "#00FF87" : Number(passRate) > 10 ? "#FFC107" : "#FF2200";

                      return (
                        <tr
                          key={stage.status_id}
                          className="transition-all duration-200 border-none"
                          style={{
                            backgroundColor: isNeg
                              ? "rgba(139,92,246,0.12)"
                              : isGanho
                                ? "rgba(16,185,129,0.03)"
                                : isPerdido
                                  ? "rgba(239,68,68,0.03)"
                                  : undefined,
                            borderLeft: isNeg ? "3px solid #8b5cf6" : "3px solid transparent",
                          }}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              {isNeg ? (
                                <div className="relative w-2 h-2">
                                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#8b5cf6", boxShadow: "0 0 10px #8b5cf6" }} />
                                </div>
                              ) : (
                                <div className="w-1.5 h-7 rounded-full" style={{ backgroundColor: dotColor + "66", boxShadow: `0 0 8px ${dotColor}66` }} />
                              )}
                              <div className="flex flex-col">
                                <span className={`text-xs font-semibold ${isNeg ? "text-white" : "text-gray-300"}`}>
                                  {stage.status_name}
                                </span>
                                <span className="text-[9px] uppercase tracking-wider" style={{ color: "#555" }}>
                                  {isNeg ? "Etapa Ativa" : isGanho ? "Ganho" : isPerdido ? "Perdido" : "Aberto"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span
                              className="font-mono text-xs font-bold"
                              style={{ color: isGanho ? "#10b981" : isPerdido ? "#ef4444" : "#e5e7eb" }}
                            >
                              {stage.leads_atual.toLocaleString("pt-BR")}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            {passRate !== null ? (
                              <div className="flex items-center justify-end gap-2">
                                {Number(passRate) < 30 ? <SparkDown color={passColor} /> : <SparkUp color={passColor} />}
                                <span className="font-mono font-bold text-[10px]" style={{ color: passColor }}>
                                  {passRate}%
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: "#555", fontSize: 10 }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Card "Leads sem proposta" — só aparece no pipeline Teste Implantação */}
        {selectedPipelineId === 13215396 && (
          <div className="mt-6 rounded-2xl border border-amber-500/20 p-5" style={{ backgroundColor: "rgba(245,158,11,0.04)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <h3 className="text-sm font-semibold text-white">Leads sem Proposta</h3>
                <InfoTooltip text="Leads ativos no pipeline Teste Implantação que ainda não passaram pelas etapas de Proposta, Objeções ou Fechamento. Indica leads que o vendedor assumiu mas não avançou no processo." />
              </div>
              {!loadingHumano && humanoSemProposta && (
                <button
                  onClick={() => setSemPropostaExpanded((v) => !v)}
                  className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1 rounded-full transition-all"
                >
                  {semPropostaExpanded ? "Ocultar" : "Ver leads"}
                </button>
              )}
            </div>

            {loadingHumano ? (
              <div className="flex gap-6">
                <div className="h-10 w-24 rounded animate-pulse bg-gray-700" />
                <div className="h-10 w-48 rounded animate-pulse bg-gray-700" />
              </div>
            ) : humanoSemProposta ? (
              <>
                <div className="flex items-end gap-6 mb-4">
                  <div>
                    <span className="text-4xl font-bold text-amber-400">{humanoSemProposta.semProposta}</span>
                    <span className="text-gray-500 text-sm ml-2">de {humanoSemProposta.totalAtivos} ativos</span>
                  </div>
                  <div className="flex-1 max-w-md">
                    {(() => {
                      const pctSem = humanoSemProposta.totalAtivos > 0
                        ? (humanoSemProposta.semProposta / humanoSemProposta.totalAtivos) * 100
                        : 0;
                      const pctCom = 100 - pctSem;
                      const metaOk = pctSem <= 30;
                      return (
                        <>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Sem proposta: {pctSem.toFixed(0)}%</span>
                            <span className="text-gray-500">Com proposta: {pctCom.toFixed(0)}%</span>
                          </div>
                          <div className="h-3 rounded-full bg-white/5 overflow-hidden relative">
                            <div
                              className="h-full rounded-l-full"
                              style={{
                                width: `${pctSem}%`,
                                backgroundColor: pctSem > 30 ? "#ef4444" : "#f59e0b",
                              }}
                            />
                            <div
                              className="absolute top-0 h-full rounded-r-full"
                              style={{
                                left: `${pctSem}%`,
                                width: `${pctCom}%`,
                                backgroundColor: "#10b981",
                                opacity: 0.6,
                              }}
                            />
                            {/* Meta line at 30% */}
                            <div
                              className="absolute top-0 h-full w-0.5 bg-white/60"
                              style={{ left: "30%" }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] mt-1">
                            <span className={metaOk ? "text-green-400" : "text-red-400"}>
                              Meta: max 30% sem proposta {metaOk ? "- OK" : "- ACIMA"}
                            </span>
                            <span className="text-gray-600">|  70% com proposta</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {semPropostaExpanded && humanoSemProposta.leads.length > 0 && (
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-gray-600 border-b border-white/5">
                          <th className="py-2 pr-4">Lead</th>
                          <th className="py-2 pr-4">Etapa atual</th>
                          <th className="py-2">Responsável</th>
                        </tr>
                      </thead>
                      <tbody>
                        {humanoSemProposta.leads.slice(0, 50).map((lead, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-2 pr-4 text-gray-300">{lead.name}</td>
                            <td className="py-2 pr-4">
                              <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-medium">
                                {lead.stage}
                              </span>
                            </td>
                            <td className="py-2 text-gray-400">{lead.responsavel}</td>
                          </tr>
                        ))}
                        {humanoSemProposta.leads.length > 50 && (
                          <tr>
                            <td colSpan={3} className="py-2 text-center text-gray-600 text-[10px]">
                              +{humanoSemProposta.leads.length - 50} leads não exibidos
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
