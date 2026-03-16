"use client";

import { useState, useEffect } from "react";
import {
  DateFilterContext,
  getPeriodoLabel,
  getPeriodoQuery,
} from "@/hooks/useDateFilter";
import type { DateRange } from "@/hooks/useDateFilter";
import type { Periodo } from "@/types/metrics";
import { setCustomDateRange } from "@/lib/queries";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [periodo, setPeriodo] = useState<Periodo>("todos");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  // Sync custom date range to queries module
  useEffect(() => {
    setCustomDateRange(periodo === "custom" ? dateRange : null);
  }, [periodo, dateRange]);

  return (
    <DateFilterContext.Provider
      value={{
        periodo,
        setPeriodo,
        periodoLabel: getPeriodoLabel(periodo),
        periodoQuery: getPeriodoQuery(periodo),
        dateRange,
        setDateRange,
      }}
    >
      {children}
    </DateFilterContext.Provider>
  );
}
