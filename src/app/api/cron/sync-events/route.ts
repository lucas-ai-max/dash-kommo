import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  fetchBulkEvents,
  fetchLeadNotesCount,
  fetchPipelinesMap,
  type KommoEvent,
  type PipelineMap,
} from "@/lib/kommo";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Bot/system user IDs that should NOT count as "vendor first response"
// Kommo system actions typically have created_by = 0 or a bot user ID
const BOT_USER_IDS = new Set([0]);

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    console.log("[sync-events] Starting events sync...");

    const pipelines = await fetchPipelinesMap();

    // Fetch status_changed events from last 90 days
    const daysBack = 90;
    const createdAfter = new Date();
    createdAfter.setDate(createdAfter.getDate() - daysBack);

    console.log("[sync-events] Fetching lead_status_changed events...");
    const statusEvents = await fetchBulkEvents({
      types: ["lead_status_changed"],
      createdAfter,
      limit: 200,
    });
    console.log(`[sync-events] Fetched ${statusEvents.length} status change events`);

    // Also fetch message events for follow-up counting and first response detection
    console.log("[sync-events] Fetching message events...");
    const messageEvents = await fetchBulkEvents({
      types: [
        "outgoing_chat_message",
        "incoming_chat_message",
        "outgoing_call",
        "incoming_call",
      ],
      createdAfter,
      limit: 200,
    });
    console.log(`[sync-events] Fetched ${messageEvents.length} message/call events`);

    // Combine all events and group by lead ID
    const allEvents = [...statusEvents, ...messageEvents];
    const eventsByLead = new Map<number, KommoEvent[]>();
    for (const event of allEvents) {
      if (event.entity_type !== "lead") continue;
      const leadId = event.entity_id;
      if (!eventsByLead.has(leadId)) eventsByLead.set(leadId, []);
      eventsByLead.get(leadId)!.push(event);
    }

    console.log(`[sync-events] Events grouped for ${eventsByLead.size} leads`);

    // Fetch existing leads from DB to get created_at for tempo calculation
    const leadIds = Array.from(eventsByLead.keys());
    const leadsMap = new Map<number, { created_at: string | null; responsible_user_id: number | null; first_event_at: string | null; tempo_primeiro_atendimento_min: number | null }>();

    for (let i = 0; i < leadIds.length; i += 500) {
      const batch = leadIds.slice(i, i + 500);
      const { data: dbRows } = await supabaseAdmin
        .from("dashboard_leads")
        .select("kommo_lead_id, created_at, responsible_user_id, first_event_at, tempo_primeiro_atendimento_min")
        .in("kommo_lead_id", batch);
      if (dbRows) {
        for (const row of dbRows) {
          leadsMap.set(row.kommo_lead_id, {
            created_at: row.created_at,
            responsible_user_id: row.responsible_user_id,
            first_event_at: row.first_event_at,
            tempo_primeiro_atendimento_min: row.tempo_primeiro_atendimento_min,
          });
        }
      }
    }

    // Process events per lead
    let updatedCount = 0;
    const updates: Array<{
      kommo_lead_id: number;
      first_event_at: string | null;
      first_vendor_event_at: string | null;
      tempo_primeiro_atendimento_min: number | null;
      qtd_followups: number;
    }> = [];

    for (const [leadId, events] of eventsByLead) {
      const lead = leadsMap.get(leadId);
      if (!lead) continue; // Lead not in our DB

      // Skip if already has tempo calculated (don't overwrite)
      if (lead.tempo_primeiro_atendimento_min != null) continue;

      // Sort events by created_at
      events.sort((a, b) => a.created_at - b.created_at);

      // Find first event of any kind
      const firstEvent = events[0];
      const firstEventAt = firstEvent
        ? new Date(firstEvent.created_at * 1000).toISOString()
        : null;

      // Find first vendor/human activity (not bot)
      const vendorEvents = events.filter(
        (e) =>
          !BOT_USER_IDS.has(e.created_by) &&
          e.created_by !== 0 &&
          (e.type === "outgoing_chat_message" ||
            e.type === "outgoing_call" ||
            e.type === "lead_status_changed")
      );

      const firstVendorEvent = vendorEvents[0];
      const firstVendorEventAt = firstVendorEvent
        ? new Date(firstVendorEvent.created_at * 1000).toISOString()
        : null;

      // Calculate tempo_primeiro_atendimento_min
      let tempoMin: number | null = null;
      if (firstVendorEvent && lead.created_at) {
        const createdMs = new Date(lead.created_at).getTime();
        const firstVendorMs = firstVendorEvent.created_at * 1000;
        tempoMin = Number(((firstVendorMs - createdMs) / 60000).toFixed(1));
        if (tempoMin < 0) tempoMin = 0; // Edge case: event before lead created_at
      }

      // Count follow-ups (outgoing messages after the first one)
      const outgoing = events.filter(
        (e) =>
          e.type === "outgoing_chat_message" || e.type === "outgoing_call"
      );
      const followups = Math.max(0, outgoing.length - 1); // First one is response, rest are follow-ups

      updates.push({
        kommo_lead_id: leadId,
        first_event_at: firstEventAt,
        first_vendor_event_at: firstVendorEventAt,
        tempo_primeiro_atendimento_min: tempoMin,
        qtd_followups: followups,
      });
    }

    console.log(`[sync-events] Prepared ${updates.length} lead updates`);

    // Batch update leads
    for (let i = 0; i < updates.length; i += 50) {
      const batch = updates.slice(i, i + 50);
      for (const update of batch) {
        const { error } = await supabaseAdmin
          .from("dashboard_leads")
          .update({
            first_event_at: update.first_event_at,
            first_vendor_event_at: update.first_vendor_event_at,
            tempo_primeiro_atendimento_min: update.tempo_primeiro_atendimento_min,
            qtd_followups: update.qtd_followups,
          })
          .eq("kommo_lead_id", update.kommo_lead_id);
        if (error) {
          console.error(`[sync-events] Update error for lead ${update.kommo_lead_id}:`, error);
        } else {
          updatedCount++;
        }
      }
    }

    console.log(`[sync-events] Updated ${updatedCount} leads with event data`);

    // === STAGE DURATION CALCULATION ===
    console.log("[sync-events] Calculating stage durations...");
    const stageDurations = calculateStageDurations(statusEvents, pipelines);

    if (stageDurations.length > 0) {
      const now = new Date().toISOString();
      const durationRows = stageDurations.map((sd) => ({
        ...sd,
        calculated_at: now,
      }));

      // Delete old records and insert new
      await supabaseAdmin.from("dashboard_stage_durations").delete().gte("id", 0);
      for (let i = 0; i < durationRows.length; i += 100) {
        const batch = durationRows.slice(i, i + 100);
        const { error } = await supabaseAdmin
          .from("dashboard_stage_durations")
          .insert(batch);
        if (error) {
          console.error("[sync-events] Stage duration insert error:", error);
        }
      }
      console.log(`[sync-events] Saved ${stageDurations.length} stage duration records`);
    }

    const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(1));

    console.log(`[sync-events] Done in ${durationSeconds}s. Updated ${updatedCount} leads, ${stageDurations.length} stage durations.`);

    return NextResponse.json({
      success: true,
      leads_updated: updatedCount,
      events_processed: allEvents.length,
      stage_durations: stageDurations.length,
      duration_seconds: durationSeconds,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[sync-events] Error:", errorMessage);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

/**
 * Calculate average time spent in each pipeline stage from status_changed events.
 * Groups sequential transitions per lead to compute per-stage durations.
 */
function calculateStageDurations(
  events: KommoEvent[],
  pipelines: PipelineMap
): Array<{
  pipeline_id: number;
  pipeline_name: string | null;
  status_id: number;
  status_name: string | null;
  avg_duration_hours: number;
  median_duration_hours: number;
  sample_size: number;
}> {
  // Group status_changed events by lead
  const byLead = new Map<number, KommoEvent[]>();
  for (const event of events) {
    if (event.type !== "lead_status_changed") continue;
    if (!byLead.has(event.entity_id)) byLead.set(event.entity_id, []);
    byLead.get(event.entity_id)!.push(event);
  }

  // For each lead, compute duration per stage from sequential transitions
  // Key: "pipelineId_statusId", Value: durations in hours
  const stageDurationsMap = new Map<string, number[]>();

  for (const [, leadEvents] of byLead) {
    // Sort by timestamp
    leadEvents.sort((a, b) => a.created_at - b.created_at);

    for (let i = 0; i < leadEvents.length; i++) {
      const event = leadEvents[i];
      const before = event.value_before?.[0]?.lead_status;
      if (!before) continue;

      // Duration this lead spent in the "before" stage
      let durationSec: number;
      if (i === 0) {
        // Can't determine when they entered this stage — skip
        continue;
      } else {
        durationSec = event.created_at - leadEvents[i - 1].created_at;
      }

      if (durationSec <= 0) continue;

      const key = `${before.pipeline_id}_${before.id}`;
      if (!stageDurationsMap.has(key)) stageDurationsMap.set(key, []);
      stageDurationsMap.get(key)!.push(durationSec / 3600); // Convert to hours
    }
  }

  // Aggregate
  const results: Array<{
    pipeline_id: number;
    pipeline_name: string | null;
    status_id: number;
    status_name: string | null;
    avg_duration_hours: number;
    median_duration_hours: number;
    sample_size: number;
  }> = [];

  for (const [key, durations] of stageDurationsMap) {
    if (durations.length < 2) continue; // Need at least 2 samples
    const [pipelineIdStr, statusIdStr] = key.split("_");
    const pipelineId = Number(pipelineIdStr);
    const statusId = Number(statusIdStr);

    durations.sort((a, b) => a - b);
    const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
    const mid = Math.floor(durations.length / 2);
    const median =
      durations.length % 2 === 0
        ? (durations[mid - 1] + durations[mid]) / 2
        : durations[mid];

    const pipelineName = pipelines[pipelineId]?.name || null;
    const statusName = pipelines[pipelineId]?.stages[statusId]?.name || null;

    results.push({
      pipeline_id: pipelineId,
      pipeline_name: pipelineName,
      status_id: statusId,
      status_name: statusName,
      avg_duration_hours: Number(avg.toFixed(1)),
      median_duration_hours: Number(median.toFixed(1)),
      sample_size: durations.length,
    });
  }

  return results;
}
