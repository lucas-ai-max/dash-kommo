const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.replace('\r', '').match(/^([^=]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
});

const KOMMO_SUBDOMAIN = env.KOMMO_SUBDOMAIN;
const KOMMO_API_TOKEN = env.KOMMO_API_TOKEN;

async function testPage(page) {
    const params = {
        limit: "250",
        with: "loss_reason",
        "filter[pipeline_id][]": "9968344",
        page: String(page)
    };

    let queryString = Object.entries(params)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("&");

    const url = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads?${queryString}`;
    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${KOMMO_API_TOKEN}` } });
        if (res.status === 204) {
            console.log(`[Page ${page}] 204 No Content`);
            return false;
        }
        if (!res.ok) {
            console.log(`[Page ${page}] Error ${res.status}`);
            return false;
        }
        const data = await res.json();
        console.log(`[Page ${page}] Leads: ${data._embedded?.leads?.length || 0}, Has Next: ${!!data._links?.next}`);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

async function main() {
    for (let i = 1; i <= 6; i++) {
        await testPage(i);
        await new Promise(r => setTimeout(r, 500)); // sleep half a second
    }
}
main();
