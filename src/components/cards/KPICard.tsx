"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ReactNode } from "react";

interface KPICardProps {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  loading?: boolean;
  icon?: ReactNode;
  color?: "blue" | "green" | "purple" | "orange" | "cyan" | "red";
  /** "glow" = Stitch style (radial glow behind icon, no left border, larger value) */
  variant?: "default" | "glow";
}

const COLOR_MAP = {
  blue: {
    border: "border-l-blue-500",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    radial: "bg-blue-500/10",
    glow: "rgba(59,130,246,0.3)",
  },
  green: {
    border: "border-l-green-500",
    bg: "bg-green-500/10",
    text: "text-green-400",
    radial: "bg-green-500/10",
    glow: "rgba(34,197,94,0.3)",
  },
  purple: {
    border: "border-l-purple-500",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    radial: "bg-cyan-500/10",
    glow: "rgba(6,182,212,0.3)",
  },
  orange: {
    border: "border-l-orange-500",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    radial: "bg-green-500/10",
    glow: "rgba(34,197,94,0.3)",
  },
  cyan: {
    border: "border-l-cyan-500",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    radial: "bg-cyan-500/10",
    glow: "rgba(6,182,212,0.3)",
  },
  red: {
    border: "border-l-red-500",
    bg: "bg-red-500/10",
    text: "text-red-400",
    radial: "bg-red-500/10",
    glow: "rgba(239,68,68,0.3)",
  },
};

export default function KPICard({
  label,
  value,
  prefix,
  suffix,
  change,
  changeLabel,
  loading,
  icon,
  color,
  variant = "default",
}: KPICardProps) {
  const c = color ? COLOR_MAP[color] : null;

  if (loading) {
    return (
      <div
        className={`rounded-2xl border border-white/5 p-5 animate-pulse ${variant === "glow" ? "" : c ? `border-l-4 ${c.border}` : ""}`}
        style={{ backgroundColor: variant === "glow" ? "#1b1e2b" : undefined }}
      >
        <div className="h-4 w-24 rounded bg-gray-800 mb-3" />
        <div className="h-8 w-32 rounded bg-gray-800" />
      </div>
    );
  }

  if (variant === "glow") {
    return (
      <article
        className="rounded-2xl p-5 relative overflow-hidden border border-white/5 hover:border-white/10 transition-all"
        style={{ backgroundColor: "#1b1e2b" }}
      >
        {/* Radial glow behind icon */}
        {c && (
          <div
            className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none ${c.radial}`}
          />
        )}
        <div className="flex justify-between items-center relative z-10">
          <div>
            <p className="text-gray-400 text-sm font-medium">{label}</p>
            <div className="flex items-baseline gap-1 mt-1">
              {prefix && <span className="text-base text-gray-400">{prefix}</span>}
              <h3 className="text-3xl font-bold text-white">
                {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
              </h3>
              {suffix && <span className="text-base text-gray-400">{suffix}</span>}
            </div>
          </div>
          {icon && c && (
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.bg} ${c.text}`}
              style={{ boxShadow: `0 0 15px ${c.glow}, inset 0 0 10px ${c.glow.replace("0.3", "0.1")}` }}
            >
              <div className="[&>svg]:h-6 [&>svg]:w-6">{icon}</div>
            </div>
          )}
        </div>
      </article>
    );
  }

  // Default variant (colored left border)
  return (
    <div
      className={`rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all hover:border-gray-700 hover:shadow-lg ${c ? `border-l-4 ${c.border}` : ""
        }`}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-400">{label}</p>
        {icon && c && (
          <div className={`rounded-lg p-2 ${c.bg}`}>
            <div className={c.text}>{icon}</div>
          </div>
        )}
      </div>
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
            className={`text-xs font-medium ${change > 0
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
