/**
 * MDAs that must not appear on the Live Dashboard ranking / PDF reports.
 * Nigeria Gas Company is intentionally NOT on this list.
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
  "National Single Window",
  "Nigeria Police Force",
  "Office of the Head of Service of the Federation",
  "Secretary to the Government of the Federation",
  "Office of the Secretary to the Government of the Federation",
  "Joint Tax Board",
  "Joint Revenue Board",
  "Ministry of Budget and Economic Planning",
] as const;

function normalizeMdaKey(name: string): string {
  return String(name || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

const EXCLUDED_KEYS = new Set(
  DASHBOARD_REPORT_EXCLUDED_MDA_NAMES.map((name) => normalizeMdaKey(name))
);

export function isExcludedFromDashboardReport(mdaName: string): boolean {
  const key = normalizeMdaKey(mdaName);
  if (!key) return false;
  if (EXCLUDED_KEYS.has(key)) return true;
  // Match "ABBR - Full Name" forms against the full-name portion.
  const parts = key.split(" - ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const fullName = parts.slice(1).join(" - ");
    if (EXCLUDED_KEYS.has(fullName)) return true;
  }
  return false;
}
