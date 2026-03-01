import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  fetchAllLeads,
  fetchPipelinesMap,
  fetchUsersMap,
  fetchCustomFieldIds,
  fetchLossReasons,
  extractCustomField,
  type KommoLead,
} from "@/lib/kommo";
import type { DashboardLead } from "@/types/database";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  const { data: syncLog } = await supabaseAdmin
    .from("dashboard_sync_log")
    .insert({ status: "running" })
    .select("id")
    .single();

  try {
    console.log("[sync-leads] Starting sync...");

    const [pipelines, users, customFieldIds, lossReasons] = await Promise.all([
      fetchPipelinesMap(),
      fetchUsersMap(),
      fetchCustomFieldIds(),
      fetchLossReasons(),
    ]);

    console.log("[sync-leads] Reference data loaded");
    console.log(
      `[sync-leads] Custom fields: canal=${customFieldIds.canal_venda_id}, pre=${customFieldIds.pre_atendimento_id}`
    );

    const PIPELINES_TO_SYNC = [9968344, 13215396, 11129984];
    const DAYS_BACK = 30;
    const createdAfter = new Date();
    createdAfter.setDate(createdAfter.getDate() - DAYS_BACK);

    let allLeads: KommoLead[] = [];

    for (const pipelineId of PIPELINES_TO_SYNC) {
      console.log(
        `[sync-leads] Fetching pipeline ${pipelineId} without time limits...`
      );
      try {
        const pipelineLeads = await fetchAllLeads({
          pipelineId,
          // Removed createdAfter to ensure all leads are fetched
        });
        console.log(`[sync-leads] Fetched ${pipelineLeads.length} leads for pipeline ${pipelineId}`);
        allLeads = allLeads.concat(pipelineLeads);
      } catch (e) {
        console.error(`[sync-leads] Error fetching pipeline ${pipelineId}:`, e);
      }
    }

    console.log(`[sync-leads] Total fetched ${allLeads.length} leads across all pipelines`);

    const processedLeads: DashboardLead[] = allLeads.map((lead: KommoLead) => {
      const canal = extractCustomField(lead, customFieldIds.canal_venda_id);
      const preAtendimento = extractCustomField(
        lead,
        customFieldIds.pre_atendimento_id
      );

      const isWon = lead.status_id === 142;
      const isLost = lead.status_id === 143;

      let motivoPerda: string | null = null;
      if (lead.loss_reason_id && lossReasons[lead.loss_reason_id]) {
        motivoPerda = lossReasons[lead.loss_reason_id];
      } else if (lead._embedded?.loss_reason?.[0]?.name) {
        motivoPerda = lead._embedded.loss_reason[0].name;
      }

      const createdAt = lead.created_at
        ? new Date(lead.created_at * 1000).toISOString()
        : null;
      const closedAt = lead.closed_at
        ? new Date(lead.closed_at * 1000).toISOString()
        : null;

      const cicloDias =
        lead.closed_at && lead.created_at
          ? Number(((lead.closed_at - lead.created_at) / 86400).toFixed(1))
          : null;

      return {
        kommo_lead_id: lead.id,
        lead_name: lead.name,
        pipeline_id: lead.pipeline_id,
        pipeline_name: pipelines[lead.pipeline_id]?.name || null,
        status_id: lead.status_id,
        status_name:
          pipelines[lead.pipeline_id]?.stages[lead.status_id]?.name || null,
        is_won: isWon,
        is_lost: isLost,
        is_active: !isWon && !isLost,
        responsible_user_id: lead.responsible_user_id,
        responsible_user_name: users[lead.responsible_user_id] || null,
        price: lead.price || 0,
        canal_venda: canal,
        pre_atendimento: preAtendimento,
        motivo_perda: motivoPerda,
        loss_reason_id: lead.loss_reason_id,
        created_at: createdAt,
        closed_at: closedAt,
        first_event_at: null,
        first_vendor_event_at: null,
        ciclo_dias: cicloDias,
        tempo_primeiro_atendimento_min: null,
        qtd_followups: 0,
        synced_at: new Date().toISOString(),
      };
    });

    const withCanal = processedLeads.filter((l) => l.canal_venda).length;
    const withMotivo = processedLeads.filter((l) => l.motivo_perda).length;
    console.log(
      `[sync-leads] Fields: ${withCanal} with canal, ${withMotivo} with motivo_perda`
    );

    // UPSERT in batches of 500
    let totalSynced = 0;
    for (let i = 0; i < processedLeads.length; i += 500) {
      const batch = processedLeads.slice(i, i + 500);
      const { error } = await supabaseAdmin
        .from("dashboard_leads")
        .upsert(batch, { onConflict: "kommo_lead_id" });

      if (error) {
        console.error(`[sync-leads] Upsert batch error:`, error);
        throw error;
      }
      totalSynced += batch.length;
    }

    const durationSeconds = Number(
      ((Date.now() - startTime) / 1000).toFixed(1)
    );

    if (syncLog?.id) {
      await supabaseAdmin
        .from("dashboard_sync_log")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          leads_synced: totalSynced,
          duration_seconds: durationSeconds,
        })
        .eq("id", syncLog.id);
    }

    console.log(
      `[sync-leads] Done! ${totalSynced} leads synced in ${durationSeconds}s`
    );

    // === DAILY SNAPSHOT ===
    // Aggregate leads by pipeline + vendor and save a daily snapshot
    console.log("[sync-leads] Saving daily snapshot...");
    try {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      const snapshotMap = new Map<string, {
        pipeline_id: number; pipeline_name: string;
        responsible_user_id: number; responsible_user_name: string;
        total_leads: number; leads_won: number; leads_lost: number;
        leads_active: number; receita_total: number;
      }>();

      for (const lead of processedLeads) {
        const key = `${lead.pipeline_id}_${lead.responsible_user_id || 0}`;
        if (!snapshotMap.has(key)) {
          snapshotMap.set(key, {
            pipeline_id: lead.pipeline_id,
            pipeline_name: lead.pipeline_name || "",
            responsible_user_id: lead.responsible_user_id || 0,
            responsible_user_name: lead.responsible_user_name || "Sem vendedor",
            total_leads: 0,
            leads_won: 0,
            leads_lost: 0,
            leads_active: 0,
            receita_total: 0,
          });
        }
        const snap = snapshotMap.get(key)!;
        snap.total_leads++;
        if (lead.is_won) { snap.leads_won++; snap.receita_total += lead.price || 0; }
        if (lead.is_lost) snap.leads_lost++;
        if (lead.is_active) snap.leads_active++;
      }

      const snapshotRows = Array.from(snapshotMap.values()).map((s) => ({
        snapshot_date: today,
        ...s,
      }));

      // Upsert in batches
      for (let i = 0; i < snapshotRows.length; i += 200) {
        const batch = snapshotRows.slice(i, i + 200);
        const { error: snapErr } = await supabaseAdmin
          .from("dashboard_daily_snapshot")
          .upsert(batch, { onConflict: "snapshot_date,pipeline_id,responsible_user_id" });
        if (snapErr) {
          console.error("[sync-leads] Snapshot upsert error:", snapErr);
        }
      }
      console.log(`[sync-leads] Saved ${snapshotRows.length} snapshot records for ${today}`);
    } catch (snapError) {
      console.error("[sync-leads] Snapshot error:", snapError);
      // Non-fatal: don't fail the sync if snapshot fails
    }

    // Auto-trigger metrics calculation
    console.log("[sync-leads] Triggering calculate-metrics...");
    try {
      const baseUrl = request.nextUrl.origin;
      await fetch(`${baseUrl}/api/cron/calculate-metrics`, {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      console.log("[sync-leads] Metrics calculated successfully");
    } catch (e) {
      console.error("[sync-leads] Failed to trigger metrics:", e);
    }

    return NextResponse.json({
      success: true,
      leads_synced: totalSynced,
      duration_seconds: durationSeconds,
    });
  } catch (error) {
    const durationSeconds = Number(
      ((Date.now() - startTime) / 1000).toFixed(1)
    );
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (syncLog?.id) {
      await supabaseAdmin
        .from("dashboard_sync_log")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          error_message: errorMessage,
          duration_seconds: durationSeconds,
        })
        .eq("id", syncLog.id);
    }

    console.error("[sync-leads] Error:", errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
