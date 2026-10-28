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
] as const;

/** Skipped in “Download All PDFs” only (still may appear on ranking table/PDF). */
const BULK_PDF_EXCLUDED_MDA_NAMES = [
  "Ministry of Interior",
  "Federal Ministry of Interior",
] as const;

/**
 * Newly onboarded — exempted from ranked scoring; always listed at the bottom
 * of the BFA ranking PDF with an exemption note.
 */
export const NEWLY_ONBOARDED_EXEMPT_MDAS = [
  { abbreviation: "REA", name: "Rural Electrification Agency" },
  { abbreviation: "BOA", name: "Bank of Agriculture" },
  { abbreviation: "NSW", name: "National Single Window" },
  { abbreviation: "MOFI", name: "Ministry of Finance Incorporated" },
  {
    abbreviation: "NPERA",
    name: "Nigerian Ports Economic Regulatory Agency",
  },
] as const;

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

const BULK_EXCLUDED_KEYS = new Set(
  BULK_PDF_EXCLUDED_MDA_NAMES.map((name) => normalizeMdaKey(name))
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
  return (
    isExcludedFromDashboardReport(mdaName) ||
    nameInKeySet(mdaName, BULK_EXCLUDED_KEYS)
  );
}

export function isNewlyOnboardedExemptMda(mdaName: string): boolean {
  return NEWLY_ONBOARDED_EXEMPT_MDAS.some((entry) =>
    matchesNameOrAbbr(mdaName, entry)
  );
}

export function getNewlyOnboardedExemptEntry(mdaName: string) {
  return (
    NEWLY_ONBOARDED_EXEMPT_MDAS.find((entry) =>
      matchesNameOrAbbr(mdaName, entry)
    ) ?? null
  );
}
