"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { DashboardFunil } from "@/types/database";

interface Props {
  data: DashboardFunil[];
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

export default function DonutChart({ data }: Props) {
  const chartData = data
    .filter((d) => d.leads_atual > 0)
    .map((d) => ({
      name: d.status_name || "N/A",
      value: d.leads_atual,
    }));

  if (!chartData.length) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-white">Distribuição por Etapa</h3>
        <p className="mt-8 text-center text-sm text-gray-500">
          Sem dados disponíveis
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">
        Distribuição por Etapa
      </h3>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width="50%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#111827",
                border: "1px solid #374151",
                borderRadius: "8px",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5">
          {chartData.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-xs text-gray-400 truncate flex-1">
                {item.name}
              </span>
              <span className="text-xs font-medium text-gray-300">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
