export type BeepaCsvRow = {
  mdaName: string;
  abbreviation: string;
  beepaPercent: number | null;
  tier: string;
  points: number | null;
  rule: string;
  notes: string;
  exempted: boolean;
};

export type BeepaImportCandidate = {
  name: string;
  abbreviation?: string;
};

const KNOWN_ALIASES: Record<string, string> = {
  "nigerian investment promotion commission": "Nigerian Investment Promotion Council",
  "trade marks registry": "Trademarks Registry",
  "trademarks registry": "Trademarks Registry",
  "efcc special control unit for money laundering":
    "EFCC - Special Control Unit for Money Laundering",
  "nigerian copyright commission": "Nigerian Copyright Commission",
  "port health quarantine services": "Port Health (Quarantine) Services",
  "port health services": "Port Health (Quarantine) Services",
};

const KNOWN_ABBR_ALIASES: Record<string, string> = {
  nicc: "Nigerian Copyright Commission",
  pha: "Port Health (Quarantine) Services",
  tmr: "Trademarks Registry",
  cltr: "Trademarks Registry",
};

function normalizeKey(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function toNumber(value: string): number | null {
  const cleaned = value.replace(/%/g, "").trim();
  if (!cleaned || cleaned.toUpperCase() === "N/A") return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

export function parseBeepaCsv(csvText: string): BeepaCsvRow[] {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV has no data rows.");
  }

  const header = parseCsvLine(lines[0]!).map((cell) => normalizeKey(cell));
  const idx = {
    mda: header.findIndex((h) => h === "mda"),
    abbr: header.findIndex((h) => h === "abbreviation"),
    percent: header.findIndex((h) => h === "beepa score percent" || h === "beepa_score_percent"),
    tier: header.findIndex((h) => h === "beepa tier" || h === "beepa_tier"),
    points: header.findIndex(
      (h) => h === "subnational beepa points" || h === "subnational_beepa_points"
    ),
    rule: header.findIndex((h) => h === "rule applied" || h === "rule_applied"),
    notes: header.findIndex((h) => h === "notes"),
  };

  if (idx.mda < 0 || idx.points < 0) {
    throw new Error(
      "CSV must include MDA and Subnational_BEEPA_Points columns (from the BEEPA sheet)."
    );
  }

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const tier = idx.tier >= 0 ? cells[idx.tier] || "" : "";
    const pointsRaw = cells[idx.points] || "";
    const exempted =
      tier.toLowerCase().includes("exempt") ||
      pointsRaw.toUpperCase() === "N/A" ||
      /do not score/i.test(cells[idx.notes] || "");

    return {
      mdaName: cells[idx.mda] || "",
      abbreviation: idx.abbr >= 0 ? cells[idx.abbr] || "" : "",
      beepaPercent: idx.percent >= 0 ? toNumber(cells[idx.percent] || "") : null,
      tier,
      points: exempted ? null : toNumber(pointsRaw),
      rule: idx.rule >= 0 ? cells[idx.rule] || "" : "",
      notes: idx.notes >= 0 ? cells[idx.notes] || "" : "",
      exempted,
    };
  }).filter((row) => row.mdaName.trim().length > 0);
}

export function resolveBeepaMdaName(
  row: Pick<BeepaCsvRow, "mdaName" | "abbreviation">,
  candidates: BeepaImportCandidate[]
): string | null {
  const abbrKey = normalizeKey(row.abbreviation);
  const nameKey = normalizeKey(row.mdaName);
  const aliased = KNOWN_ALIASES[nameKey];
  const aliasedKey = aliased ? normalizeKey(aliased) : null;
  const abbrAlias = abbrKey ? KNOWN_ABBR_ALIASES[abbrKey] : undefined;

  if (abbrAlias) {
    const byAliasName = candidates.find(
      (candidate) => normalizeKey(candidate.name) === normalizeKey(abbrAlias)
    );
    if (byAliasName) return byAliasName.name;
  }

  if (abbrKey) {
    const byAbbr = candidates.find(
      (candidate) => normalizeKey(candidate.abbreviation || "") === abbrKey
    );
    if (byAbbr) return byAbbr.name;
  }

  const exact = candidates.find((candidate) => {
    const candidateKey = normalizeKey(candidate.name);
    return (
      candidateKey === nameKey ||
      (aliasedKey !== null && candidateKey === aliasedKey)
    );
  });
  if (exact) return exact.name;

  const fuzzy = candidates.find((candidate) => {
    const candidateKey = normalizeKey(candidate.name);
    return (
      candidateKey.includes(nameKey) ||
      nameKey.includes(candidateKey) ||
      (aliasedKey !== null &&
        (candidateKey.includes(aliasedKey) || aliasedKey.includes(candidateKey)))
    );
  });

  return fuzzy?.name ?? null;
}

/** Convert sheet points into the value stored for a scale_1_10 Others item. */
export function beepaPointsToScaleValue(points: number, weight: number): number {
  if (weight <= 0) return 0;
  return Math.max(0, Math.min(10, (points / weight) * 10));
}

export function beepaScaleValueToPoints(value: number, weight: number): number {
  return Math.round(((value / 10) * weight) * 10) / 10;
}
