"use client";

import Header from "@/components/layout/Header";
import KPICard from "@/components/cards/KPICard";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useIAMetrics, useIAResponseTimes, useLeadsPerdidos } from "@/hooks/useMetrics";
import { MessageSquare, ArrowRightLeft, Clock, Percent } from "lucide-react";
import {
  AreaChart,
  Area,
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

  const totalConversas = (iaData || []).reduce((s, d) => s + (d.total_conversas ?? 0), 0);
  const totalFinalizadas = (iaData || []).reduce((s, d) => s + (d.conversas_finalizadas ?? 0), 0);
  const totalFup1 = (iaData || []).reduce((s, d) => s + (d.fup_nivel_1_enviados ?? 0), 0);
  const totalFup2 = (iaData || []).reduce((s, d) => s + (d.fup_nivel_2_enviados ?? 0), 0);
  const totalFup3 = (iaData || []).reduce((s, d) => s + (d.fup_nivel_3_enviados ?? 0), 0);
  const taxaHandoff =
    totalConversas > 0
      ? Number(((totalFinalizadas / totalConversas) * 100).toFixed(2))
      : null;

  const hasAnyData = totalConversas > 0 || totalFup1 > 0;

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

  const fupData = [
    { nivel: "FUP 1", enviados: totalFup1 },
    { nivel: "FUP 2", enviados: totalFup2 },
    { nivel: "FUP 3", enviados: totalFup3 },
    { nivel: "Perdidos", enviados: totalPerdidos },
  ];
  const FUP_COLORS = ["#3b82f6", "#3b82f6", "#8b5cf6", "#ef4444"];

  return (
    <>
      <Header
        title="Métricas da IA - Telemetria Moderna"
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
            </p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard
            label="Total Conversas"
            value={totalConversas}
            loading={isLoading}
            icon={<MessageSquare className="h-5 w-5" />}
            color="blue"
          />
          <KPICard
            label="Transferidos p/ Vendedor"
            value={totalFinalizadas}
            loading={isLoading}
            icon={<ArrowRightLeft className="h-5 w-5" />}
            color="green"
          />
          <KPICard
            label="Tempo Médio Resposta"
            value={responseTimes?.bot_seg != null ? responseTimes.bot_seg : "—"}
            suffix="seg"
            changeLabel="média 30d"
            loading={isLoading}
            icon={<Clock className="h-5 w-5" />}
            color="purple"
          />
          <KPICard
            label="Taxa de Conversão IA"
            value={taxaHandoff != null ? taxaHandoff : "—"}
            suffix="%"
            loading={isLoading}
            icon={<Percent className="h-5 w-5" />}
            color="cyan"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Area Chart: conversas por dia */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="mb-4 flex items-center gap-4">
              <h3 className="text-sm font-semibold text-white">Conversas por Dia</h3>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500" /> Total Conversas
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" /> Transferidos
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorConversas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTransferidos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="conversas" name="Total Conversas" stroke="#3b82f6" strokeWidth={2} fill="url(#colorConversas)" />
                <Area type="monotone" dataKey="finalizadas" name="Transferidos" stroke="#22c55e" strokeWidth={2} fill="url(#colorTransferidos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* FUP bars */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Follow-ups por Nível</h3>
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

        {/* Status Bar */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <span>System Status: Live Data</span>
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-500">All Systems Operational</span>
        </div>
      </div>
    </>
  );
}
