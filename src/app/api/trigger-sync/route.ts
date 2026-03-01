import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const secret = process.env.CRON_SECRET ?? "";
  const headers = { Authorization: `Bearer ${secret}` };

  // Dispara os syncs em background sem bloquear a resposta
  Promise.allSettled([
    fetch(`${origin}/api/cron/sync-leads`, { headers }),
    fetch(`${origin}/api/cron/sync-ia-metrics`, { headers }),
  ]).catch(() => {});

  return NextResponse.json({ started: true });
}
