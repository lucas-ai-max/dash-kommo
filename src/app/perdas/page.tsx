"use client";

import Header from "@/components/layout/Header";
import { useDateFilter } from "@/hooks/useDateFilter";
import { usePerdasData } from "@/hooks/useMetrics";
import type { DashboardPerdas } from "@/types/database";

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
function MiniKPI({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-lg p-2.5 border border-gray-800 flex flex-col gap-1"
      style={{ backgroundColor: CARD_BG }}
    >
      <span className="text-[11px] text-gray-400 leading-tight">{label}</span>
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
        <MiniKPI label="Total de Perdas" value={totalPerdas} />
        <MiniKPI label="Motivos Distintos" value={motivoRanking.length} />
        {/* Principal Motivo — special: smaller text */}
        <div
          className="rounded-lg p-2.5 border border-gray-800 flex flex-col gap-1"
          style={{ backgroundColor: CARD_BG }}
        >
          <span className="text-[11px] text-gray-400 leading-tight">Principal Motivo</span>
          <span className="text-xs font-bold leading-tight mt-auto line-clamp-2" style={{ color: ACCENT }}>
            {topMotivo?.motivo || "—"}
          </span>
        </div>
        <MiniKPI label="% do Principal" value={topPct} />
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
  const currentData = perdas || [];

  const sdrData = currentData.filter((p) => p.pipeline_name === "BOT");
  const vendedoresData = currentData.filter((p) => p.pipeline_name === "VENDEDORES");
  const implantacaoData = currentData.filter(
    (p) => p.pipeline_name !== "VENDEDORES" && p.pipeline_name !== "BOT"
  );

  return (
    <>
      <Header
        title="Diagnóstico de Perdas Moderno"
        subtitle="Análise detalhada das etapas do pipeline e motivos de perdas."
        showDateFilter={false}
      />

      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <PipelineSection title="Perdas — SDR" data={sdrData} isLoading={isLoading} />
          <PipelineSection title="Perdas — Vendedores" data={vendedoresData} isLoading={isLoading} />
          {implantacaoData.length > 0
            ? <PipelineSection title="Perdas — Teste Implantação" data={implantacaoData} isLoading={isLoading} />
            : <EmptyState title="Perdas — Teste Implantação" />
          }
        </div>
      </div>
    </>
  );
}
