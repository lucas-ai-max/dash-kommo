const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.replace('\r', '').match(/^([^=]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim();
});

const KOMMO_SUBDOMAIN = env.KOMMO_SUBDOMAIN;
const KOMMO_API_TOKEN = env.KOMMO_API_TOKEN;

async function testFilter(filterStr) {
    const url = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads?${filterStr}&limit=5`;
    try {
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${KOMMO_API_TOKEN}` } });
        if (res.status === 204) {
            console.log(`[204] ${filterStr}`);
            return;
        }
        if (!res.ok) {
            console.log(`[${res.status}] ${filterStr} -> Error`);
            return;
        }
        const data = await res.json();
        console.log(`[OK ] ${filterStr} -> Leads: ${data._embedded?.leads?.length || 0}`);
    } catch (e) {
        console.error(e);
    }
}

async function main() {
    const pid = 9968344;
    await testFilter(`filter[pipeline_id]=${pid}`);
    await testFilter(`filter[pipeline_id][]=${pid}`);
    await testFilter(`filter[pipeline_id][0]=${pid}`);
    await testFilter(`filter[statuses][0][pipeline_id]=${pid}`);
    await testFilter(`filter[statuses][pipeline_id]=${pid}`);
    await testFilter(`filter[statuses][pipeline_id][]=${pid}`);
    await testFilter(`filter[pipelines][0][id]=${pid}`);
    await testFilter(`filter[pipeline_id][0][pipeline_id]=${pid}`);
    await testFilter(`filter[statuses][0][pipeline_id][]=${pid}`);
}
main();
