/**
 * Official BEEPA / public tracker MDA roster for 2026.
 * Source: PEBEC BEEPA General Report MDA list (Assessed + Exempted), excluding Bank of Agriculture (BOA).
 */
export type BeepaTrackerRosterEntry = {
  name: string;
  abbreviation: string;
  /** Programme-exempted from BEEPA (BFA recalculated without BEEPA). */
  beepaExempted: boolean;
  /** Extra names/abbrs used when matching dashboard / import rows. */
  aliases?: string[];
};

function normalizeKey(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 53 assessed + 5 exempted (BOA removed) = 58. */
export const BEEPA_TRACKER_ROSTER: BeepaTrackerRosterEntry[] = [
  { name: "Nigeria Customs Service", abbreviation: "NCS" },
  { name: "Nigerian Ports Authority", abbreviation: "NPA" },
  { name: "National Information Technology Development Agency", abbreviation: "NITDA" },
  { name: "National Pension Commission", abbreviation: "PENCOM" },
  { name: "Nigeria Agricultural Quarantine Service", abbreviation: "NAQS" },
  { name: "Nigeria Immigration Service", abbreviation: "NIS" },
  { name: "Nigerian Communications Commission", abbreviation: "NCC" },
  { name: "Nigeria Civil Aviation Authority", abbreviation: "NCAA" },
  { name: "Federal Road Safety Corps", abbreviation: "FRSC" },
  { name: "National Insurance Commission", abbreviation: "NAICOM" },
  { name: "Service Compact", abbreviation: "SERVICOM" },
  {
    name: "Nigerian Content Development and Monitoring Board",
    abbreviation: "NCDMB",
    aliases: ["Nigerian Content Development Management Board"],
  },
  { name: "Nigerian Electricity Management Service Agency", abbreviation: "NEMSA" },
  { name: "National Identity Management Commission", abbreviation: "NIMC" },
  { name: "Nigerian Airspace Management Agency", abbreviation: "NAMA" },
  { name: "National Drug Law Enforcement Agency", abbreviation: "NDLEA" },
  { name: "Industrial Training Fund", abbreviation: "ITF" },
  { name: "Nigerian Upstream Petroleum Regulatory Commission", abbreviation: "NUPRC" },
  { name: "Nigerian Export-Import Bank", abbreviation: "NEXIM" },
  { name: "Galaxy Backbone Limited", abbreviation: "GBB" },
  { name: "Corporate Affairs Commission", abbreviation: "CAC" },
  { name: "Federal Airports Authority of Nigeria", abbreviation: "FAAN" },
  {
    name: "EFCC - Special Control Unit for Money Laundering",
    abbreviation: "SCUML",
    aliases: [
      "EFCC – Special Control Unit for Money Laundering",
      "Special Control Unit for Money Laundering",
    ],
  },
  { name: "Nigeria Export Promotion Council", abbreviation: "NEPC" },
  {
    name: "National Environmental Standards and Regulations Enforcement Agency",
    abbreviation: "NESREA",
  },
  { name: "Securities and Exchange Commission", abbreviation: "SEC" },
  {
    name: "Nigerian Investment Promotion Commission",
    abbreviation: "NIPC",
    aliases: ["Nigerian Investment Promotion Council"],
  },
  { name: "Rural Electrification Agency", abbreviation: "REA" },
  { name: "Nigeria Export Processing Zone Authority", abbreviation: "NEPZA" },
  { name: "Nigerian Postal Service", abbreviation: "NIPOST" },
  { name: "Oil & Gas Free Zone Authority", abbreviation: "OGFZA" },
  { name: "Nigerian Maritime Administration and Safety Agency", abbreviation: "NIMASA" },
  { name: "Nigeria Data Protection Commission", abbreviation: "NDPC" },
  { name: "Nigerian Electricity Regulatory Commission", abbreviation: "NERC" },
  {
    name: "Nigerian Midstream and Downstream Petroleum Regulatory Authority",
    abbreviation: "NMDPRA",
  },
  { name: "Bank of Industry", abbreviation: "BOI" },
  { name: "Joint Revenue Board", abbreviation: "JRB" },
  {
    name: "Nigerian Shippers Council",
    abbreviation: "NSC",
    aliases: ["Nigerian Shippers' Council", "Nigerian Shippers’ Council"],
  },
  { name: "National Bureau of Statistics", abbreviation: "NBS" },
  { name: "Nigeria Social Insurance Trust Fund", abbreviation: "NSITF" },
  { name: "National Inland Waterways Authority", abbreviation: "NIWA" },
  { name: "Federal Competition and Consumer Protection Commission", abbreviation: "FCCPC" },
  { name: "Standards Organisation of Nigeria", abbreviation: "SON" },
  { name: "Environmental Health Council of Nigeria", abbreviation: "EHCON" },
  {
    name: "National Broadcasting Commission",
    abbreviation: "NBC",
    aliases: ["Nigeria Broadcasting Commission"],
  },
  {
    name: "National Agency for Food and Drug Administration and Control",
    abbreviation: "NAFDAC",
  },
  {
    name: "Citizenship and Business Department",
    abbreviation: "CBD",
    aliases: [
      "Citizenship and Business Department (CBD) within the Ministry of Interior",
      "Citizenship and Business Department within the Ministry of Interior",
    ],
  },
  {
    name: "National Office for Technology Acquisition and Promotion",
    abbreviation: "NOTAP",
  },
  {
    name: "Port Health (Quarantine) Services",
    abbreviation: "PHA",
    aliases: ["Port Health Services", "PHS"],
  },
  {
    name: "Nigerian Copyright Commission",
    abbreviation: "NiCC",
    aliases: ["NICC"],
  },
  { name: "Federal Produce Inspection Service", abbreviation: "FPIS" },
  { name: "Advertising Regulatory Council of Nigeria", abbreviation: "ARCON" },
  { name: "Bureau for Public Procurement", abbreviation: "BPP" },
  // Exempted (BOA excluded from this roster)
  {
    name: "Patents & Designs Registry",
    abbreviation: "PDR",
    beepaExempted: true,
    aliases: ["Patent and Design Registry", "Patents and Designs Registry"],
  },
  {
    name: "Trade Marks Registry",
    abbreviation: "TMR",
    beepaExempted: true,
    aliases: ["Trademarks Registry", "CLTR"],
  },
  {
    name: "Nigerian Agricultural Insurance Corporation",
    abbreviation: "NAIC",
    beepaExempted: true,
  },
  {
    name: "Nigeria Revenue Service",
    abbreviation: "NRS",
    beepaExempted: true,
    aliases: ["Federal Inland Revenue Service", "FIRS"],
  },
  {
    name: "Central Bank of Nigeria",
    abbreviation: "CBN",
    beepaExempted: true,
    aliases: [
      "Central Bank of Nigeria – National Collateral Agency",
      "Central Bank of Nigeria - National Collateral Agency",
      "CBN - NCR",
      "National Collateral Registry",
    ],
  },
].map((entry) => ({
  name: entry.name,
  abbreviation: entry.abbreviation,
  beepaExempted: entry.beepaExempted === true,
  aliases: entry.aliases,
}));

export const BEEPA_TRACKER_ROSTER_COUNT = BEEPA_TRACKER_ROSTER.length;

export function matchBeepaTrackerRosterEntry(
  mdaName: string,
  abbreviation?: string | null
): BeepaTrackerRosterEntry | null {
  const nameKey = normalizeKey(mdaName);
  const abbrKey = normalizeKey(abbreviation || "");

  if (abbrKey) {
    const byAbbr = BEEPA_TRACKER_ROSTER.find(
      (entry) =>
        normalizeKey(entry.abbreviation) === abbrKey ||
        (entry.aliases || []).some((alias) => normalizeKey(alias) === abbrKey)
    );
    if (byAbbr) return byAbbr;
  }

  for (const entry of BEEPA_TRACKER_ROSTER) {
    const keys = [
      normalizeKey(entry.name),
      normalizeKey(entry.abbreviation),
      ...(entry.aliases || []).map(normalizeKey),
    ];
    if (keys.includes(nameKey)) return entry;
  }

  // Fuzzy contains match as last resort (short names only when distinctive).
  for (const entry of BEEPA_TRACKER_ROSTER) {
    const entryKey = normalizeKey(entry.name);
    if (entryKey.length < 12) continue;
    if (nameKey.includes(entryKey) || entryKey.includes(nameKey)) return entry;
  }

  return null;
}

export function isOnBeepaTrackerRoster(mdaName: string, abbreviation?: string | null): boolean {
  return matchBeepaTrackerRosterEntry(mdaName, abbreviation) !== null;
}
