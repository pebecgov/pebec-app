/**
 * Transform the original Interstate Trade spreadsheet into the standard
 * bulk-import format (State, Indicator Key, SubIndicator Key, Value, Link).
 *
 * Expected source layout (based on provided template):
 * - One column labeled "STATES" that lists each Nigerian state.
 * - A column labeled "Elimination of Haulage fees. (0–2 Points)" that stores 0 or 2.
 * - A column labeled "Presence of State Owned Airports, Air Carriers, Rail, Seaport and Dryport (0–3 Points)"
 *   that stores 0, 1.5 or 3.
 * - (Optional) A "TOTAL SCORE (5 POINTS)" column that we ignore.
 *
 * The script converts those columns into two bulk-import friendly rows per state:
 * 1. `haulage_fees` with values `yes` / `no`.
 * 2. `state_owned_transport_assets` with values `0`, `1.5`, or `3`.
 *
 * Update `inputFilePath` / `outputFilePath` to point to your spreadsheet.
 */

import * as XLSX from "xlsx";
import * as path from "path";

const inputFilePath = path.resolve(
  "/Users/david/Downloads/interstate_trade_scores.xlsx"
);
const outputFilePath = path.resolve(
  "/Users/david/Downloads/interstate_trade_scores_fixed.xlsx"
);

const STATE_HEADER_TEXT = "states";
const HAULAGE_HEADER_TEXT = "elimination of haulage";
const TRANSPORT_HEADER_TEXT = "presence of state owned";

type CellLocation = {
  rowIndex: number;
  colIndex: number;
};

const findCellContaining = (
  rows: any[][],
  needle: string
): CellLocation | null => {
  const normalizedNeedle = needle.toLowerCase();
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? "").trim().toLowerCase();
      if (!cell) continue;
      if (cell.includes(normalizedNeedle)) {
        return { rowIndex: r, colIndex: c };
      }
    }
  }
  return null;
};

const normalizeNumber = (value: any): number | null => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim().replace(/[^\d.-]/g, "");
  if (!str) return null;
  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeTransportValue = (value: any): string | null => {
  const num = normalizeNumber(value);
  if (num === null) return null;
  if (num === 0) return "0";
  if (num === 1.5) return "1.5";
  if (num === 3) return "3";
  console.warn(
    `⚠️ Unexpected transport asset score "${value}". Allowed: 0, 1.5, 3.`
  );
  return null;
};

const normalizeHaulageValue = (value: any): string | null => {
  const lowered = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!lowered) return null;
  if (lowered === "yes" || lowered === "y") return "yes";
  if (lowered === "no" || lowered === "n") return "no";

  const num = normalizeNumber(lowered);
  if (num === null) return null;
  if (num >= 2) return "yes";
  if (num === 0) return "no";

  console.warn(
    `⚠️ Unexpected haulage score "${value}". Treating anything ≥2 as "yes" and 0 as "no".`
  );
  return num > 0 ? "yes" : "no";
};

function transformInterstateTradeExcel() {
  console.log("📄 Reading spreadsheet:", inputFilePath);
  const workbook = XLSX.readFile(inputFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
  }) as any[][];

  if (!rows.length) {
    throw new Error("Spreadsheet is empty.");
  }

  const stateHeader = findCellContaining(rows, STATE_HEADER_TEXT);
  const haulageHeader = findCellContaining(rows, HAULAGE_HEADER_TEXT);
  const transportHeader = findCellContaining(rows, TRANSPORT_HEADER_TEXT);

  if (!stateHeader || !haulageHeader || !transportHeader) {
    throw new Error(
      "Unable to locate required headers. Please confirm the template matches the screenshot."
    );
  }

  const dataStartRow = stateHeader.rowIndex + 1;

  const outputRows: any[][] = [
    ["State", "Indicator Key", "SubIndicator Key", "Value"],
  ];

  let processedStates = 0;

  for (let r = dataStartRow; r < rows.length; r++) {
    const row = rows[r];
    const state = String(row[stateHeader.colIndex] ?? "").trim();
    if (!state) {
      continue;
    }

    processedStates++;

    const haulageRaw = row[haulageHeader.colIndex];
    const haulageValue = normalizeHaulageValue(haulageRaw);

    if (haulageValue) {
      outputRows.push([
        state,
        "interstate_trade",
        "haulage_fees",
        haulageValue,
      ]);
    } else {
      console.warn(`⚠️ Missing haulage value for ${state}. Skipping.`);
    }

    const transportRaw = row[transportHeader.colIndex];
    const transportValue = normalizeTransportValue(transportRaw);

    if (transportValue !== null) {
      outputRows.push([
        state,
        "interstate_trade",
        "state_owned_transport_assets",
        transportValue,
      ]);
    } else {
      console.warn(
        `⚠️ Missing or invalid transport assets value for ${state}. Skipping.`
      );
    }
  }

  const outWorkbook = XLSX.utils.book_new();
  const outWorksheet = XLSX.utils.aoa_to_sheet(outputRows);
  outWorksheet["!cols"] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 35 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(outWorkbook, outWorksheet, "Interstate Trade");
  XLSX.writeFile(outWorkbook, outputFilePath);

  console.log(`\n✅ Wrote ${outputRows.length - 1} rows for ${processedStates} states.`);
  console.log("📂 Output file:", outputFilePath);
  console.log("You can now upload it through the bulk importer.");
}

try {
  transformInterstateTradeExcel();
} catch (error) {
  console.error("❌ Failed to transform spreadsheet:", error);
  process.exit(1);
}

