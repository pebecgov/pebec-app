
import { api } from "./convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function checkConfig() {
    const year = 2026;
    console.log(`Checking config for year ${year}...`);

    const efficiencyConfig = await client.query(api.scoring_config.getEfficiencyPeriod, { year });
    console.log("Efficiency Config:", efficiencyConfig);

    const efficiencyTotal = (efficiencyConfig?.slaPoints || 5) +
        (efficiencyConfig?.reportSubmissionPoints || 2) +
        (efficiencyConfig?.reportGovPoints || 20) +
        (efficiencyConfig?.timelinessPoints || 3);
    console.log("Efficiency Total:", efficiencyTotal);

    const mysteryQuestions = await client.query(api.scoring_config.getMysteryShoppingTypesWithQuestions, { year });
    let mysteryTotal = 0;
    if (mysteryQuestions) {
        mysteryQuestions.forEach((type: any) => {
            type.questions.forEach((q: any) => {
                mysteryTotal += q.weight || 0;
            });
        });
    }
    console.log("Mystery Total:", mysteryTotal);


    const othersItems = await client.query(api.scoring_config.getOthersItems, { year });
    const othersTotal = othersItems ? othersItems.reduce((sum: number, i: any) => sum + (i.weight || 0), 0) : 0;
    console.log("Others (Transparency) Total:", othersTotal);

    const innovationItems = await client.query(api.scoring_config.getInnovationStakeholderItems, { year, itemType: "innovation" });
    const innovationTotal = innovationItems ? innovationItems.reduce((sum: number, i: any) => sum + (i.weight || 0), 0) : 0;
    console.log("Innovation Total:", innovationTotal);

    const stakeholderItems = await client.query(api.scoring_config.getInnovationStakeholderItems, { year, itemType: "stakeholder" });
    const stakeholderTotal = stakeholderItems ? stakeholderItems.reduce((sum: number, i: any) => sum + (i.weight || 0), 0) : 0;
    console.log("Stakeholder Total:", stakeholderTotal);

    const grandTotal = efficiencyTotal + mysteryTotal + othersTotal + innovationTotal + stakeholderTotal;
    console.log("Calculated Grand Total:", grandTotal);
}

checkConfig();
