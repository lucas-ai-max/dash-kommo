import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const KOMMO_API = `https://${process.env.KOMMO_SUBDOMAIN}.kommo.com/api/v4`;
const RATE_MS = 150;
let lastReq = 0;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchKommo<T = unknown>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const now = Date.now();
  if (now - lastReq < RATE_MS) await sleep(RATE_MS - (now - lastReq));
  lastReq = Date.now();

  const url = new URL(`${KOMMO_API}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.KOMMO_API_TOKEN}`,
    },
  });

  if (res.status === 429) {
    await sleep(2000);
    return fetchKommo<T>(endpoint, params);
  }
  if (res.status === 204) return {} as T;
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Kommo ${res.status}: ${t}`);
  }
  const text = await res.text();
  if (!text.trim()) return {} as T;
  return JSON.parse(text) as T;
}

interface KommoEvent {
  type: string;
  entity_id: number;
  created_by: number;
  created_at: number;
}

interface ChatRow {
  id: number;
  created_at: string | null;
  updated_at: string | null;
  status_final: boolean | null;
  status_fup: boolean | null;
  messagem_fup_1: boolean | null;
  messagem_fup_2: boolean | null;
  messagem_fup_3: boolean | null;
  phone: string | null;
  channel_phone?: string | null;
}

/** Converte timestamp UTC (string ISO ou unix seconds) para data em UTC-3 (São Paulo) */
function toSaoPauloDateStr(utcTimestamp: string | number | null | undefined): string | null {
  if (!utcTimestamp) return null;
  const ms = typeof utcTimestamp === "number"
    ? utcTimestamp * 1000
    : new Date(utcTimestamp).getTime();
  if (isNaN(ms)) return null;
  // UTC-3: subtrai 3 horas
  const spDate = new Date(ms - 3 * 60 * 60 * 1000);
  return spDate.toISOString().slice(0, 10);
}

function getDateKey(chat: ChatRow): string | null {
  const dateStr = chat.created_at || chat.updated_at;
  return toSaoPauloDateStr(dateStr);
}

/** Normaliza telefone para comparação (só dígitos) */
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

/** Busca source_id do canal pelo número (ex: 554188202618). Procura em sources.services[].pages[].link (wa.me/...) */
async function findSourceIdByPhone(phoneNorm: string): Promise<number | null> {
  try {
    const data = await fetchKommo<{
      _embedded?: {
        sources?: Array<{
          id: number;
          name: string;
          services?: Array<{
            pages?: Array<{ link?: string; name?: string }>;
          }>;
        }>;
      };
    }>("/sources");
    const sources = data._embedded?.sources || [];
    for (const src of sources) {
      for (const svc of src.services || []) {
        for (const page of svc.pages || []) {
          const link = page.link || "";
          // wa.me/554188202618 ou link contém o número
          const linkNorm = link.replace(/\D/g, "");
          if (linkNorm.includes(phoneNorm) || phoneNorm.includes(linkNorm)) {
            return src.id;
          }
        }
      }
      // Também verificar se o nome contém o número
      if (normalizePhone(src.name).includes(phoneNorm)) {
        return src.id;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Busca IDs de leads por source_id e/ou pipeline_id (paginado) */
async function fetchLeadIds(
  options: { sourceId?: number; pipelineId?: number }
): Promise<Set<number>> {
  const ids = new Set<number>();
  let page = 1;
  const limit = 250;
  const params: Record<string, string> = {
    with: "source_id",
    page: String(page),
    limit: String(limit),
  };
  if (options.sourceId) params["filter[source_id]"] = String(options.sourceId);
  if (options.pipelineId) params["filter[pipeline_id][]"] = String(options.pipelineId);

  while (true) {
    params.page = String(page);
    const data = await fetchKommo<{
      _embedded?: { leads?: Array<{ id: number }> };
      _links?: { next?: { href: string } };
    }>("/leads", params);

    const batch = data._embedded?.leads || [];
    for (const lead of batch) {
      ids.add(lead.id);
    }
    if (!batch.length || !data._links?.next) break;
    page++;
  }

  return ids;
}

/** Busca ID de um usuário pelo nome (case-insensitive, partial match) */
async function findUserId(name: string): Promise<number | null> {
  try {
    const data = await fetchKommo<{
      _embedded?: { users?: Array<{ id: number; name: string }> };
    }>("/users");
    const users = data._embedded?.users || [];
    const found = users.find((u) =>
      u.name.toLowerCase().includes(name.toLowerCase())
    );
    return found?.id ?? null;
  } catch {
    return null;
  }
}

/** Busca eventos de chat dos últimos 30 dias (paginado) */
async function fetchChatEvents(days: number): Promise<KommoEvent[]> {
  const from = Math.floor(Date.now() / 1000) - days * 86400;
  const events: KommoEvent[] = [];
  let page = 1;

  while (true) {
    const data = await fetchKommo<{
      _embedded?: { events?: KommoEvent[] };
      _links?: { next?: { href: string } };
    }>("/events", {
      "filter[type][0]": "incoming_chat_message",
      "filter[type][1]": "outgoing_chat_message",
      "filter[created_at][from]": String(from),
      page: String(page),
      limit: "250",
    });

    const batch = data._embedded?.events || [];
    if (!batch.length) break;
    events.push(...batch);
    if (!data._links?.next) break;
    page++;
  }

  return events;
}

/**
 * Calcula tempo de resposta por lead individual.
 * Usa "último incoming antes de cada outgoing" — cada respondente é medido
 * independentemente, então bot e Erick podem ambos ser contados para o mesmo incoming.
 */
function calcResponseTimePerLead(
  events: KommoEvent[],
  botId: number,
  erickId: number | null
): Map<number, { bot_seg: number | null; erick_min: number | null }> {
  const byLead = new Map<number, KommoEvent[]>();
  for (const ev of events) {
    if (!byLead.has(ev.entity_id)) byLead.set(ev.entity_id, []);
    byLead.get(ev.entity_id)!.push(ev);
  }

  const result = new Map<number, { bot_seg: number | null; erick_min: number | null }>();

  for (const [leadId, leadEvents] of byLead) {
    const sorted = [...leadEvents].sort((a, b) => a.created_at - b.created_at);
    const botTimes: number[] = [];
    const erickTimes: number[] = [];

    // Rastreia o último incoming separadamente para cada respondente
    let lastIncomingForBot: number | null = null;
    let lastIncomingForErick: number | null = null;

    for (const ev of sorted) {
      if (ev.type === "incoming_chat_message") {
        lastIncomingForBot = ev.created_at;
        lastIncomingForErick = ev.created_at;
      } else if (ev.type === "outgoing_chat_message") {
        if (ev.created_by === botId && lastIncomingForBot !== null) {
          const diff = ev.created_at - lastIncomingForBot;
          if (diff > 0 && diff < 600) botTimes.push(diff); // bot: até 10 min
          lastIncomingForBot = null;
        }
        if (erickId && ev.created_by === erickId && lastIncomingForErick !== null) {
          const diff = ev.created_at - lastIncomingForErick;
          if (diff > 0 && diff < 7200) erickTimes.push(diff); // humano: até 2h
          lastIncomingForErick = null;
        }
      }
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

    const botAvg = avg(botTimes);
    const erickAvg = avg(erickTimes);

    if (botAvg !== null || erickAvg !== null) {
      result.set(leadId, {
        bot_seg: botAvg !== null ? Number(botAvg.toFixed(1)) : null,
        erick_min: erickAvg !== null ? Number((erickAvg / 60).toFixed(1)) : null,
      });
    }
  }

  return result;
}

/**
 * Calcula tempo médio de resposta em segundos/minutos.
 * Usa "último incoming antes de cada outgoing do respondente".
 * Média por conversa: cada conversa tem peso igual independente do volume de msgs.
 */
function calcAvgResponseTime(
  events: KommoEvent[],
  responderId: number,
  unit: "sec" | "min",
  maxDiffSec: number = 86400
): number | null {
  const byLead = new Map<number, KommoEvent[]>();
  for (const ev of events) {
    if (!byLead.has(ev.entity_id)) byLead.set(ev.entity_id, []);
    byLead.get(ev.entity_id)!.push(ev);
  }

  const avgPerConversation: number[] = [];

  for (const leadEvents of byLead.values()) {
    const sorted = [...leadEvents].sort((a, b) => a.created_at - b.created_at);
    const times: number[] = [];
    let lastIncomingAt: number | null = null;

    for (const ev of sorted) {
      if (ev.type === "incoming_chat_message") {
        lastIncomingAt = ev.created_at;
      } else if (
        ev.type === "outgoing_chat_message" &&
        ev.created_by === responderId &&
        lastIncomingAt !== null
      ) {
        const diff = ev.created_at - lastIncomingAt;
        if (diff > 0 && diff < maxDiffSec) times.push(diff);
        lastIncomingAt = null;
      }
    }

    if (times.length > 0) {
      const convAvg = times.reduce((a, b) => a + b, 0) / times.length;
      avgPerConversation.push(convAvg);
    }
  }

  if (avgPerConversation.length === 0) return null;
  const avg = avgPerConversation.reduce((a, b) => a + b, 0) / avgPerConversation.length;
  const result = unit === "min" ? avg / 60 : avg;
  return Number(result.toFixed(1));
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const chatsTable = process.env.IA_CHATS_TABLE || "chats";
    const messagesTable = process.env.IA_MESSAGES_TABLE || "chat_messages";
    const channelPhone = process.env.IA_CHANNEL_PHONE; // ex: 554188202618 ou +55 41 8820-2618
    const channelPhoneNorm = channelPhone ? normalizePhone(channelPhone) : null;
    const pipelineId = process.env.IA_PIPELINE_ID
      ? parseInt(process.env.IA_PIPELINE_ID, 10)
      : null; // ex: 11129984

    // 1) Buscar IDs dos usuários no Kommo
    const erickId = await findUserId("Eryck Henrique Matos");
    // IA_BOT_USER_ID permite forçar o created_by do bot (ex: 0 = sistema/API)
    const botId = process.env.IA_BOT_USER_ID !== undefined
      ? parseInt(process.env.IA_BOT_USER_ID, 10)
      : ((await findUserId("Velocity Digital Company")) ?? 0);
    console.log(`[sync-ia-metrics] Bot id=${botId}, Erick id=${erickId}`);

    // 2) Buscar eventos de chat dos últimos 7 dias para calcular tempos de resposta
    let tempoMedioBotSeg: number | null = null;
    let tempoMedioHumanoMin: number | null = null;

    if (botId != null || erickId) {
      try {
        let chatEvents = await fetchChatEvents(30);
        console.log(`[sync-ia-metrics] Fetched ${chatEvents.length} chat events`);

        // Filtrar por canal e/ou pipeline via Kommo: leads -> entity_ids
        if (channelPhoneNorm || pipelineId) {
          let leadIds: Set<number>;
          if (channelPhoneNorm) {
            const sourceId = await findSourceIdByPhone(channelPhoneNorm);
            if (sourceId) {
              leadIds = await fetchLeadIds({ sourceId, pipelineId: pipelineId ?? undefined });
            } else {
              console.log(`[sync-ia-metrics] Canal ${channelPhoneNorm}: source não encontrado em /sources`);
              leadIds = pipelineId ? await fetchLeadIds({ pipelineId }) : new Set();
            }
          } else {
            leadIds = await fetchLeadIds({ pipelineId: pipelineId! });
          }
          if (leadIds.size > 0) {
            chatEvents = chatEvents.filter((ev) => leadIds.has(ev.entity_id));
            const filtro = [channelPhoneNorm && `canal ${channelPhoneNorm}`, pipelineId && `pipeline ${pipelineId}`]
              .filter(Boolean)
              .join(", ");
            console.log(`[sync-ia-metrics] Filtrado por ${filtro}: ${leadIds.size} leads, ${chatEvents.length} eventos`);
          } else {
            chatEvents = [];
            console.log(`[sync-ia-metrics] Nenhum lead encontrado (canal=${!!channelPhoneNorm}, pipeline=${pipelineId})`);
          }
        }

        // Debug: quais created_by aparecem nos outgoing? (para descobrir ID real do bot)
        const outgoingByUser = new Map<number, number>();
        for (const ev of chatEvents) {
          if (ev.type === "outgoing_chat_message") {
            outgoingByUser.set(ev.created_by, (outgoingByUser.get(ev.created_by) || 0) + 1);
          }
        }
        const topOutgoing = [...outgoingByUser.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
        console.log(`[sync-ia-metrics] Outgoing por created_by (top 5): ${topOutgoing.map(([id, n]) => `${id}:${n}`).join(", ")}`);

        if (botId != null) {
          tempoMedioBotSeg = calcAvgResponseTime(chatEvents, botId, "sec", 600); // bot: até 10 min
        }
        if (erickId) {
          tempoMedioHumanoMin = calcAvgResponseTime(chatEvents, erickId, "min", 7200); // humano: até 2h
        }
        console.log(
          `[sync-ia-metrics] Bot avg: ${tempoMedioBotSeg != null ? `${tempoMedioBotSeg}s` : "—"} | Erick avg: ${tempoMedioHumanoMin != null ? `${tempoMedioHumanoMin}min` : "—"}`
        );

        // Upsert por conversa (lead_id)
        try {
          const firstEventByLead = new Map<number, number>(); // leadId → menor timestamp
          for (const ev of chatEvents) {
            const t = firstEventByLead.get(ev.entity_id);
            if (!t || ev.created_at < t) firstEventByLead.set(ev.entity_id, ev.created_at);
          }

          const perLeadData = calcResponseTimePerLead(chatEvents, botId, erickId);
          const perLeadRows = Array.from(perLeadData.entries()).map(([leadId, times]) => ({
            lead_id: leadId,
            data_conversa: toSaoPauloDateStr(firstEventByLead.get(leadId) ?? null) ?? "",
            tempo_bot_seg: times.bot_seg,
            tempo_erick_min: times.erick_min,
            calculated_at: new Date().toISOString(),
          }));

          for (let i = 0; i < perLeadRows.length; i += 100) {
            const { error } = await supabaseAdmin
              .from("dashboard_resposta_por_conversa")
              .upsert(perLeadRows.slice(i, i + 100), { onConflict: "lead_id" });
            if (error) console.warn("[sync-ia-metrics] Per-lead upsert error:", error);
          }
          console.log(`[sync-ia-metrics] Upserted ${perLeadRows.length} conversas por lead`);
        } catch (e) {
          console.warn("[sync-ia-metrics] Per-lead upsert failed:", e);
        }
      } catch (e) {
        console.warn("[sync-ia-metrics] Kommo events error:", e);
      }
    }

    // 3) Buscar todos os chats (filtra por canal se IA_CHANNEL_PHONE estiver definido)
    const allChats: ChatRow[] = [];
    try {
      let from = 0;
      const PAGE = 1000;
      const selectCols = channelPhoneNorm
        ? "id, created_at, updated_at, status_final, status_fup, messagem_fup_1, messagem_fup_2, messagem_fup_3, phone, channel_phone"
        : "id, created_at, updated_at, status_final, status_fup, messagem_fup_1, messagem_fup_2, messagem_fup_3, phone";
      while (true) {
        const { data, error } = await supabaseAdmin
          .from(chatsTable)
          .select(selectCols)
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        let batch = data as unknown as ChatRow[];
        if (channelPhoneNorm) {
          batch = batch.filter((c) => normalizePhone((c as ChatRow & { channel_phone?: string }).channel_phone) === channelPhoneNorm);
        }
        allChats.push(...batch);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      if (channelPhoneNorm) {
        console.log(`[sync-ia-metrics] Fetched ${allChats.length} chats (canal ${channelPhoneNorm})`);
      } else {
        console.log(`[sync-ia-metrics] Fetched ${allChats.length} chats`);
      }
    } catch (e) {
      console.warn("[sync-ia-metrics] Tabela", chatsTable, "erro:", e);
    }

    // 4) Contar mensagens por phone
    const msgCountByPhone = new Map<string, number>();
    let totalMensagens = 0;
    try {
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabaseAdmin
          .from(messagesTable)
          .select("phone")
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        for (const msg of data) {
          const phone = (msg as { phone?: string }).phone;
          if (phone) msgCountByPhone.set(phone, (msgCountByPhone.get(phone) || 0) + 1);
          totalMensagens++;
        }
        if (data.length < PAGE) break;
        from += PAGE;
      }
      console.log(`[sync-ia-metrics] Fetched ${totalMensagens} messages`);
    } catch (e) {
      console.warn("[sync-ia-metrics] Tabela", messagesTable, "erro:", e);
    }

    // 5) Agrupar chats por dia
    const chatsByDay = new Map<string, ChatRow[]>();
    for (const chat of allChats) {
      const day = getDateKey(chat);
      if (!day) continue;
      if (!chatsByDay.has(day)) chatsByDay.set(day, []);
      chatsByDay.get(day)!.push(chat);
    }

    const withCreatedAt = allChats.filter((c) => c.created_at).length;
    const withFallback = allChats.filter((c) => !c.created_at && c.updated_at).length;
    console.log(
      `[sync-ia-metrics] ${chatsByDay.size} days | ${withCreatedAt} com created_at, ${withFallback} com fallback`
    );

    // 6) Calcular métricas por dia
    const today = toSaoPauloDateStr(new Date().toISOString()) ?? new Date().toISOString().slice(0, 10);
    const rows = [];

    for (const [day, dayChats] of chatsByDay) {
      const totalConversas = dayChats.length;
      const conversasFinalizadas = dayChats.filter((c) => c.status_final).length;
      const conversasFupAtivas = dayChats.filter((c) => c.status_fup).length;
      const fup1 = dayChats.filter((c) => c.messagem_fup_1).length;
      const fup2 = dayChats.filter((c) => c.messagem_fup_2).length;
      const fup3 = dayChats.filter((c) => c.messagem_fup_3).length;

      let dayMsgTotal = 0;
      for (const chat of dayChats) {
        if (chat.phone) dayMsgTotal += msgCountByPhone.get(chat.phone) || 0;
      }
      const mensagensPorConversa =
        totalConversas > 0 && dayMsgTotal > 0
          ? Number((dayMsgTotal / totalConversas).toFixed(1))
          : null;

      const taxaHandoff =
        totalConversas > 0
          ? Number(((conversasFinalizadas / totalConversas) * 100).toFixed(2))
          : null;

      rows.push({
        metric_date: day,
        total_conversas: totalConversas,
        conversas_finalizadas: conversasFinalizadas,
        conversas_fup_ativas: conversasFupAtivas,
        fup_nivel_1_enviados: fup1,
        fup_nivel_2_enviados: fup2,
        fup_nivel_3_enviados: fup3,
        // Tempos de resposta: só atualiza no registro de hoje, e só quando não-nulo (evita sobrescrever valor válido)
        tempo_medio_resposta_bot_seg: day === today && tempoMedioBotSeg !== null ? tempoMedioBotSeg : undefined,
        tempo_medio_resposta_humano_min: day === today && tempoMedioHumanoMin !== null ? tempoMedioHumanoMin : undefined,
        mensagens_por_conversa_media: mensagensPorConversa,
        taxa_handoff: taxaHandoff,
        calculated_at: new Date().toISOString(),
      });
    }

    // Se hoje não tem chats ainda, upsert só os tempos de resposta no registro de hoje
    if (!chatsByDay.has(today) && (tempoMedioBotSeg !== null || tempoMedioHumanoMin !== null)) {
      rows.push({
        metric_date: today,
        total_conversas: 0,
        conversas_finalizadas: 0,
        conversas_fup_ativas: 0,
        fup_nivel_1_enviados: 0,
        fup_nivel_2_enviados: 0,
        fup_nivel_3_enviados: 0,
        tempo_medio_resposta_bot_seg: tempoMedioBotSeg,
        tempo_medio_resposta_humano_min: tempoMedioHumanoMin,
        mensagens_por_conversa_media: null,
        taxa_handoff: null,
        calculated_at: new Date().toISOString(),
      });
    }

    // 7) UPSERT em batches
    let totalUpserted = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await supabaseAdmin
        .from("dashboard_metricas_ia")
        .upsert(batch, { onConflict: "metric_date" });
      if (error) {
        console.error("[sync-ia-metrics] Upsert error:", error);
        throw error;
      }
      totalUpserted += batch.length;
    }

    console.log(
      `[sync-ia-metrics] Done! ${totalUpserted} days | bot=${tempoMedioBotSeg != null ? `${tempoMedioBotSeg}s` : "—"} | erick=${tempoMedioHumanoMin != null ? `${tempoMedioHumanoMin}min` : "—"}`
    );

    return NextResponse.json({
      success: true,
      days_synced: totalUpserted,
      total_chats: allChats.length,
      total_messages: totalMensagens,
      tempo_bot_seg: tempoMedioBotSeg,
      tempo_erick_min: tempoMedioHumanoMin,
      bot_id: botId,
      erick_id: erickId,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[sync-ia-metrics] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
