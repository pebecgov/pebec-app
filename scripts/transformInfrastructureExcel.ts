import * as XLSX from "xlsx";

type YesNoValue = "yes" | "no";

const inputPath = "/Users/david/Downloads/Infrastructure.xlsx";
const outputPath = "/Users/david/Downloads/Infrastructure_bulk.xlsx";

interface ScoreRow {
  state: string;
  indicator: string;
  subIndicator: string;
  value: YesNoValue;
  linkToSource?: string;
}

function normalizeYesNo(value: any): YesNoValue {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "yes" || normalized === "1") return "yes";
    return "no";
  }
  if (typeof value === "number") {
    return value > 0 ? "yes" : "no";
  }
  return value ? "yes" : "no";
}

function transformInfrastructureSheet(): void {
  const workbook = XLSX.readFile(inputPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

  if (rows.length < 3) {
    throw new Error("Infrastructure sheet must have at least 3 rows (title + headers + data).");
  }

  const dataRows = rows.slice(2); // Skip title row and header row
  const scores: ScoreRow[] = [];

  dataRows.forEach((row) => {
    const state = String(row[0] || "").trim();
    if (!state) return;

    scores.push({
      state,
      indicator: "infrastructure",
      subIndicator: "renewable_energy",
      value: normalizeYesNo(row[1]),
    });

    scores.push({
      state,
      indicator: "infrastructure",
      subIndicator: "renewable_energy_evs_cng",
      value: normalizeYesNo(row[2]),
    });

    scores.push({
      state,
      indicator: "infrastructure",
      subIndicator: "airport",
      value: normalizeYesNo(row[3]),
    });

    scores.push({
      state,
      indicator: "infrastructure",
      subIndicator: "airport_cargo_functional",
      value: normalizeYesNo(row[4]),
    });

    scores.push({
      state,
      indicator: "infrastructure",
      subIndicator: "railway",
      value: normalizeYesNo(row[6] ?? row[5]),
    });
  });

  const header = ["State", "Indicator Key", "SubIndicator Key", "Value", "Link to Source"];
  const sheetData = [
    header,
    ...scores.map((score) => [
      score.state,
      score.indicator,
      score.subIndicator,
      score.value,
      score.linkToSource || "",
    ]),
  ];

  const newWorkbook = XLSX.utils.book_new();
  const newSheet = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(newWorkbook, newSheet, "Infrastructure");

  XLSX.writeFile(newWorkbook, outputPath);
  console.log(`✅ Transformed file saved to ${outputPath}`);
  console.log(`Rows exported: ${scores.length}`);
}

transformInfrastructureSheet();

