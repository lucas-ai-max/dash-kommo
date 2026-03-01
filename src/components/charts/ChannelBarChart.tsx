"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DashboardMetricsCanal } from "@/types/database";

interface Props {
  data: DashboardMetricsCanal[];
}

export default function ChannelBarChart({ data }: Props) {
  const chartData = data.map((d) => ({
    canal: d.canal_venda,
    won: d.leads_won,
    lost: d.leads_lost,
    active: d.total_leads - d.leads_won - d.leads_lost,
  }));

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">
        Leads por Canal
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="canal"
            tick={{ fill: "#6b7280", fontSize: 11 }}
            tickLine={false}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: "8px",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="won" name="Ganhos" fill="#22c55e" stackId="a" radius={[0, 0, 0, 0]} />
          <Bar dataKey="lost" name="Perdidos" fill="#ef4444" stackId="a" />
          <Bar dataKey="active" name="Ativos" fill="#3b82f6" stackId="a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
