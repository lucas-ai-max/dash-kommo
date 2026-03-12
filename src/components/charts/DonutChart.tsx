"use client";

import type { DashboardFunil } from "@/types/database";

interface Props {
  data: DashboardFunil[];
  title?: string;
}

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

export default function DonutChart({ data, title }: Props) {
  const chartData = data
    .filter((d) => d.leads_atual > 0)
    .map((d) => ({
      name: d.status_name || "N/A",
      value: d.leads_atual,
    }));

  if (!chartData.length) {
    return (
      <div className="p-5">
        <h3 className="text-sm font-semibold text-white">{title ?? "Distribuição por Etapa"}</h3>
        <p className="mt-8 text-center text-sm text-gray-500">Sem dados disponíveis</p>
      </div>
    );
  }

  return (
    <div className="p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">
        {title ?? "Distribuição por Etapa"}
      </h3>
      <div className="space-y-1.5">
        {chartData.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-gray-400 truncate flex-1">{item.name}</span>
            <span className="text-xs font-medium text-gray-300">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
