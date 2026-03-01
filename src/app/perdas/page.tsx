"use client";

import Header from "@/components/layout/Header";
import KPICard from "@/components/cards/KPICard";
import LossDetailTable from "@/components/tables/LossDetailTable";
import { useDateFilter } from "@/hooks/useDateFilter";
import { usePerdasData } from "@/hooks/useMetrics";
import type { DashboardPerdas } from "@/types/database";
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
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
          {title}
        </h2>
        <p className="text-sm text-gray-500">Sem perdas registradas nesta pipeline.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
        {title}
      </h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard label="Total de Perdas" value={totalPerdas} loading={isLoading} />
        <KPICard label="Motivos Distintos" value={motivoRanking.length} loading={isLoading} />
        <KPICard
          label="Principal Motivo"
          value={topMotivo?.motivo || "—"}
          loading={isLoading}
        />
        <KPICard
          label="% do Principal"
          value={
            topMotivo && totalPerdas > 0
              ? ((topMotivo.quantidade / totalPerdas) * 100).toFixed(1)
              : "—"
          }
          suffix="%"
          loading={isLoading}
        />
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Ranking de Motivos de Perda
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(200, motivoRanking.length * 40)}>
          <BarChart data={motivoRanking} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="motivo"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              width={150}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111827",
                border: "1px solid #374151",
                borderRadius: "8px",
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="quantidade"
              name="Quantidade"
              fill="#ef4444"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <LossDetailTable data={dataWithCorrectPct} />
    </div>
  );
}

export default function PerdasPage() {
  const { periodo } = useDateFilter();
  const { data: perdas, isLoading } = usePerdasData(periodo);

  const currentData = perdas || [];

  // Split by pipeline
  const sdrData = currentData.filter((p) => p.pipeline_name === "BOT");
  const vendedoresData = currentData.filter((p) => p.pipeline_name === "VENDEDORES");
  const implantacaoData = currentData.filter(
    (p) => p.pipeline_name !== "VENDEDORES" && p.pipeline_name !== "BOT"
  );

  return (
    <>
      <Header
        title="Análise de Perdas"
        subtitle="Motivos, canais e responsáveis"
        showDateFilter={false}
      />

      <div className="space-y-10 p-6">
        <PipelineLossSection
          title="Perdas — SDR"
          data={sdrData}
          isLoading={isLoading}
        />

        <PipelineLossSection
          title="Perdas — Vendedores"
          data={vendedoresData}
          isLoading={isLoading}
        />

        <PipelineLossSection
          title="Perdas — Teste Implantação"
          data={implantacaoData}
          isLoading={isLoading}
        />
      </div>
    </>
  );
}
