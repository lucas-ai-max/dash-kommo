"use client";

import { useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import { useDateFilter } from "@/hooks/useDateFilter";
import { usePerdasData, usePerdasPorEtapa, usePerdasByOrigin, usePerdasLeadsQuentes } from "@/hooks/useMetrics";
import type { DashboardPerdas } from "@/types/database";
import InfoTooltip from "@/components/ui/InfoTooltip";

const CARD_BG = "#14161f";
const ACCENT = "#ff5252";

// ─── Horizontal CSS bar ───────────────────────────────────────────────────────
function HBarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 mb-2.5 text-xs">
      <span className="text-gray-400 text-right truncate shrink-0" style={{ width: "42%" }}>
        {label}
      </span>
      <div
        className="flex-1 h-2 rounded-full"
        style={{ backgroundColor: "rgba(255,255,255,0.05)", overflow: "hidden" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: ACCENT }}
        />
      </div>
      <span className="text-gray-200 font-medium text-right shrink-0" style={{ width: 30 }}>
        {value}
      </span>
    </div>
  );
}

// ─── Mini KPI card ────────────────────────────────────────────────────────────
function MiniKPI({ label, value, tooltip }: { label: string; value: string | number; tooltip?: string }) {
  return (
    <div
      className="rounded-lg p-2.5 border border-gray-800 flex flex-col gap-1"
      style={{ backgroundColor: CARD_BG }}
    >
      <span className="text-[11px] text-gray-400 leading-tight flex items-center gap-1">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </span>
      <span className="text-xl font-bold leading-none mt-auto" style={{ color: ACCENT }}>
        {value}
      </span>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ title }: { title: string }) {
  return (
    <section className="flex flex-col gap-4 min-w-0">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <div
        className="rounded-xl border border-gray-800/50 flex flex-col items-center justify-center text-center p-8 flex-1"
        style={{ background: "linear-gradient(to bottom right, #3a1515, #0b0d17)", minHeight: 400 }}
      >
        <div className="text-5xl mb-4">📂</div>
        <p className="text-gray-500 text-sm">Sem perdas registradas nesta pipeline.</p>
      </div>
    </section>
  );
}

// ─── Pipeline section ─────────────────────────────────────────────────────────
function PipelineSection({
  title,
  data,
  isLoading,
}: {
  title: string;
  data: DashboardPerdas[];
  isLoading: boolean;
}) {
  const byMotivo = new Map<string, number>();
  for (const p of data) {
    const m = p.motivo_perda || "Sem motivo";
    byMotivo.set(m, (byMotivo.get(m) || 0) + p.quantidade);
  }
  const motivoRanking = Array.from(byMotivo.entries())
    .map(([motivo, quantidade]) => ({ motivo, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const totalPerdas = data.reduce((s, p) => s + p.quantidade, 0);
  const topMotivo = motivoRanking[0];
  const topPct =
    topMotivo && totalPerdas > 0
      ? ((topMotivo.quantidade / totalPerdas) * 100).toFixed(1) + "%"
      : "—";
  const maxBar = motivoRanking[0]?.quantidade || 1;

  const tableRows = data
    .map((p) => ({
      ...p,
      pct: totalPerdas > 0 ? ((p.quantidade / totalPerdas) * 100).toFixed(2) : "0",
    }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 10);

  if (isLoading) {
    return (
      <section className="flex flex-col gap-3 animate-pulse min-w-0">
        <div className="h-5 w-36 bg-gray-700 rounded" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-lg bg-gray-800" />)}
        </div>
        <div className="h-52 rounded-lg bg-gray-800" />
        <div className="h-40 rounded-lg bg-gray-800" />
      </section>
    );
  }

  if (totalPerdas === 0) return <EmptyState title={title} />;

  return (
    <section className="flex flex-col gap-3 min-w-0">
      <h2 className="text-base font-semibold text-white">{title}</h2>

      {/* 4 KPI mini-cards */}
      <div className="grid grid-cols-4 gap-2">
        <MiniKPI label="Total de Perdas" value={totalPerdas} tooltip="Quantidade de leads marcados como perdidos na pipeline." />
        <MiniKPI label="Motivos Distintos" value={motivoRanking.length} tooltip="Quantidade de motivos de perda diferentes registrados." />
        {/* Principal Motivo — special: smaller text */}
        <div
          className="rounded-lg p-2.5 border border-gray-800 flex flex-col gap-1"
          style={{ backgroundColor: CARD_BG }}
        >
          <span className="text-[11px] text-gray-400 leading-tight flex items-center gap-1">
            Principal Motivo
            <InfoTooltip text="Motivo de perda com maior frequência." />
          </span>
          <span className="text-xs font-bold leading-tight mt-auto line-clamp-2" style={{ color: ACCENT }}>
            {topMotivo?.motivo || "—"}
          </span>
        </div>
        <MiniKPI label="% do Principal" value={topPct} tooltip="Percentual do motivo mais frequente sobre o total de perdas." />
      </div>

      {/* Bar chart */}
      <div
        className="rounded-lg border border-gray-800 p-4"
        style={{ backgroundColor: CARD_BG }}
      >
        <h3 className="text-xs font-semibold text-gray-300 mb-3">Ranking de Motivos de Perda</h3>
        {motivoRanking.slice(0, 8).map((r) => (
          <HBarRow key={r.motivo} label={r.motivo} value={r.quantidade} max={maxBar} />
        ))}
        {/* Axis */}
        <div
          className="flex justify-between text-[9px] text-gray-600 mt-2 pt-2 border-t border-gray-800"
          style={{ paddingLeft: "44%" }}
        >
          <span>0</span>
          <span>{Math.round(maxBar * 0.33)}</span>
          <span>{Math.round(maxBar * 0.66)}</span>
          <span>{maxBar}</span>
        </div>
      </div>

      {/* Detail table */}
      <div
        className="rounded-lg border border-gray-800 overflow-hidden flex flex-col"
        style={{ backgroundColor: CARD_BG, maxHeight: 260 }}
      >
        <div className="px-3 py-2.5 border-b border-gray-800 shrink-0">
          <h3 className="text-xs font-semibold text-gray-300">Detalhamento de Perdas</h3>
        </div>
        <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: "thin" }}>
          <table className="w-full text-[11px]" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "28%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "28%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead
              className="uppercase text-[9px] text-gray-500 font-semibold sticky top-0"
              style={{ backgroundColor: CARD_BG }}
            >
              <tr>
                <th className="px-2 py-2 text-left">Motivo</th>
                <th className="px-1 py-2 text-left">Canal</th>
                <th className="px-1 py-2 text-left">Responsável</th>
                <th className="px-1 py-2 text-right">QTD</th>
                <th className="px-2 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40 text-gray-300">
              {tableRows.map((p, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-2 py-2 truncate">{p.motivo_perda || "Sem motivo"}</td>
                  <td className="px-1 py-2 text-gray-500 truncate">{p.canal_venda || "—"}</td>
                  <td className="px-1 py-2 text-gray-400 truncate">{p.responsible_user_name || "—"}</td>
                  <td className="px-1 py-2 text-right font-bold" style={{ color: ACCENT }}>{p.quantidade}</td>
                  <td className="px-2 py-2 text-right" style={{ color: ACCENT }}>{p.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PerdasPage() {
  const { periodo } = useDateFilter();
  const { data: perdas, isLoading } = usePerdasData(periodo);
  const { data: perdasPorEtapa } = usePerdasPorEtapa(periodo);
  const { data: perdasByOrigin } = usePerdasByOrigin(periodo);
  const { data: perdasQuentes } = usePerdasLeadsQuentes(periodo);
  const [filterCanal, setFilterCanal] = useState<string | undefined>(undefined);
  const [filterVendor, setFilterVendor] = useState<string | undefined>(undefined);
  const currentData = perdas || [];

  // Extract unique canais and vendors for filters
  const canais = useMemo(() => {
    const set = new Set<string>();
    currentData.forEach((p) => set.add(p.canal_venda || "Sem canal"));
    return Array.from(set).sort();
  }, [currentData]);

  const vendors = useMemo(() => {
    const set = new Set<string>();
    currentData.forEach((p) => set.add(p.responsible_user_name || "Sem responsavel"));
    return Array.from(set).sort();
  }, [currentData]);

  // Apply filters
  const filtered = currentData.filter((p) => {
    if (filterCanal && (p.canal_venda || "Sem canal") !== filterCanal) return false;
    if (filterVendor && (p.responsible_user_name || "Sem responsavel") !== filterVendor) return false;
    return true;
  });

  const sdrData = filtered.filter((p) => p.pipeline_name === "BOT");
  const vendedoresData = filtered.filter((p) => p.pipeline_name === "VENDEDORES");
  const implantacaoData = filtered.filter(
    (p) => p.pipeline_name !== "VENDEDORES" && p.pipeline_name !== "BOT"
  );

  return (
    <>
      <Header
        title="Diagnostico de Perdas"
        subtitle="Analise detalhada dos motivos de perdas por pipeline."
      />

      <div className="flex-1 overflow-y-auto p-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Canal:</span>
            <select
              value={filterCanal || ""}
              onChange={(e) => setFilterCanal(e.target.value || undefined)}
              className="bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 px-3 py-1.5 focus:outline-none focus:border-purple-500"
            >
              <option value="">Todos</option>
              {canais.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Responsavel:</span>
            <select
              value={filterVendor || ""}
              onChange={(e) => setFilterVendor(e.target.value || undefined)}
              className="bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 px-3 py-1.5 focus:outline-none focus:border-purple-500"
            >
              <option value="">Todos</option>
              {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {(filterCanal || filterVendor) && (
            <button
              onClick={() => { setFilterCanal(undefined); setFilterVendor(undefined); }}
              className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1 rounded-full transition-all"
            >
              Limpar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <PipelineSection title="Perdas — SDR" data={sdrData} isLoading={isLoading} />
          <PipelineSection title="Perdas — Vendedores" data={vendedoresData} isLoading={isLoading} />
          {implantacaoData.length > 0
            ? <PipelineSection title="Perdas — Teste Implantacao" data={implantacaoData} isLoading={isLoading} />
            : <EmptyState title="Perdas — Teste Implantacao" />
          }
        </div>

        {/* Perdas por Etapa — using last_active_stage */}
        {perdasPorEtapa && perdasPorEtapa.length > 0 && (
          <div className="mt-5">
            <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              Perdas por Etapa
              <InfoTooltip text="Mostra em qual etapa do funil o lead estava antes de ser perdido. Dados populados a partir das proximas sincronizacoes." />
            </h2>
            <div
              className="rounded-lg border border-gray-800 overflow-hidden"
              style={{ backgroundColor: CARD_BG }}
            >
              <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                <table className="w-full text-xs" style={{ tableLayout: "auto" }}>
                  <thead className="uppercase text-[9px] text-gray-500 font-semibold" style={{ backgroundColor: CARD_BG }}>
                    <tr>
                      <th className="px-3 py-2.5 text-left">Etapa</th>
                      <th className="px-2 py-2.5 text-right">Total</th>
                      <th className="px-3 py-2.5 text-left">Principais Motivos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40 text-gray-300">
                    {perdasPorEtapa.map((etapa) => (
                      <tr key={etapa.stage} className="hover:bg-white/5 transition-colors">
                        <td className="px-3 py-2 font-medium text-white">{etapa.stage}</td>
                        <td className="px-2 py-2 text-right font-bold" style={{ color: ACCENT }}>{etapa.count}</td>
                        <td className="px-3 py-2 text-gray-400">
                          {etapa.motivos.slice(0, 3).map((m, i) => (
                            <span key={m.motivo}>
                              {m.motivo} ({m.count}){i < Math.min(etapa.motivos.length, 3) - 1 ? " · " : ""}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* D1: Comparativo de Perdas por Origem */}
        {perdasByOrigin && perdasByOrigin.length > 0 && (
          <div className="mt-5">
            <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              Comparativo de Perdas por Origem
              <InfoTooltip text="Compara motivos de perda segmentados pela origem do lead: Bot/IA, SDR (transferido de outro pipeline), ou Direto (entrou direto no pipeline)." />
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {perdasByOrigin.map((origin) => {
                const maxMotivo = origin.motivos[0]?.count || 1;
                return (
                  <div
                    key={origin.origin}
                    className="rounded-lg border border-gray-800 p-4"
                    style={{ backgroundColor: CARD_BG }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">{origin.origin}</h3>
                      <span className="text-lg font-bold" style={{ color: ACCENT }}>
                        {origin.total_lost}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {origin.motivos.slice(0, 5).map((m) => (
                        <HBarRow key={m.motivo} label={m.motivo} value={m.count} max={maxMotivo} />
                      ))}
                      {origin.motivos.length === 0 && (
                        <p className="text-xs text-gray-600 text-center py-2">Sem motivos registrados</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* K1: Perdas por Canal */}
        {filtered.length > 0 && (() => {
          const byCanal = new Map<string, { total: number; motivos: Map<string, number> }>();
          for (const p of filtered) {
            const canal = p.canal_venda || "Sem canal";
            if (!byCanal.has(canal)) byCanal.set(canal, { total: 0, motivos: new Map() });
            const entry = byCanal.get(canal)!;
            entry.total += p.quantidade;
            const m = p.motivo_perda || "Sem motivo";
            entry.motivos.set(m, (entry.motivos.get(m) || 0) + p.quantidade);
          }
          const canaisRanked = Array.from(byCanal.entries())
            .map(([canal, data]) => ({
              canal,
              total: data.total,
              motivos: Array.from(data.motivos.entries())
                .map(([motivo, count]) => ({ motivo, count }))
                .sort((a, b) => b.count - a.count),
            }))
            .sort((a, b) => b.total - a.total);

          if (canaisRanked.length <= 1) return null;

          return (
            <div className="mt-5">
              <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                Perdas por Canal
                <InfoTooltip text="Motivos de perda segmentados por canal de venda. Mostra os principais motivos de cada canal." />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {canaisRanked.slice(0, 6).map((c) => {
                  const maxMotivo = c.motivos[0]?.count || 1;
                  return (
                    <div
                      key={c.canal}
                      className="rounded-lg border border-gray-800 p-4"
                      style={{ backgroundColor: CARD_BG }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white truncate">{c.canal}</h3>
                        <span className="text-lg font-bold shrink-0 ml-2" style={{ color: ACCENT }}>
                          {c.total}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {c.motivos.slice(0, 5).map((m) => (
                          <HBarRow key={m.motivo} label={m.motivo} value={m.count} max={maxMotivo} />
                        ))}
                        {c.motivos.length === 0 && (
                          <p className="text-xs text-gray-600 text-center py-2">Sem motivos registrados</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* K2: Perdas por Vendedor */}
        {filtered.length > 0 && (() => {
          const byVendor = new Map<string, { total: number; motivos: Map<string, number> }>();
          for (const p of filtered) {
            const vendor = p.responsible_user_name || "Sem responsável";
            if (!byVendor.has(vendor)) byVendor.set(vendor, { total: 0, motivos: new Map() });
            const entry = byVendor.get(vendor)!;
            entry.total += p.quantidade;
            const m = p.motivo_perda || "Sem motivo";
            entry.motivos.set(m, (entry.motivos.get(m) || 0) + p.quantidade);
          }
          const vendorsRanked = Array.from(byVendor.entries())
            .map(([vendor, data]) => ({
              vendor,
              total: data.total,
              topMotivos: Array.from(data.motivos.entries())
                .map(([motivo, count]) => ({ motivo, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 3),
            }))
            .sort((a, b) => b.total - a.total);

          if (vendorsRanked.length <= 1) return null;

          const totalGeral = vendorsRanked.reduce((s, v) => s + v.total, 0);

          return (
            <div className="mt-5">
              <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                Perdas por Vendedor
                <InfoTooltip text="Total de leads perdidos e principais motivos de perda por vendedor." />
              </h2>
              <div
                className="rounded-lg border border-gray-800 overflow-hidden"
                style={{ backgroundColor: CARD_BG }}
              >
                <div className="overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
                  <table className="w-full text-xs" style={{ tableLayout: "auto" }}>
                    <thead className="uppercase text-[9px] text-gray-500 font-semibold" style={{ backgroundColor: CARD_BG }}>
                      <tr>
                        <th className="px-3 py-2.5 text-left">Vendedor</th>
                        <th className="px-2 py-2.5 text-right">Total</th>
                        <th className="px-2 py-2.5 text-right">%</th>
                        <th className="px-3 py-2.5 text-left">Principais Motivos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40 text-gray-300">
                      {vendorsRanked.map((v) => (
                        <tr key={v.vendor} className="hover:bg-white/5 transition-colors">
                          <td className="px-3 py-2 font-medium text-white">{v.vendor}</td>
                          <td className="px-2 py-2 text-right font-bold" style={{ color: ACCENT }}>{v.total}</td>
                          <td className="px-2 py-2 text-right text-gray-400">
                            {totalGeral > 0 ? ((v.total / totalGeral) * 100).toFixed(1) : "0"}%
                          </td>
                          <td className="px-3 py-2 text-gray-400">
                            {v.topMotivos.map((m, i) => (
                              <span key={m.motivo}>
                                {m.motivo} ({m.count}){i < v.topMotivos.length - 1 ? " · " : ""}
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* F: Perdas em Leads Quentes */}
        {perdasQuentes && perdasQuentes.length > 0 && (
          <div className="mt-5">
            <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              Perdas em Leads Quentes
              <InfoTooltip text="Motivos de perda dos leads com temperatura 'quente'. Estes são os leads mais promissores que foram perdidos." />
            </h2>
            <div
              className="rounded-lg border border-red-800/30 p-4"
              style={{ backgroundColor: "rgba(220,38,38,0.05)" }}
            >
              {(() => {
                const maxBar = perdasQuentes[0]?.count || 1;
                const total = perdasQuentes.reduce((s, m) => s + m.count, 0);
                return (
                  <>
                    <p className="text-xs text-gray-400 mb-3">
                      Total: <span className="text-red-400 font-bold">{total}</span> leads quentes perdidos
                    </p>
                    {perdasQuentes.slice(0, 8).map((m) => (
                      <HBarRow key={m.motivo} label={m.motivo} value={m.count} max={maxBar} />
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
