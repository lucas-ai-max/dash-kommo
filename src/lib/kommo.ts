const API_BASE = `https://${process.env.KOMMO_SUBDOMAIN}.kommo.com/api/v4`;
const RATE_LIMIT_MS = 150;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastRequestTime = 0;

async function fetchKommo<T = unknown>(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await sleep(RATE_LIMIT_MS - elapsed);
  }
  lastRequestTime = Date.now();

  const url = new URL(`${API_BASE}${endpoint}`);

  // Kommo v4 API is extremely sensitive to URL boundaries and doesn't always recognize 
  // fully encoded brackets `%5B` and `%5D` for array filters properly.
  let queryString = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  url.search = queryString;

  console.log(`[Kommo] GET ${endpoint}?${queryString}`);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.KOMMO_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 429) {
    console.warn("[Kommo] Rate limited, waiting 2s...");
    await sleep(2000);
    return fetchKommo<T>(endpoint, params);
  }

  // Kommo returns 204 No Content when no results match the filter
  if (res.status === 204) {
    return {} as T;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kommo API ${res.status}: ${text}`);
  }

  const text = await res.text();
  if (!text || text.trim() === "") {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

export interface KommoLeadResponse {
  _embedded?: {
    leads?: KommoLead[];
  };
  _links?: {
    next?: { href: string };
  };
}

export interface KommoLead {
  id: number;
  name: string;
  price: number;
  responsible_user_id: number;
  group_id: number;
  status_id: number;
  pipeline_id: number;
  loss_reason_id: number | null;
  source_id: number | null;
  created_at: number;
  updated_at: number;
  closed_at: number | null;
  created_by: number;
  closest_task_at: number | null;
  custom_fields_values: KommoCustomField[] | null;
  _embedded?: {
    loss_reason?: Array<{ id: number; name: string }>;
  };
}

export interface KommoCustomField {
  field_id: number;
  field_name: string;
  field_code: string | null;
  field_type: string;
  values: Array<{ value: string | number; enum_id?: number }>;
}

export interface KommoPipeline {
  id: number;
  name: string;
  sort: number;
  is_main: boolean;
  _embedded: {
    statuses: Array<{
      id: number;
      name: string;
      sort: number;
      is_editable: boolean;
      pipeline_id: number;
      color: string;
      type: number;
    }>;
  };
}

export interface KommoUser {
  id: number;
  name: string;
  email: string;
}

export interface KommoEvent {
  id: string;
  type: string;
  entity_id: number;
  entity_type: string;
  created_by: number;
  created_at: number;
  value_after: Array<{
    lead_status?: { id: number; pipeline_id: number };
    [key: string]: unknown;
  }>;
  value_before: Array<{
    lead_status?: { id: number; pipeline_id: number };
    [key: string]: unknown;
  }>;
}

export interface KommoNote {
  id: number;
  entity_id: number;
  note_type: string;
  created_at: number;
  created_by: number;
  params: Record<string, unknown>;
}

export type PipelineMap = Record<
  number,
  {
    name: string;
    stages: Record<number, { name: string; sort: number }>;
  }
>;

export type UserMap = Record<number, string>;

export interface FetchLeadsOptions {
  pipelineId?: number;
  createdAfter?: Date;
  updatedAfter?: Date;
}

export async function fetchAllLeads(
  options: FetchLeadsOptions = {}
): Promise<KommoLead[]> {
  const allLeads: KommoLead[] = [];
  let page = 1;

  const params: Record<string, string> = {
    limit: "250",
    with: "loss_reason",
  };

  if (options.pipelineId) {
    params["filter[pipeline_id][]"] = String(options.pipelineId);
  }

  if (options.createdAfter) {
    params["filter[created_at][from]"] = String(
      Math.floor(options.createdAfter.getTime() / 1000)
    );
  }

  if (options.updatedAfter) {
    params["filter[updated_at][from]"] = String(
      Math.floor(options.updatedAfter.getTime() / 1000)
    );
  }

  while (true) {
    const data = await fetchKommo<KommoLeadResponse>("/leads", {
      ...params,
      page: String(page),
    });

    if (!data._embedded?.leads?.length) break;
    allLeads.push(...data._embedded.leads);
    console.log(`[Kommo] Page ${page}: ${data._embedded.leads.length} leads`);

    if (!data._links?.next) break;
    page++;
  }

  // "Etapa de leads de entrada" is a special inbox stage that Kommo excludes
  // from the standard pipeline filter — fetch it separately and merge
  if (options.pipelineId && ENTRY_STAGE_IDS[options.pipelineId]) {
    const entryStageId = ENTRY_STAGE_IDS[options.pipelineId];
    const existingIds = new Set(allLeads.map((l) => l.id));
    let entryPage = 1;
    while (true) {
      const entryData = await fetchKommo<KommoLeadResponse>("/leads", {
        limit: "250",
        with: "loss_reason",
        [`filter[statuses][0][pipeline_id]`]: String(options.pipelineId),
        [`filter[statuses][0][status_id]`]: String(entryStageId),
        page: String(entryPage),
      });
      if (!entryData._embedded?.leads?.length) break;
      const newLeads = entryData._embedded.leads.filter((l) => !existingIds.has(l.id));
      allLeads.push(...newLeads);
      console.log(`[Kommo] Entry stage page ${entryPage}: ${entryData._embedded.leads.length} leads (${newLeads.length} new)`);
      if (!entryData._links?.next) break;
      entryPage++;
    }
  }

  return allLeads;
}

// Entry stage IDs per pipeline (special inbox stage excluded from standard filter)
const ENTRY_STAGE_IDS: Record<number, number> = {
  9968344: 76523124,
  13215396: 101900676,
  11480160: 88147668,
};

export async function fetchPipelinesMap(): Promise<PipelineMap> {
  const data = await fetchKommo<{
    _embedded: { pipelines: KommoPipeline[] };
  }>("/leads/pipelines");

  const map: PipelineMap = {};
  for (const pipeline of data._embedded.pipelines) {
    const stages: Record<number, { name: string; sort: number }> = {};
    for (const status of pipeline._embedded.statuses) {
      stages[status.id] = { name: status.name, sort: status.sort };
    }
    map[pipeline.id] = { name: pipeline.name, stages };
  }
  return map;
}

export async function fetchUsersMap(): Promise<UserMap> {
  const data = await fetchKommo<{
    _embedded: { users: KommoUser[] };
  }>("/users");

  const map: UserMap = {};
  for (const user of data._embedded.users) {
    map[user.id] = user.name;
  }
  return map;
}

export async function fetchCustomFieldIds(): Promise<{
  canal_venda_id: number | null;
  pre_atendimento_id: number | null;
  temperatura_id: number | null;
}> {
  const data = await fetchKommo<{
    _embedded: {
      custom_fields: Array<{ id: number; name: string; type: string }>;
    };
  }>("/leads/custom_fields");

  let canal_venda_id: number | null = null;
  let pre_atendimento_id: number | null = null;
  let temperatura_id: number | null = null;

  for (const field of data._embedded.custom_fields) {
    const nameLower = field.name.toLowerCase();
    if (
      nameLower.includes("canal") &&
      (nameLower.includes("venda") || nameLower.includes("vendas"))
    ) {
      canal_venda_id = field.id;
    }
    if (
      nameLower.includes("pré-atendimento") ||
      nameLower.includes("pre-atendimento") ||
      nameLower.includes("preatendimento")
    ) {
      pre_atendimento_id = field.id;
    }
    if (
      nameLower.includes("temperatura") ||
      nameLower.includes("temperature") ||
      (nameLower.includes("lead") && (nameLower.includes("quente") || nameLower.includes("frio") || nameLower.includes("morno")))
    ) {
      temperatura_id = field.id;
    }
  }

  console.log(`[kommo] Custom fields found: canal=${canal_venda_id}, pre=${pre_atendimento_id}, temperatura=${temperatura_id}`);

  return { canal_venda_id, pre_atendimento_id, temperatura_id };
}

export async function fetchLossReasons(): Promise<Record<number, string>> {
  try {
    const data = await fetchKommo<{
      _embedded: { loss_reasons: Array<{ id: number; name: string }> };
    }>("/leads/loss_reasons");

    const map: Record<number, string> = {};
    for (const reason of data._embedded.loss_reasons) {
      map[reason.id] = reason.name;
    }
    return map;
  } catch {
    return {};
  }
}

export async function fetchLeadEvents(
  leadId: number
): Promise<KommoEvent[]> {
  try {
    const data = await fetchKommo<{
      _embedded?: { events: KommoEvent[] };
    }>("/events", {
      "filter[entity][]": "lead",
      "filter[entity_id][]": String(leadId),
      "filter[type][]": "lead_status_changed",
    });
    return data._embedded?.events || [];
  } catch {
    return [];
  }
}

export async function fetchLeadNotes(
  leadId: number
): Promise<KommoNote[]> {
  try {
    const data = await fetchKommo<{
      _embedded?: { notes: KommoNote[] };
    }>(`/leads/${leadId}/notes`);
    return data._embedded?.notes || [];
  } catch {
    return [];
  }
}

// ── Bulk event fetching (paginated, all leads) ─────────────────────────────
export interface BulkEventsOptions {
  types?: string[];
  createdAfter?: Date;
  limit?: number; // max pages to fetch (safety)
}

export async function fetchBulkEvents(
  options: BulkEventsOptions = {}
): Promise<KommoEvent[]> {
  const allEvents: KommoEvent[] = [];
  let page = 1;
  const maxPages = options.limit || 100;

  const params: Record<string, string> = {
    limit: "100",
  };

  if (options.types && options.types.length > 0) {
    options.types.forEach((t, i) => {
      params[`filter[type][${i}]`] = t;
    });
  }

  if (options.createdAfter) {
    params["filter[created_at][from]"] = String(
      Math.floor(options.createdAfter.getTime() / 1000)
    );
  }

  while (page <= maxPages) {
    try {
      const data = await fetchKommo<{
        _embedded?: { events: KommoEvent[] };
        _links?: { next?: { href: string } };
      }>("/events", { ...params, page: String(page) });

      if (!data._embedded?.events?.length) break;
      allEvents.push(...data._embedded.events);
      console.log(`[Kommo] Events page ${page}: ${data._embedded.events.length} events (total: ${allEvents.length})`);

      if (!data._links?.next) break;
      page++;
    } catch (e) {
      console.error(`[Kommo] Error fetching events page ${page}:`, e);
      break;
    }
  }

  return allEvents;
}

// ── Bulk notes fetching for follow-up counting ──────────────────────────────
export async function fetchLeadNotesCount(leadId: number): Promise<number> {
  try {
    const data = await fetchKommo<{
      _embedded?: { notes: KommoNote[] };
    }>(`/leads/${leadId}/notes`, { limit: "250" });
    if (!data._embedded?.notes) return 0;
    // Count outgoing notes (follow-ups): types that indicate vendor activity
    const followupTypes = [
      "common", "call_out", "sms_out",
      "amocrm_delivery", "message_cashier",
    ];
    return data._embedded.notes.filter(
      (n) => followupTypes.includes(n.note_type)
    ).length;
  } catch {
    return 0;
  }
}

export function extractCustomField(
  lead: KommoLead,
  fieldId: number | null
): string | null {
  if (!fieldId || !lead.custom_fields_values) return null;
  const field = lead.custom_fields_values.find((f) => f.field_id === fieldId);
  if (!field || !field.values.length) return null;
  return String(field.values[0].value);
}
