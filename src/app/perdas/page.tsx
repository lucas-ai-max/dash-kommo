"use client";

import Header from "@/components/layout/Header";
import KPICard from "@/components/cards/KPICard";
import LossDetailTable from "@/components/tables/LossDetailTable";
import { useDateFilter } from "@/hooks/useDateFilter";
import { usePerdasData } from "@/hooks/useMetrics";
import type { DashboardPerdas } from "@/types/database";
import { FileX } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function PipelineLossSection({
  title,
  data,
  isLoading,
}: {
  title: string;
  data: DashboardPerdas[];
  isLoading: boolean;
}) {
  const byMotivo = new Map<string, number>();
  for (const p of data) {
    const motivo = p.motivo_perda || "Sem motivo";
    byMotivo.set(motivo, (byMotivo.get(motivo) || 0) + p.quantidade);
  }
  const motivoRanking = Array.from(byMotivo.entries())
    .map(([motivo, qtd]) => ({ motivo, quantidade: qtd }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const totalPerdas = data.reduce((s, p) => s + p.quantidade, 0);
  const topMotivo = motivoRanking[0];

  // Recalcular percentuais relativos a esta pipeline
  const dataWithCorrectPct = data.map((p) => ({
    ...p,
    percentual_do_total: totalPerdas > 0
      ? Number(((p.quantidade / totalPerdas) * 100).toFixed(2))
      : 0,
  }));

  if (totalPerdas === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900 p-8 text-center min-h-[300px]">
        <FileX className="h-16 w-16 text-gray-700 mb-4" />
        <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
        <p className="text-xs text-gray-500">Sem perdas registradas nesta pipeline.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-900/30 bg-gray-900 overflow-hidden">
      {/* Section Header */}
      <div className="border-b border-gray-800 px-4 py-3 bg-red-950/20">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Compact KPIs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-gray-800/50 p-3 text-center">
            <p className="text-[10px] uppercase text-gray-500">Total de Perdas</p>
            <p className="text-lg font-bold text-red-400">{totalPerdas}</p>
          </div>
          <div className="rounded-lg bg-gray-800/50 p-3 text-center">
            <p className="text-[10px] uppercase text-gray-500">Motivos Distintos</p>
            <p className="text-lg font-bold text-white">{motivoRanking.length}</p>
          </div>
          <div className="rounded-lg bg-gray-800/50 p-3 text-center">
            <p className="text-[10px] uppercase text-gray-500">Principal Motivo</p>
            <p className="text-xs font-bold text-white truncate">{topMotivo?.motivo || "—"}</p>
          </div>
          <div className="rounded-lg bg-gray-800/50 p-3 text-center">
            <p className="text-[10px] uppercase text-gray-500">% do Principal</p>
            <p className="text-lg font-bold text-orange-400">
              {topMotivo && totalPerdas > 0
                ? ((topMotivo.quantidade / totalPerdas) * 100).toFixed(1)
                : "—"}%
            </p>
          </div>
        </div>

        {/* Bar chart */}
        <div>
          <h4 className="mb-2 text-xs font-semibold text-gray-400">Ranking de Motivos de Perda</h4>
          <ResponsiveContainer width="100%" height={Math.max(120, motivoRanking.slice(0, 8).length * 28)}>
            <BarChart data={motivoRanking.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 9 }} />
              <YAxis
                type="category"
                dataKey="motivo"
                tick={{ fill: "#6b7280", fontSize: 9 }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  fontSize: 11,
                }}
              />
              <Bar dataKey="quantidade" name="Quantidade" fill="#dc2626" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Compact detail table */}
        <div>
          <h4 className="mb-2 text-xs font-semibold text-gray-400">Detalhamento de Perdas</h4>
          <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-gray-900">
                <tr className="border-b border-gray-800 text-[10px] font-medium text-gray-500 uppercase">
                  <th className="px-2 py-2">Motivo</th>
                  <th className="px-2 py-2">Canal</th>
                  <th className="px-2 py-2">Responsável</th>
                  <th className="px-2 py-2 text-right">Qtd</th>
                  <th className="px-2 py-2 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {dataWithCorrectPct
                  .sort((a, b) => b.quantidade - a.quantidade)
                  .slice(0, 10)
                  .map((p, i) => (
                    <tr key={i} className="border-b border-gray-800/30 hover:bg-gray-800/20">
                      <td className="px-2 py-1.5 text-gray-300 truncate max-w-[100px]">{p.motivo_perda || "Sem motivo"}</td>
                      <td className="px-2 py-1.5 text-gray-500">{p.canal_venda || "Sem canal"}</td>
                      <td className="px-2 py-1.5 text-gray-400">{p.responsible_user_name || "—"}</td>
                      <td className="px-2 py-1.5 text-right font-bold text-red-400">{p.quantidade}</td>
                      <td className="px-2 py-1.5 text-right text-gray-500">{p.percentual_do_total}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PerdasPage() {
  const { periodo } = useDateFilter();
  const { data: perdas, isLoading } = usePerdasData(periodo);
  const currentData = perdas || [];

  const sdrData = currentData.filter((p) => p.pipeline_name === "BOT");
  const vendedoresData = currentData.filter((p) => p.pipeline_name === "VENDEDORES");
  const implantacaoData = currentData.filter(
    (p) => p.pipeline_name !== "VENDEDORES" && p.pipeline_name !== "BOT"
  );

  return (
    <>
      <Header
        title="Diagnóstico de Perdas Moderno"
        subtitle="Análise detalhada das etapas da pipeline e motivos de perdas."
        showDateFilter={false}
      />

      <div className="p-6">
        {/* 3-column layout */}
        <div className="grid gap-4 lg:grid-cols-3">
          <PipelineLossSection title="Perdas — SDR" data={sdrData} isLoading={isLoading} />
          <PipelineLossSection title="Perdas — Vendedores" data={vendedoresData} isLoading={isLoading} />
          <PipelineLossSection title="Perdas — Teste Implantação" data={implantacaoData} isLoading={isLoading} />
        </div>
      </div>
    </>
  );
}
