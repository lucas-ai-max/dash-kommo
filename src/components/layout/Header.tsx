"use client";

import { useState } from "react";
import DateFilter from "./DateFilter";
import { useLastSync } from "@/hooks/useMetrics";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { useSWRConfig } from "swr";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showDateFilter?: boolean;
}

export default function Header({ title, subtitle, showDateFilter = true }: HeaderProps) {
  const { data: lastSync, mutate: mutateSync } = useLastSync();
  const { mutate } = useSWRConfig();
  const [isSyncing, setIsSyncing] = useState(false);

  async function handleSync() {
    setIsSyncing(true);
    try {
      await fetch("/api/trigger-sync", { method: "POST" });
      // Aguarda um pouco e depois invalida todos os dados SWR
      await new Promise((r) => setTimeout(r, 1500));
      await mutate(() => true, undefined, { revalidate: true });
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 bg-gray-950/80 px-6 py-4 backdrop-blur-sm">
      <div>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {lastSync && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <RefreshCw className="h-3 w-3" />
            <span>
              Sync:{" "}
              {isSyncing ? (
                <span className="text-yellow-500">sincronizando...</span>
              ) : lastSync.status === "success" ? (
                <span className="text-green-500">
                  {formatDistanceToNow(new Date(lastSync.finished_at!), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              ) : lastSync.status === "running" ? (
                <span className="text-yellow-500">em andamento...</span>
              ) : (
                <span className="text-red-500">erro</span>
              )}
            </span>
          </div>
        )}

        <button
          onClick={handleSync}
          disabled={isSyncing}
          title="Sincronizar dados agora"
          className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition hover:border-gray-600 hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Sincronizando..." : "Sincronizar"}
        </button>

        {showDateFilter && <DateFilter />}
      </div>
    </header>
  );
}
