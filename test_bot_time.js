const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1]] = match[2].trim();
    }
});

async function fetchKommo(endpoint, params = {}) {
    const url = new URL(`https://${env.KOMMO_SUBDOMAIN}.kommo.com/api/v4${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${env.KOMMO_API_TOKEN}` },
    });
    if (res.status === 204) return {};
    if (!res.ok) throw new Error(`Kommo error ${res.status}: ${await res.text()}`);
    return await res.json();
}

async function main() {
    const days = 3;
    const from = Math.floor(Date.now() / 1000) - days * 86400;
    const events = [];
    let page = 1;

    while (true) {
        const data = await fetchKommo("/events", {
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
        if (page > 50) break; // Limit for safety
    }

    const outgoingCounts = {};
    events.forEach(ev => {
        if (ev.type === 'outgoing_chat_message') {
            outgoingCounts[ev.created_by] = (outgoingCounts[ev.created_by] || 0) + 1;
        }
    });

    console.log("Outgoing counts by User ID (last 3 days):", outgoingCounts);

    const botId = 0;
    const maxDiffSec = 600;

    const byLead = new Map();
    for (const ev of events) {
        if (!byLead.has(ev.entity_id)) byLead.set(ev.entity_id, []);
        byLead.get(ev.entity_id).push(ev);
    }

    const avgPerConversation = [];
    const allTimes = [];

    for (const leadEvents of byLead.values()) {
        const sorted = [...leadEvents].sort((a, b) => a.created_at - b.created_at);
        const times = [];
        let lastIncomingAt = null;

        for (const ev of sorted) {
            if (ev.type === "incoming_chat_message") {
                lastIncomingAt = ev.created_at;
            } else if (
                ev.type === "outgoing_chat_message" &&
                ev.created_by === botId &&
                lastIncomingAt !== null
            ) {
                const diff = ev.created_at - lastIncomingAt;
                if (diff > 0 && diff < maxDiffSec) times.push(diff);
                lastIncomingAt = null;
            }
        }

        if (times.length > 0) {
            allTimes.push(...times);
            const convAvg = times.reduce((a, b) => a + b, 0) / times.length;
            avgPerConversation.push({ avg: convAvg, timesCount: times.length });
        }
    }

    const macroAvg = avgPerConversation.reduce((a, b) => a + b.avg, 0) / avgPerConversation.length;
    const microAvg = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;

    let delayedResponses = allTimes.filter(t => t > 180).length;

    console.log(`\nMacro Average (per conversation): ${macroAvg.toFixed(2)}s`);
    console.log(`Micro Average (per message): ${microAvg.toFixed(2)}s`);
    console.log(`Min: ${Math.min(...allTimes)}s, Max: ${Math.max(...allTimes)}s`);
    console.log(`Total messages counted: ${allTimes.length}`);
    console.log(`Responses taking > 3 minutes: ${delayedResponses}`);

    console.log("\nTop 5 slowest responses under 10m:");
    console.log(allTimes.sort((a, b) => b - a).slice(0, 5).join("s, ") + "s");
}

main().catch(console.error);
