/**
 * MDAs that must not appear on the Live Dashboard ranking / PDF reports.
 * Nigeria Gas Company is intentionally NOT on this list.
 * National Single Window (NSW) is NOT here — it appears at the bottom as newly onboarded.
 */
const DASHBOARD_REPORT_EXCLUDED_MDA_NAMES = [
  "Department of State Services",
  "Federal Ministry of Aviation and Aerospace Development",
  "Federal Ministry of Environment",
  "Federal Ministry of Finance",
  "Ministry of Foreign Affairs",
  "Federal Ministry of Information and National Orientation",
  "Federal Ministry of Justice",
  "Federal Ministry of Power",
  "Federal Ministry of Transportation",
  "Federal Ministry of Works",
  "Nigeria Police Force",
  "Office of the Head of Service of the Federation",
  "Secretary to the Government of the Federation",
  "Office of the Secretary to the Government of the Federation",
  "Joint Tax Board",
  "Joint Revenue Board",
  "Ministry of Budget and Economic Planning",
  "Ministry of Interior",
  "Federal Ministry of Interior",
] as const;

export type RankingExemptMda = {
  abbreviation: string;
  name: string;
  /** Shown in Final Score / PDF when the MDA is unranked at the bottom. */
  note: string;
  aliases?: readonly string[];
};

/**
 * Fully exempt from ranked BFA scoring — always listed at the bottom
 * of the Live Dashboard / ranking PDF with their exemption note.
 */
export const RANKING_EXEMPT_MDAS: readonly RankingExemptMda[] = [
  {
    abbreviation: "REA",
    name: "Rural Electrification Agency",
    note: "Exempted due to being newly onboarded",
  },
  {
    abbreviation: "BOA",
    name: "Bank of Agriculture",
    note: "Exempted due to being newly onboarded",
  },
  {
    abbreviation: "NSW",
    name: "National Single Window",
    note: "Exempted due to being newly onboarded",
  },
  {
    abbreviation: "MOFI",
    name: "Ministry of Finance Incorporated",
    note: "Exempted due to being newly onboarded",
  },
  {
    abbreviation: "NPERA",
    name: "Nigerian Ports Economic Regulatory Agency",
    note: "Exempted due to being newly onboarded",
  },
  {
    abbreviation: "NAIC",
    name: "Nigerian Agricultural Insurance Corporation",
    note: "Exempted due to fire incident",
  },
] as const;

/** @deprecated Prefer RANKING_EXEMPT_MDAS — kept for callers that only mean newly onboarded. */
export const NEWLY_ONBOARDED_EXEMPT_MDAS = RANKING_EXEMPT_MDAS.filter(
  (entry) => entry.abbreviation !== "NAIC"
);

export const NEWLY_ONBOARDED_EXEMPT_NOTE =
  "Exempted due to being newly onboarded";

function normalizeMdaKey(name: string): string {
  return String(name || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/['’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const EXCLUDED_KEYS = new Set(
  DASHBOARD_REPORT_EXCLUDED_MDA_NAMES.map((name) => normalizeMdaKey(name))
);

function matchesNameOrAbbr(
  mdaName: string,
  entry: {
    abbreviation: string;
    name: string;
    aliases?: readonly string[];
  }
): boolean {
  const key = normalizeMdaKey(mdaName);
  if (!key) return false;
  if (key === normalizeMdaKey(entry.name)) return true;
  if (key === normalizeMdaKey(entry.abbreviation)) return true;
  if (entry.aliases?.some((a) => key === normalizeMdaKey(a))) return true;
  // "ABBR - Full Name" or "Full Name (ABBR)"
  const parts = key.split(" - ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    if (parts[0] === normalizeMdaKey(entry.abbreviation)) return true;
    if (parts.slice(1).join(" - ") === normalizeMdaKey(entry.name)) return true;
  }
  if (key.startsWith(normalizeMdaKey(entry.abbreviation) + " ")) return true;
  if (key.includes(`(${normalizeMdaKey(entry.abbreviation)})`)) return true;
  return false;
}

function nameInKeySet(mdaName: string, keys: Set<string>): boolean {
  const key = normalizeMdaKey(mdaName);
  if (!key) return false;
  if (keys.has(key)) return true;
  const parts = key.split(" - ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const fullName = parts.slice(1).join(" - ");
    if (keys.has(fullName)) return true;
    if (keys.has(parts[0])) return true;
  }
  return false;
}

export function isExcludedFromDashboardReport(mdaName: string): boolean {
  return nameInKeySet(mdaName, EXCLUDED_KEYS);
}

export function isExcludedFromBulkPdf(mdaName: string): boolean {
  return isExcludedFromDashboardReport(mdaName);
}

export function getRankingExemptEntry(mdaName: string): RankingExemptMda | null {
  return (
    RANKING_EXEMPT_MDAS.find((entry) => matchesNameOrAbbr(mdaName, entry)) ??
    null
  );
}

export function getRankingExemptNote(mdaName: string): string | null {
  return getRankingExemptEntry(mdaName)?.note ?? null;
}

/** Fully exempt from ranked scoring (newly onboarded + NAIC fire incident, etc.). */
export function isRankingExemptMda(mdaName: string): boolean {
  return getRankingExemptEntry(mdaName) !== null;
}

/** @deprecated Use isRankingExemptMda — includes NAIC and newly onboarded. */
export function isNewlyOnboardedExemptMda(mdaName: string): boolean {
  return isRankingExemptMda(mdaName);
}

/** @deprecated Use getRankingExemptEntry. */
export function getNewlyOnboardedExemptEntry(mdaName: string) {
  return getRankingExemptEntry(mdaName);
}
