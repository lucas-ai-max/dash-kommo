"use client";

import Header from "@/components/layout/Header";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useCanalMetrics } from "@/hooks/useMetrics";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// ─── Channel config ──────────────────────────────────────────────────────────
const CHANNEL_CONFIG: Record<string, {
  icon: string;
  neonColor: string;
  glowColor: string;
  bgDot: string;
}> = {
  WhatsApp: { icon: "💬", neonColor: "#00D64F", glowColor: "rgba(0,214,79,0.5)", bgDot: "rgba(0,214,79,0.1)" },
  Instagram: { icon: "📸", neonColor: "#8B5CF6", glowColor: "rgba(139,92,246,0.5)", bgDot: "rgba(139,92,246,0.1)" },
  Site: { icon: "🌐", neonColor: "#3B82F6", glowColor: "rgba(59,130,246,0.5)", bgDot: "rgba(59,130,246,0.1)" },
  "Facebook Ads": { icon: "📘", neonColor: "#3B82F6", glowColor: "rgba(59,130,246,0.5)", bgDot: "rgba(59,130,246,0.1)" },
  "Google Ads": { icon: "🔺", neonColor: "#EF4444", glowColor: "rgba(239,68,68,0.5)", bgDot: "rgba(239,68,68,0.1)" },
};
const DEFAULT_CFG = { icon: "📊", neonColor: "#6B7280", glowColor: "rgba(107,114,128,0.4)", bgDot: "rgba(107,114,128,0.1)" };

const DONUT_COLORS = ["#EF4444", "#3B82F6", "#00D64F", "#8B5CF6", "#94A3B8", "#F97316"];
const CARD_BG = "#1E212B";

// ─── SVG circular progress (matches canais.html style) ─────────────────────
function CircularProgress({ pct, color }: { pct: number; color: string }) {
  const dashArray = `${Math.round(Math.min(pct, 100))} 100`;
  return (
    <svg viewBox="0 0 36 36" className="block w-32 h-32 mx-auto">
      <path
        className="fill-none"
        stroke="#333"
        strokeWidth="3.8"
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
      />
      <path
        className="fill-none"
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeDasharray={dashArray}
        style={{ animation: "progress 1s ease-out forwards" }}
        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
      />
      <text
        x="18" y="20.35"
        textAnchor="middle"
        style={{ fill: "#fff", fontWeight: "bold", fontSize: "0.5em" }}
      >
        {pct}%
      </text>
      <text
        x="18" y="26"
        textAnchor="middle"
        style={{ fill: "#9ca3af", fontSize: "0.18em" }}
      >
        Conversão
      </text>
    </svg>
  );
}

export default function CanaisPage() {
  const { periodo } = useDateFilter();
  const { data: canais, isLoading } = useCanalMetrics(periodo);
  const currentData = (canais || []).sort((a, b) => b.total_leads - a.total_leads);

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
  }));

  if (isLoading) {
    return (
      <>
        <Header title="Performance de Canais Moderna" subtitle="Análise de aquisição e eficiência por origem de leads" showDateFilter={false} />
        <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-56 rounded-xl bg-gray-800" />)}
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

      {/* 3-col layout: cards (2/3) + sidebar (1/3) */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: Channel Cards Grid ── */}
          <section className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {currentData.slice(0, 6).map((c) => {
              const cfg = CHANNEL_CONFIG[c.canal_venda] || DEFAULT_CFG;
              return (
                <article
                  key={c.canal_venda}
                  className="rounded-xl p-5 relative overflow-hidden border-2 transition-transform hover:scale-[1.02]"
                  style={{
                    backgroundColor: CARD_BG,
                    borderColor: cfg.neonColor + "80",
                    boxShadow: `0 0 15px ${cfg.glowColor}`,
                  }}
                >
                  {/* Icon + Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: cfg.bgDot, color: cfg.neonColor }}
                    >
                      {cfg.icon}
                    </div>
                    <h3 className="font-semibold text-lg text-white">{c.canal_venda}</h3>
                  </div>

                  {/* Volume */}
                  <div className="text-center mb-2">
                    <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Volume</p>
                    <p className="text-xl font-bold text-white">{c.total_leads.toLocaleString("pt-BR")} Leads</p>
                  </div>

                  {/* SVG circular progress */}
                  <div className="my-2" style={{ color: cfg.neonColor }}>
                    <CircularProgress pct={c.taxa_conversao || 0} color={cfg.neonColor} />
                  </div>

                  {/* Lost leads */}
                  <div className="mt-4 pt-3 border-t border-gray-700 text-center">
                    <p className="text-gray-500 text-xs">
                      {(c.leads_lost || 0).toLocaleString("pt-BR")} Leads Perdidos
                    </p>
                  </div>
                </article>
              );
            })}

            {currentData.length === 0 && (
              <p className="col-span-3 text-center text-sm text-gray-500 py-12">
                Sem dados de canais para o período selecionado.
              </p>
            )}
          </section>

          {/* ── Right: Donut + Highlights ── */}
          <aside className="lg:col-span-1 flex flex-col gap-6">

            {/* Donut chart */}
            <div
              className="rounded-xl p-6 border border-gray-800"
              style={{ backgroundColor: CARD_BG }}
            >
              <h3 className="text-lg font-bold mb-4 text-white">Volume de Leads por Canal</h3>
              <div className="flex items-center gap-4">
                {/* Donut */}
                <div className="w-2/5">
                  <ResponsiveContainer width="100%" height={128}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {donutData.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: any, name: any) => [`${v} leads`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="w-3/5 space-y-2.5">
                  {donutData.map((d, i) => (
                    <div key={d.name} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                        />
                        <span className="text-gray-300 truncate">{d.name}</span>
                      </div>
                      <span className="font-medium text-gray-400 ml-1">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Highlight cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">

              {/* Best Volume */}
              <div
                className="rounded-xl p-4 flex flex-col items-center text-center justify-center border-2"
                style={{
                  backgroundColor: CARD_BG,
                  borderColor: "#FACC1580",
                  boxShadow: "0 0 20px rgba(250,204,21,0.5)",
                }}
              >
                <h4 className="text-[10px] uppercase font-bold tracking-wider mb-3" style={{ color: "#FACC15" }}>
                  Melhor Canal em Volume
                </h4>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 border"
                  style={{ backgroundColor: "#3A2E05", borderColor: "#FACC15", color: "#FACC15" }}
                >
                  {(CHANNEL_CONFIG[bestVolume?.canal_venda] || DEFAULT_CFG).icon}
                </div>
                <p className="font-bold text-base text-white">{bestVolume?.canal_venda || "—"}</p>
                <p className="text-xl font-bold mt-1 text-white">
                  {bestVolume?.total_leads?.toLocaleString("pt-BR") || 0} Leads
                </p>
              </div>

              {/* Best Conversion */}
              <div
                className="rounded-xl p-4 flex flex-col items-center text-center justify-center border-2"
                style={{
                  backgroundColor: CARD_BG,
                  borderColor: "#E2E8F080",
                  boxShadow: "0 0 20px rgba(226,232,240,0.5)",
                }}
              >
                <h4 className="text-[10px] uppercase font-bold tracking-wider mb-3 text-gray-300">
                  Melhor Canal em Conversão
                </h4>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 border border-gray-500"
                  style={{ backgroundColor: "#374151", color: "#fff" }}
                >
                  {(CHANNEL_CONFIG[bestConversion?.canal_venda] || DEFAULT_CFG).icon}
                </div>
                <p className="font-bold text-base text-white">{bestConversion?.canal_venda || "—"}</p>
                <p className="text-xl font-bold mt-1 text-white">
                  {bestConversion?.taxa_conversao || 0}% Taxa
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* CSS for SVG circular progress animation */}
      <style>{`
        @keyframes progress {
          0% { stroke-dasharray: 0 100; }
        }
      `}</style>
    </>
  );
}
