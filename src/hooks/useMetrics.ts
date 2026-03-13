"use client";

import useSWR from "swr";
import {
  fetchOverviewMetrics,
  fetchMetricsHistory,
  fetchCanalMetrics,
  fetchVendedorMetrics,
  fetchFunilData,
  fetchPerdasData,
  fetchIAMetrics,
  fetchIAResponseTimes,
  fetchRespostaPorConversa,
  fetchLeadsPerdidos,
  fetchPipelineFunil,
  fetchLastSync,
  fetchSDRMetrics,
  fetchLeadsHumanoSemProposta,
  fetchLeadsNegociacoesQuentes,
  fetchDailyLeadCounts,
  fetchSDRResponseTimeStats,
} from "@/lib/queries";
import type { Periodo } from "@/types/metrics";

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function useOverviewMetrics(periodo: Periodo) {
  return useSWR(
    ["overview-metrics", periodo],
    () => fetchOverviewMetrics(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useMetricsHistory(days: number = 30) {
  return useSWR(
    ["metrics-history", days],
    () => fetchMetricsHistory(days),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useCanalMetrics(periodo: Periodo, responsibleUserId?: number) {
  return useSWR(
    ["canal-metrics", periodo, responsibleUserId],
    () => fetchCanalMetrics(periodo, responsibleUserId),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useVendedorMetrics(periodo: Periodo) {
  return useSWR(
    ["vendedor-metrics", periodo],
    () => fetchVendedorMetrics(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useFunilData(periodo: Periodo = "mes_atual", pipelineId?: number) {
  return useSWR(
    ["funil-data", periodo, pipelineId],
    () => fetchFunilData(periodo, pipelineId),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function usePerdasData(periodo: Periodo) {
  return useSWR(
    ["perdas-data", periodo],
    () => fetchPerdasData(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useIAMetrics(periodo: Periodo = "mes_atual") {
  return useSWR(
    ["ia-metrics", periodo],
    () => fetchIAMetrics(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useIAResponseTimes() {
  return useSWR("ia-response-times", fetchIAResponseTimes, {
    refreshInterval: REFRESH_INTERVAL,
  });
}

export function useRespostaPorConversa() {
  return useSWR("resposta-por-conversa", fetchRespostaPorConversa, {
    refreshInterval: REFRESH_INTERVAL,
  });
}

export function useLeadsPerdidos(periodo: Periodo = "mes_atual") {
  return useSWR(
    ["leads-perdidos", periodo],
    () => fetchLeadsPerdidos(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function usePipelineFunil(periodo: Periodo = "mes_atual") {
  return useSWR(
    ["pipeline-funil", periodo],
    () => fetchPipelineFunil(undefined, periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useSDRMetrics(periodo: Periodo) {
  return useSWR(
    ["sdr-metrics", periodo],
    () => fetchSDRMetrics(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useLeadsHumanoSemProposta() {
  return useSWR("leads-humano-sem-proposta", fetchLeadsHumanoSemProposta, {
    refreshInterval: REFRESH_INTERVAL,
  });
}

export function useLeadsNegociacoesQuentes() {
  return useSWR("leads-negociacoes-quentes", fetchLeadsNegociacoesQuentes, {
    refreshInterval: REFRESH_INTERVAL,
  });
}

export function useDailyLeadCounts(periodo: Periodo, pipelineId?: number) {
  return useSWR(
    ["daily-lead-counts", periodo, pipelineId],
    () => fetchDailyLeadCounts(periodo, pipelineId),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useSDRResponseTimeStats() {
  return useSWR("sdr-response-time-stats", fetchSDRResponseTimeStats, {
    refreshInterval: REFRESH_INTERVAL,
  });
}

export function useLastSync() {
  return useSWR("last-sync", fetchLastSync, {
    refreshInterval: 60 * 1000,
  });
}
