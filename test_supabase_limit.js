const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.replace('\r', '').match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1]] = match[2].trim();
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAllSupabase(queryBuilder) {
    let allData = [];
    let from = 0;
    const step = 1000;

    while (true) {
        const { data, error } = await queryBuilder.range(from, from + step - 1);
        if (error) {
            console.error(error);
            break;
        }
        if (!data || data.length === 0) break;

        allData = allData.concat(data);
        if (data.length < step) break;

        from += step;
    }
    return allData;
}

async function main() {
    const query = supabase
        .from('dashboard_leads')
        .select('id')
        .eq('pipeline_id', 9968344);

    const data = await fetchAllSupabase(query);
    console.log(`Fetched ${data.length} leads with pagination helper`);
}

main().catch(console.error);
