"use client";

import { useState } from "react";
import { useDateFilter, getPeriodoLabel } from "@/hooks/useDateFilter";
import type { Periodo } from "@/types/metrics";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

const periodos: Periodo[] = ["todos", "hoje", "7dias", "30dias", "mes_atual"];

export default function DateFilter() {
  const { periodo, setPeriodo, dateRange, setDateRange } = useDateFilter();
  const [showCustom, setShowCustom] = useState(false);

  const handlePreset = (p: Periodo) => {
    setShowCustom(false);
    setPeriodo(p);
  };

  const handleCustomClick = () => {
    setShowCustom(true);
    if (!dateRange) {
      const today = format(new Date(), "yyyy-MM-dd");
      const thirtyDaysAgo = format(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        "yyyy-MM-dd"
      );
      setDateRange({
        from: thirtyDaysAgo + "T00:00:00",
        to: today + "T23:59:59",
      });
    }
    setPeriodo("custom");
  };

  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-900 p-1">
      <Calendar className="ml-2 h-4 w-4 text-gray-500" />
      {periodos.map((p) => (
        <button
          key={p}
          onClick={() => handlePreset(p)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            periodo === p
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {getPeriodoLabel(p)}
        </button>
      ))}
      <button
        onClick={handleCustomClick}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
          periodo === "custom"
            ? "bg-blue-600 text-white"
            : "text-gray-400 hover:text-gray-200"
        }`}
      >
        Personalizado
      </button>
      {showCustom && periodo === "custom" && (
        <div className="ml-2 flex items-center gap-1.5">
          <input
            type="date"
            value={dateRange?.from?.slice(0, 10) || ""}
            onChange={(e) =>
              setDateRange({
                from: e.target.value + "T00:00:00",
                to: dateRange?.to || format(new Date(), "yyyy-MM-dd") + "T23:59:59",
              })
            }
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200"
          />
          <span className="text-xs text-gray-500">até</span>
          <input
            type="date"
            value={dateRange?.to?.slice(0, 10) || ""}
            onChange={(e) =>
              setDateRange({
                from: dateRange?.from || format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd") + "T00:00:00",
                to: e.target.value + "T23:59:59",
              })
            }
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200"
          />
        </div>
      )}
    </div>
  );
}
