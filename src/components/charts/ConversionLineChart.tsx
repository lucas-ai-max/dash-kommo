"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DashboardMetrics } from "@/types/database";

interface Props {
  data: DashboardMetrics[];
}

export default function ConversionLineChart({ data }: Props) {
  const chartData = data.map((d) => ({
    date: new Date(d.metric_date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
    leads: d.total_leads,
    vendas: d.leads_won,
    perdas: d.leads_lost,
  }));

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">
        Leads vs Vendas (Últimos 30 dias)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#6b7280", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: "8px",
              fontSize: 12,
            }}
            labelStyle={{ color: "#9ca3af" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#9ca3af" }}
          />
          <Line
            type="monotone"
            dataKey="leads"
            name="Leads"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="vendas"
            name="Vendas"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="perdas"
            name="Perdas"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
