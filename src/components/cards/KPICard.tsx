"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  loading?: boolean;
}

export default function KPICard({
  label,
  value,
  prefix,
  suffix,
  change,
  changeLabel,
  loading,
}: KPICardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 animate-pulse">
        <div className="h-4 w-24 rounded bg-gray-800 mb-3" />
        <div className="h-8 w-32 rounded bg-gray-800" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-gray-700">
      <p className="text-sm font-medium text-gray-400">{label}</p>
      <div className="mt-2 flex items-baseline gap-1">
        {prefix && <span className="text-sm text-gray-500">{prefix}</span>}
        <span className="text-2xl font-bold text-white">
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
        </span>
        {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
      </div>
      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1">
          {change > 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
          ) : change < 0 ? (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-gray-500" />
          )}
          <span
            className={`text-xs font-medium ${
              change > 0
                ? "text-green-500"
                : change < 0
                  ? "text-red-500"
                  : "text-gray-500"
            }`}
          >
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
          {changeLabel && (
            <span className="text-xs text-gray-600">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
