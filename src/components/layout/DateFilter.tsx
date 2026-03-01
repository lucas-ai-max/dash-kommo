"use client";

import { useDateFilter, getPeriodoLabel } from "@/hooks/useDateFilter";
import type { Periodo } from "@/types/metrics";
import { Calendar } from "lucide-react";

const periodos: Periodo[] = ["hoje", "7dias", "30dias", "mes_atual"];

export default function DateFilter() {
  const { periodo, setPeriodo } = useDateFilter();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-900 p-1">
      <Calendar className="ml-2 h-4 w-4 text-gray-500" />
      {periodos.map((p) => (
        <button
          key={p}
          onClick={() => setPeriodo(p)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            periodo === p
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {getPeriodoLabel(p)}
        </button>
      ))}
    </div>
  );
}
