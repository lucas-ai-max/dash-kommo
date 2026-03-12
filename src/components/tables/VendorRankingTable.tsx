"use client";

import { useState } from "react";
import type { DashboardMetricsVendedor } from "@/types/database";

interface Props {
  data: DashboardMetricsVendedor[];
}

export default function VendorRankingTable({ data }: Props) {
  const sorted = [...data].sort(
    (a, b) => (b.receita_total || 0) - (a.receita_total || 0)
  );

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [metas, setMetas] = useState<Record<number, number>>({});

  function getPercentual(v: DashboardMetricsVendedor) {
    const meta = metas[v.responsible_user_id] ?? v.meta_mensal ?? 0;
    if (!meta) return v.percentual_meta ?? 0;
    return Number((((v.receita_total || 0) / meta) * 100).toFixed(2));
  }

  async function saveMeta(v: DashboardMetricsVendedor) {
    const val = parseFloat(editValue.replace(/\./g, "").replace(",", "."));
    if (isNaN(val)) { setEditingId(null); return; }
    setMetas(prev => ({ ...prev, [v.responsible_user_id]: val }));
    setEditingId(null);
    await fetch("/api/metas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responsible_user_id: v.responsible_user_id,
        responsible_user_name: v.responsible_user_name,
        meta_receita: val,
      }),
    });
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-white">Ranking de Vendedores</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-800 text-xs font-medium text-gray-500 uppercase">
              <th className="px-5 py-3">#</th>
              <th className="px-5 py-3">Vendedor</th>
              <th className="px-5 py-3 text-right">Leads</th>
              <th className="px-5 py-3 text-right">Vendas</th>
              <th className="px-5 py-3 text-right">Conversão</th>
              <th className="px-5 py-3 text-right">Ciclo Médio</th>
              <th className="px-5 py-3 text-right">Ticket Médio</th>
              <th className="px-5 py-3 text-right">Receita</th>
              <th className="px-5 py-3 text-right">Meta</th>
              <th className="px-5 py-3 text-right">% Meta</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((v, i) => {
              const pct = getPercentual(v);
              const metaAtual = metas[v.responsible_user_id] ?? v.meta_mensal ?? 0;
              return (
                <tr key={v.responsible_user_id} className="border-b border-gray-800/50 transition-colors hover:bg-gray-800/30">
                  <td className="px-5 py-3 text-sm text-gray-500">{i + 1}</td>
                  <td className="px-5 py-3 text-sm font-medium text-white">{v.responsible_user_name || "—"}</td>
                  <td className="px-5 py-3 text-right text-sm text-gray-300">{v.total_leads}</td>
                  <td className="px-5 py-3 text-right text-sm text-green-400">{v.leads_won}</td>
                  <td className="px-5 py-3 text-right text-sm text-gray-300">
                    {v.taxa_conversao != null ? `${v.taxa_conversao}%` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-gray-300">
                    {v.ciclo_medio_dias != null ? `${v.ciclo_medio_dias}d` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-gray-300">
                    {v.ticket_medio != null ? `R$ ${Number(v.ticket_medio).toLocaleString("pt-BR")}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-medium text-white">
                    {v.receita_total != null ? `R$ ${Number(v.receita_total).toLocaleString("pt-BR")}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right text-sm">
                    {editingId === v.responsible_user_id ? (
                      <input
                        autoFocus
                        className="w-28 bg-gray-800 border border-blue-500 rounded px-2 py-0.5 text-right text-white text-xs outline-none"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => saveMeta(v)}
                        onKeyDown={e => { if (e.key === "Enter") saveMeta(v); if (e.key === "Escape") setEditingId(null); }}
                        placeholder="ex: 50000"
                      />
                    ) : (
                      <button
                        onClick={() => { setEditingId(v.responsible_user_id); setEditValue(metaAtual ? String(metaAtual) : ""); }}
                        className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                        title="Clique para definir meta"
                      >
                        {metaAtual > 0 ? `R$ ${Number(metaAtual).toLocaleString("pt-BR")}` : <span className="text-gray-600">Definir</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {pct > 0 ? (
                      <span className={`text-sm font-medium ${pct >= 100 ? "text-green-400" : pct >= 70 ? "text-yellow-400" : "text-red-400"}`}>
                        {pct}%
                      </span>
                    ) : (
                      <span className="text-sm text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={10} className="px-5 py-8 text-center text-sm text-gray-500">
                  Sem dados disponíveis
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
