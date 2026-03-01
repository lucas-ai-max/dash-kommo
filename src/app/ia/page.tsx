"use client";

import Header from "@/components/layout/Header";
import KPICard from "@/components/cards/KPICard";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useIAMetrics, useIAResponseTimes, useLeadsPerdidos } from "@/hooks/useMetrics";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function IAPage() {
  const { periodo } = useDateFilter();
  const { data: iaData, isLoading } = useIAMetrics(periodo);
  const { data: responseTimes } = useIAResponseTimes();
  const { data: totalPerdidos = 0 } = useLeadsPerdidos(periodo);

  // Agregar todos os dias do período em totais
  const totalConversas = (iaData || []).reduce((s, d) => s + (d.total_conversas ?? 0), 0);
  const totalFinalizadas = (iaData || []).reduce((s, d) => s + (d.conversas_finalizadas ?? 0), 0);
  const totalFup1 = (iaData || []).reduce((s, d) => s + (d.fup_nivel_1_enviados ?? 0), 0);
  const totalFup2 = (iaData || []).reduce((s, d) => s + (d.fup_nivel_2_enviados ?? 0), 0);
  const totalFup3 = (iaData || []).reduce((s, d) => s + (d.fup_nivel_3_enviados ?? 0), 0);
  const taxaHandoff =
    totalConversas > 0
      ? Number(((totalFinalizadas / totalConversas) * 100).toFixed(2))
      : null;

  // Média ponderada de msgs/conversa (apenas dias com dados)
  const diasComMsgs = (iaData || []).filter((d) => (d.mensagens_por_conversa_media ?? 0) > 0);
  const msgsPorConversa =
    diasComMsgs.length > 0
      ? Number(
        (diasComMsgs.reduce((s, d) => s + (d.mensagens_por_conversa_media ?? 0), 0) / diasComMsgs.length).toFixed(1)
      )
      : null;

  const hasAnyData = totalConversas > 0 || totalFup1 > 0;

  // Gráfico de linha: histórico por dia (ordenado crescente)
  const historyData = (iaData || [])
    .slice()
    .reverse()
    .map((d) => ({
      date: new Date(d.metric_date + "T12:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      conversas: d.total_conversas,
      finalizadas: d.conversas_finalizadas,
    }));

  // Barras de FUP agregadas do período
  const fupData = [
    { nivel: "FUP 1", enviados: totalFup1 },
    { nivel: "FUP 2", enviados: totalFup2 },
    { nivel: "FUP 3", enviados: totalFup3 },
    { nivel: "Perdidos", enviados: totalPerdidos },
  ];
  const FUP_COLORS = ["#8b5cf6", "#8b5cf6", "#8b5cf6", "#ef4444"];


  return (
    <>
      <Header
        title="Métricas da IA"
        subtitle="Performance do atendimento automatizado"
      />

      <div className="space-y-6 p-6">
        {!isLoading && !hasAnyData && (iaData?.length === 0 || totalConversas === 0) && (
          <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 p-4 text-sm text-amber-200">
            <p className="font-medium">Nenhum dado de IA/Bot no período selecionado.</p>
            <p className="mt-1 text-amber-300/90">
              As métricas vêm das tabelas{" "}
              <code className="rounded bg-amber-900/50 px-1">chats</code> e{" "}
              <code className="rounded bg-amber-900/50 px-1">chat_messages</code> no Supabase.
              Execute o sync: <code className="rounded bg-amber-900/50 px-1">GET /api/cron/sync-ia-metrics</code>.
            </p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard
            label="Total Conversas"
            value={totalConversas}
            loading={isLoading}
          />
          <KPICard
            label="Transferidos p/ Vendedor"
            value={totalFinalizadas}
            loading={isLoading}
          />
          <KPICard
            label="Tempo Médio Resposta"
            value={responseTimes?.bot_seg != null ? responseTimes.bot_seg : "—"}
            suffix="seg"
            changeLabel="média 30d"
            loading={isLoading}
          />
          <KPICard
            label="Taxa de Conversão IA"
            value={taxaHandoff != null ? taxaHandoff : "—"}
            suffix="%"
            loading={isLoading}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Linha: conversas por dia */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">
              Conversas por Dia
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={historyData}>
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
                />
                <Line
                  type="monotone"
                  dataKey="conversas"
                  name="Total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="finalizadas"
                  name="Transferência p/ Vendedor"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Barras: FUPs agregados do período */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">
              Follow-ups por Nível
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={fupData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="nivel" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="enviados" name="Enviados" radius={[4, 4, 0, 0]}>
                  {fupData.map((_, i) => (
                    <Cell key={i} fill={FUP_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </>
  );
}
