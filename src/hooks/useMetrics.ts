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
  fetchSDRConversionStats,
  fetchPerdasPorEtapa,
  fetchStageDurations,
  fetchVendorResponseTimes,
  fetchVendorFollowups,
  fetchDailyLeadCountsByCanal,
  fetchBotConversionRate,
  fetchHumanoVsTransferido,
  fetchPerdasByOrigin,
  fetchTemperaturaDistribution,
  fetchTemperaturaByVendor,
  fetchPerdasLeadsQuentes,
  fetchTemperaturaByCanal,
  fetchLeadsQuentesByVendorByDay,
  fetchQuentesByOrigin,
  fetchTemperaturaByOriginFull,
  fetchPropostaStats,
  fetchSDRStageResponseTime,
  fetchVendorStageResponseTime,
  fetchIACycleTime,
  fetchSDRCycleToTransfer,
} from "@/lib/queries";
import type { Periodo } from "@/types/metrics";

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function useOverviewMetrics(periodo: Periodo, vendedorId?: number) {
  return useSWR(
    ["overview-metrics", periodo, vendedorId],
    () => fetchOverviewMetrics(periodo, vendedorId),
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

export function useCanalMetrics(periodo: Periodo, responsibleUserId?: number, pipelineId?: number) {
  return useSWR(
    ["canal-metrics", periodo, responsibleUserId, pipelineId],
    () => fetchCanalMetrics(periodo, responsibleUserId, pipelineId),
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

export function useFunilData(periodo: Periodo = "mes_atual", pipelineId?: number, vendedorId?: number) {
  return useSWR(
    ["funil-data", periodo, pipelineId, vendedorId],
    () => fetchFunilData(periodo, pipelineId, vendedorId),
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

export function useLeadsHumanoSemProposta(periodo: Periodo = "todos", vendedorId?: number) {
  return useSWR(
    ["leads-humano-sem-proposta", periodo, vendedorId],
    () => fetchLeadsHumanoSemProposta(periodo, vendedorId),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useLeadsNegociacoesQuentes() {
  return useSWR("leads-negociacoes-quentes", fetchLeadsNegociacoesQuentes, {
    refreshInterval: REFRESH_INTERVAL,
  });
}

export function useDailyLeadCounts(periodo: Periodo, pipelineId?: number, vendedorId?: number) {
  return useSWR(
    ["daily-lead-counts", periodo, pipelineId, vendedorId],
    () => fetchDailyLeadCounts(periodo, pipelineId, vendedorId),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useSDRResponseTimeStats(periodo: Periodo = "todos") {
  return useSWR(
    ["sdr-response-time-stats", periodo],
    () => fetchSDRResponseTimeStats(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useSDRConversionStats(periodo: Periodo) {
  return useSWR(
    ["sdr-conversion-stats", periodo],
    () => fetchSDRConversionStats(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function usePerdasPorEtapa(periodo: Periodo, pipelineId?: number) {
  return useSWR(
    ["perdas-por-etapa", periodo, pipelineId],
    () => fetchPerdasPorEtapa(periodo, pipelineId),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useStageDurations(pipelineId?: number) {
  return useSWR(
    ["stage-durations", pipelineId],
    () => fetchStageDurations(pipelineId),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useVendorResponseTimes(periodo: Periodo) {
  return useSWR(
    ["vendor-response-times", periodo],
    () => fetchVendorResponseTimes(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useVendorFollowups(periodo: Periodo) {
  return useSWR(
    ["vendor-followups", periodo],
    () => fetchVendorFollowups(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useDailyLeadCountsByCanal(periodo: Periodo) {
  return useSWR(
    ["daily-lead-counts-by-canal", periodo],
    () => fetchDailyLeadCountsByCanal(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useBotConversionRate(periodo: Periodo) {
  return useSWR(
    ["bot-conversion-rate", periodo],
    () => fetchBotConversionRate(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useHumanoVsTransferido(periodo: Periodo) {
  return useSWR(
    ["humano-vs-transferido", periodo],
    () => fetchHumanoVsTransferido(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function usePerdasByOrigin(periodo: Periodo) {
  return useSWR(
    ["perdas-by-origin", periodo],
    () => fetchPerdasByOrigin(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useTemperaturaDistribution(periodo: Periodo) {
  return useSWR(
    ["temperatura-distribution", periodo],
    () => fetchTemperaturaDistribution(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useTemperaturaByVendor(periodo: Periodo) {
  return useSWR(
    ["temperatura-by-vendor", periodo],
    () => fetchTemperaturaByVendor(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function usePerdasLeadsQuentes(periodo: Periodo) {
  return useSWR(
    ["perdas-leads-quentes", periodo],
    () => fetchPerdasLeadsQuentes(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function usePropostaStats(periodo: Periodo) {
  return useSWR(
    ["proposta-stats", periodo],
    () => fetchPropostaStats(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useSDRStageResponseTime() {
  return useSWR("sdr-stage-response-time", fetchSDRStageResponseTime, {
    refreshInterval: REFRESH_INTERVAL,
  });
}

export function useVendorStageResponseTime() {
  return useSWR("vendor-stage-response-time", fetchVendorStageResponseTime, {
    refreshInterval: REFRESH_INTERVAL,
  });
}

export function useIACycleTime(periodo: Periodo) {
  return useSWR(
    ["ia-cycle-time", periodo],
    () => fetchIACycleTime(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useSDRCycleToTransfer(periodo: Periodo) {
  return useSWR(
    ["sdr-cycle-to-transfer", periodo],
    () => fetchSDRCycleToTransfer(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useTemperaturaByCanal(periodo: Periodo) {
  return useSWR(
    ["temperatura-by-canal", periodo],
    () => fetchTemperaturaByCanal(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useLeadsQuentesByVendorByDay(periodo: Periodo) {
  return useSWR(
    ["leads-quentes-vendor-day", periodo],
    () => fetchLeadsQuentesByVendorByDay(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useQuentesByOrigin(periodo: Periodo) {
  return useSWR(
    ["quentes-by-origin", periodo],
    () => fetchQuentesByOrigin(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useTemperaturaByOriginFull(periodo: Periodo) {
  return useSWR(
    ["temp-by-origin-full", periodo],
    () => fetchTemperaturaByOriginFull(periodo),
    { refreshInterval: REFRESH_INTERVAL }
  );
}

export function useLastSync() {
  return useSWR("last-sync", fetchLastSync, {
    refreshInterval: 60 * 1000,
  });
}
