"use client";

import { createContext, useContext } from "react";
import type { Periodo } from "@/types/metrics";

interface DateFilterContextType {
  periodo: Periodo;
  setPeriodo: (p: Periodo) => void;
  periodoLabel: string;
  periodoQuery: string;
}

export const DateFilterContext = createContext<DateFilterContextType>({
  periodo: "todos",
  setPeriodo: () => {},
  periodoLabel: "Mês atual",
  periodoQuery: "mensal",
});

export function useDateFilter() {
  return useContext(DateFilterContext);
}

export function getPeriodoLabel(p: Periodo): string {
  const labels: Record<Periodo, string> = {
    todos: "Todos",
    hoje: "Hoje",
    "7dias": "Últimos 7 dias",
    "30dias": "Últimos 30 dias",
    "60dias": "Últimos 60 dias",
    mes_atual: "Mês atual",
    custom: "Personalizado",
  };
  return labels[p];
}

export function getPeriodoQuery(p: Periodo): string {
  const queries: Record<Periodo, string> = {
    todos: "mensal",
    hoje: "diario",
    "7dias": "semanal",
    "30dias": "mensal",
    "60dias": "mensal",
    mes_atual: "mensal",
    custom: "mensal",
  };
  return queries[p];
}
