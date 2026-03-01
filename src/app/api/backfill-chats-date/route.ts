import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const API_BASE_URL = `https://${process.env.KOMMO_SUBDOMAIN}.kommo.com/api/v4`;
const RATE_LIMIT_MS = 150;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastReq = 0;

async function fetchKommo<T = unknown>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const now = Date.now();
  if (now - lastReq < RATE_LIMIT_MS) await sleep(RATE_LIMIT_MS - (now - lastReq));
  lastReq = Date.now();

  const url = new URL(`${API_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.KOMMO_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 429) {
    await sleep(2000);
    return fetchKommo<T>(endpoint, params);
  }
  if (res.status === 204) return {} as T;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kommo ${res.status}: ${text}`);
  }

  const text = await res.text();
  if (!text.trim()) return {} as T;
  return JSON.parse(text) as T;
}

interface KommoContact {
  id: number;
  created_at: number;
}

async function findContactByPhone(phone: string): Promise<KommoContact | null> {
  // Limpar o telefone (remover tudo que não for dígito)
  const cleanPhone = phone.replace(/\D/g, "");

  // Tentar com o número completo
  const data = await fetchKommo<{
    _embedded?: { contacts?: KommoContact[] };
  }>("/contacts", { query: cleanPhone });

  if (data._embedded?.contacts?.length) {
    return data._embedded.contacts[0];
  }

  // Tentar sem o código do país (55)
  if (cleanPhone.startsWith("55") && cleanPhone.length > 10) {
    const withoutCountry = cleanPhone.slice(2);
    const data2 = await fetchKommo<{
      _embedded?: { contacts?: KommoContact[] };
    }>("/contacts", { query: withoutCountry });

    if (data2._embedded?.contacts?.length) {
      return data2._embedded.contacts[0];
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const chatsTable = process.env.IA_CHATS_TABLE || "chats";

    // Buscar todos os chats sem created_at
    const { data: chatsWithoutDate, error: fetchError } = await supabaseAdmin
      .from(chatsTable)
      .select("id, phone")
      .is("created_at", null)
      .order("id", { ascending: true });

    if (fetchError) throw fetchError;
    if (!chatsWithoutDate || chatsWithoutDate.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum chat sem created_at encontrado",
        updated: 0,
      });
    }

    console.log(
      `[backfill] Found ${chatsWithoutDate.length} chats without created_at`
    );

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (const chat of chatsWithoutDate) {
      if (!chat.phone) {
        notFound++;
        continue;
      }

      try {
        const contact = await findContactByPhone(chat.phone);

        if (contact && contact.created_at) {
          const createdAt = new Date(contact.created_at * 1000).toISOString();

          const { error: updateError } = await supabaseAdmin
            .from(chatsTable)
            .update({ created_at: createdAt })
            .eq("id", chat.id);

          if (updateError) {
            console.error(`[backfill] Update error chat ${chat.id}:`, updateError);
            errors++;
          } else {
            updated++;
          }
        } else {
          notFound++;
        }
      } catch (e) {
        console.error(`[backfill] Error for chat ${chat.id} (${chat.phone}):`, e);
        errors++;
      }

      if (updated % 50 === 0 && updated > 0) {
        console.log(`[backfill] Progress: ${updated} updated, ${notFound} not found, ${errors} errors`);
      }
    }

    console.log(
      `[backfill] Done! ${updated} updated, ${notFound} not found, ${errors} errors`
    );

    return NextResponse.json({
      success: true,
      total_without_date: chatsWithoutDate.length,
      updated,
      not_found: notFound,
      errors,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[backfill] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
