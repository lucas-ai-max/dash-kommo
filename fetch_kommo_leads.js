const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.replace('\r', '').match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1]] = match[2].trim();
    }
});

const KOMMO_SUBDOMAIN = env.KOMMO_SUBDOMAIN;
const KOMMO_API_TOKEN = env.KOMMO_API_TOKEN;

async function main() {
    const pipeCounts = {};
    let page = 1;
    let totalFetched = 0;

    while (page <= 5) {
        const url = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads?limit=250&page=${page}`;
        try {
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${KOMMO_API_TOKEN}` } });
            if (res.status === 204) break;
            const data = await res.json();
            const leads = data._embedded?.leads || [];
            if (leads.length === 0) break;

            totalFetched += leads.length;
            leads.forEach(l => {
                pipeCounts[l.pipeline_id] = (pipeCounts[l.pipeline_id] || 0) + 1;
            });
            page++;
        } catch (err) {
            console.error(err);
            break;
        }
    }

    console.log(`Fetched ${totalFetched} recent leads in total.`);
    console.log("Leads per pipeline:", pipeCounts);
}
main();
