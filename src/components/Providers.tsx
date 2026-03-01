"use client";

import { useState } from "react";
import {
  DateFilterContext,
  getPeriodoLabel,
  getPeriodoQuery,
} from "@/hooks/useDateFilter";
import type { Periodo } from "@/types/metrics";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [periodo, setPeriodo] = useState<Periodo>("30dias");

  return (
    <DateFilterContext.Provider
      value={{
        periodo,
        setPeriodo,
        periodoLabel: getPeriodoLabel(periodo),
        periodoQuery: getPeriodoQuery(periodo),
      }}
    >
      {children}
    </DateFilterContext.Provider>
  );
}
