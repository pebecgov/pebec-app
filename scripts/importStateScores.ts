/**
 * Script to import state scores from Excel/CSV file
 * 
 * Usage:
 * 1. Place your Excel file in the data/ directory
 * 2. Update the file path and column mappings below
 * 3. Run: npx tsx scripts/importStateScores.ts
 * 
 * Expected Excel format:
 * - Column A: State Name
 * - Column B: Indicator Key (e.g., "access_to_electricity")
 * - Column C: Sub-Indicator Key (e.g., "band_a_shares")
 * - Column D: Value (e.g., "70-100")
 * - Column E: Link to Source (optional)
 */

import * as XLSX from "xlsx";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";

interface ScoreRow {
  state: string;
  indicator: string;
  subIndicator: string;
  value: string;
  linkToSource?: string;
}

async function importStateScores(filePath: string) {
  if (!CONVEX_URL) {
    console.error("NEXT_PUBLIC_CONVEX_URL environment variable is not set");
    process.exit(1);
  }

  const client = new ConvexHttpClient(CONVEX_URL);

  // Read Excel file
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  // Skip header row and parse data
  const scores: ScoreRow[] = [];
  
  // Adjust column indices based on your Excel structure
  // Format: [State, Indicator, SubIndicator, Value, LinkToSource?]
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) continue;

    const state = String(row[0] || "").trim();
    const indicator = String(row[1] || "").trim();
    const subIndicator = String(row[2] || "").trim();
    const value = String(row[3] || "").trim();
    const linkToSource = row[4] ? String(row[4]).trim() : undefined;

    if (state && indicator && subIndicator && value) {
      scores.push({
        state,
        indicator,
        subIndicator,
        value,
        linkToSource,
      });
    }
  }

  console.log(`Found ${scores.length} scores to import`);

  // Import in batches of 50
  const batchSize = 50;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < scores.length; i += batchSize) {
    const batch = scores.slice(i, i + batchSize);
    try {
      const result = await client.mutation(api.bulkImportStateScores.bulkImportStateScores, {
        scores: batch,
      });
      imported += result.imported;
      errors += result.errors;
      if (result.errorMessages.length > 0) {
        console.error("Errors in batch:", result.errorMessages);
      }
      console.log(`Imported batch ${Math.floor(i / batchSize) + 1}: ${result.imported} successful, ${result.errors} errors`);
    } catch (error) {
      console.error(`Error importing batch ${Math.floor(i / batchSize) + 1}:`, error);
      errors += batch.length;
    }
  }

  console.log(`\nImport complete!`);
  console.log(`Successfully imported: ${imported}`);
  console.log(`Errors: ${errors}`);
}

// Run the import
const filePath = process.argv[2] || "data/state-scores.xlsx";
importStateScores(filePath).catch(console.error);

