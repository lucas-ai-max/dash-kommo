"use client";

import Header from "@/components/layout/Header";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useCanalMetrics } from "@/hooks/useMetrics";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, Volume2 } from "lucide-react";

const CHANNEL_ICONS: Record<string, { emoji: string; bg: string; border: string }> = {
  WhatsApp: { emoji: "💬", bg: "from-green-500/20 to-green-900/10", border: "border-green-500/40" },
  Instagram: { emoji: "📸", bg: "from-pink-500/20 to-purple-900/10", border: "border-pink-500/40" },
  Site: { emoji: "🌐", bg: "from-blue-500/20 to-blue-900/10", border: "border-blue-500/40" },
  "Facebook Ads": { emoji: "📘", bg: "from-blue-600/20 to-blue-900/10", border: "border-blue-600/40" },
  "Google Ads": { emoji: "🔍", bg: "from-yellow-500/20 to-yellow-900/10", border: "border-yellow-500/40" },
};

const DEFAULT_CHANNEL = { emoji: "📊", bg: "from-gray-500/20 to-gray-900/10", border: "border-gray-500/40" };

const DONUT_COLORS = ["#22c55e", "#ec4899", "#3b82f6", "#6366f1", "#eab308", "#ef4444", "#8b5cf6", "#f97316"];

function RadialProgress({ value, size = 80 }: { value: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1f2937" strokeWidth={5} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={value > 15 ? "#22c55e" : value > 5 ? "#eab308" : "#ef4444"}
          strokeWidth={5}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{value}%</span>
      </div>
    </div>
  );
}

export default function CanaisPage() {
  const { periodo } = useDateFilter();
  const { data: canais, isLoading } = useCanalMetrics(periodo);
  const currentData = canais || [];

  const totalLeads = currentData.reduce((s, c) => s + c.total_leads, 0);

  const bestVolume = currentData.reduce(
    (best, c) => (c.total_leads > (best?.total_leads || 0) ? c : best),
    currentData[0]
  );
  const bestConversion = currentData.reduce(
    (best, c) => ((c.taxa_conversao || 0) > (best?.taxa_conversao || 0) ? c : best),
    currentData[0]
  );

  const donutData = currentData.map((c) => ({
    name: c.canal_venda,
    value: c.total_leads,
    pct: totalLeads > 0 ? Math.round((c.total_leads / totalLeads) * 100) : 0,
  })).sort((a, b) => b.value - a.value);

  if (isLoading) {
    return (
      <>
        <Header title="Performance de Canais Moderna" subtitle="Análise de aquisição e eficiência por origem de leads" showDateFilter={false} />
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (<div key={i} className="h-40 rounded-xl bg-gray-800" />))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Performance de Canais Moderna"
        subtitle="Análise de aquisição e eficiência por origem de leads"
        showDateFilter={false}
      />

      <div className="space-y-6 p-6">
        {/* Channel Cards + Donut */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {currentData
            .sort((a, b) => b.total_leads - a.total_leads)
            .slice(0, 6)
            .map((c) => {
              const style = CHANNEL_ICONS[c.canal_venda] || DEFAULT_CHANNEL;
              return (
                <div
                  key={c.canal_venda}
                  className={`rounded-xl border ${style.border} bg-gradient-to-br ${style.bg} bg-gray-900 p-5 transition-all hover:scale-[1.02] hover:shadow-lg`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{style.emoji}</span>
                        <span className="text-sm font-semibold text-white">{c.canal_venda}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">Volume: {c.total_leads} Leads</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center my-3">
                    <RadialProgress value={c.taxa_conversao || 0} />
                  </div>
                  <p className="text-center text-xs text-gray-500">Conversão</p>
                  <p className="mt-2 text-center text-xs text-red-400">{c.leads_lost} Leads Perdidos</p>
                </div>
              );
            })}

          {/* Donut Chart */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 md:col-span-2 lg:col-span-2">
            <h3 className="mb-2 text-sm font-semibold text-white">Volume de Leads por Canal</h3>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", fontSize: 12 }}
                    formatter={(value: number, name: string) => [`${value} leads`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5">
                {donutData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="rounded bg-gray-800 px-1.5 py-0.5 text-gray-300">{d.name}</span>
                    <span className="text-gray-500">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Best Channel Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-yellow-600/30 bg-gradient-to-r from-yellow-900/20 to-transparent bg-gray-900 p-5">
            <p className="text-xs text-gray-500 mb-1">Melhor Canal em Volume</p>
            <div className="flex items-center gap-3">
              <Volume2 className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-lg font-bold text-white">{bestVolume?.canal_venda || "—"}</p>
                <p className="text-sm text-gray-400">{bestVolume?.total_leads || 0} Leads</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-green-600/30 bg-gradient-to-r from-green-900/20 to-transparent bg-gray-900 p-5">
            <p className="text-xs text-gray-500 mb-1">Melhor Canal em Conversão</p>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-lg font-bold text-white">{bestConversion?.canal_venda || "—"}</p>
                <p className="text-sm text-gray-400">{bestConversion?.taxa_conversao || 0}% Taxa</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
