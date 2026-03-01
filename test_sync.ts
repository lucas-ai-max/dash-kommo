import { fetchAllLeads } from './src/lib/kommo';
import 'dotenv/config'; // Make sure to load env vars

async function main() {
    try {
        const leads = await fetchAllLeads({ pipelineId: 9968344 });
        console.log("Total Fetched:", leads.length);
    } catch (e) {
        console.error("Error:", e);
    }
}
main();
