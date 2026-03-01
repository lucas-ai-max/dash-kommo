"use client";

import type { DashboardFunil } from "@/types/database";

interface Props {
  data: DashboardFunil[];
  preserveOrder?: boolean;
}

const COLORS = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
];

export default function FunnelChart({ data, preserveOrder }: Props) {
  if (!data.length) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h3 className="text-sm font-semibold text-white">Funil de Conversão</h3>
        <p className="mt-8 text-center text-sm text-gray-500">
          Sem dados disponíveis
        </p>
      </div>
    );
  }

  const sorted = preserveOrder
    ? data
    : [...data].sort((a, b) => (b.leads_atual || 0) - (a.leads_atual || 0));
  const maxValue = Math.max(...sorted.map((s) => s.leads_atual || 0), 1);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">
        Funil de Conversão
      </h3>
      <div className="space-y-2">
        {sorted.map((stage, index) => {
          const width = Math.max(
            ((stage.leads_atual || 0) / maxValue) * 100,
            8
          );
          const color = COLORS[index % COLORS.length];

          return (
            <div key={`${stage.pipeline_id}-${stage.status_id}`} className="flex items-center gap-3">
              <div className="w-28 shrink-0 text-right">
                <p className="text-xs font-medium text-gray-300 truncate">
                  {stage.status_name}
                </p>
              </div>
              <div className="flex-1">
                <div
                  className="flex h-8 items-center rounded-md px-3 transition-all"
                  style={{ width: `${width}%`, backgroundColor: color }}
                >
                  <span className="text-xs font-bold text-white">
                    {stage.leads_atual}
                  </span>
                </div>
              </div>
              {stage.taxa_passagem != null && (
                <span className="w-14 text-right text-xs text-gray-500">
                  {stage.taxa_passagem}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
