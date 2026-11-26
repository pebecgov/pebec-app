export const MDA_RENAMES = [
  {
    canonicalName: "Nigeria Revenue Service",
    canonicalAbbr: "NRS",
    aliases: [
      "federal inland revenue service",
      "firs",
      "nigeria revenue service",
      "nrs",
    ],
  },
  {
    canonicalName: "Joint Revenue Board",
    canonicalAbbr: "JRB",
    aliases: [
      "joint tax board",
      "jtb",
      "joint revenue board",
      "jrb",
    ],
  },
  {
    // Display as CBN only — keep the same mdas._id; tickets already link by ID.
    canonicalName: "CBN - Central Bank of Nigeria",
    canonicalAbbr: "CBN",
    aliases: [
      "cbn",
      "central bank of nigeria",
      "cbn ncr",
      "cbn - ncr",
      "national collateral registry",
      "national collateral agency",
      "central bank of nigeria national collateral agency",
      "central bank of nigeria - national collateral agency",
      "cbn - ncr - central bank of nigeria - national collateral agency",
      "cbn - ncr - central bank of nigeria – national collateral agency",
    ],
  },
  {
    // Council → Commission; keep the same mdas._id.
    canonicalName: "NIPC - Nigerian Investment Promotion Commission",
    canonicalAbbr: "NIPC",
    aliases: [
      "nipc",
      "nigerian investment promotion council",
      "nigerian investment promotion commission",
      "nipc - nigerian investment promotion council",
      "nipc - nigerian investment promotion commission",
    ],
  },
  {
    // Display and ticket record use different prefixes for the same agency.
    canonicalName: "EFCC - Special Control Unit Against Money Laundering (SCUML)",
    canonicalAbbr: "SCUML",
    aliases: [
      "scuml",
      "efcc - special control unit for money laundering",
      "efcc - special control unit against money laundering",
      "efcc - special control unit against money laundering scuml",
      "efcc special control unit against money laundering scuml",
      "scuml - efcc - special control unit for money laundering",
      "scuml - efcc - special control unit against money laundering",
      "special control unit for money laundering",
      "special control unit against money laundering",
    ],
    /** Exact historical `mdaName` strings still present on metric rows. */
    legacyStoredNames: [
      "EFCC - Special Control Unit for Money Laundering",
      "EFCC – Special Control Unit for Money Laundering",
    ],
  },
  {
    canonicalName: "Nigerian Content Development and Monitoring Board (NCDMB)",
    canonicalAbbr: "NCDMB",
    aliases: [
      "ncdmb",
      "nigerian content development management board",
      "nigerian content development and monitoring board",
      "nigerian content development and monitoring board ncdmb",
    ],
    legacyStoredNames: [
      "Nigerian Content Development Management Board",
    ],
  },
  {
    canonicalName: "Nigeria Export Processing Zones Authority (NEPZA)",
    canonicalAbbr: "NEPZA",
    aliases: [
      "nepza",
      "nigeria export processing zone authority",
      "nigeria export processing zones authority",
      "nigeria export processing zones authority nepza",
    ],
    legacyStoredNames: [
      "Nigeria Export Processing Zones Authority",
      "Nigeria Export Processing Zone Authority",
    ],
  },
  {
    canonicalName: "Service Compact (SERVICOM)",
    canonicalAbbr: "SERVICOM",
    aliases: [
      "servicom",
      "service compact",
      "service compact servicom",
    ],
    legacyStoredNames: [
      "Service Compact",
      "SERVICOM",
    ],
  },
] as const;

function normalizeAliasKey(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripAbbreviationPrefix(value: string): string {
  let current = String(value || "").replace(/[–—]/g, "-").trim();
  current = current.replace(/\s*\([A-Za-z0-9.&/+\-]+\)\s*$/g, "").trim();
  let next = current;
  do {
    current = next;
    const match = current.match(/^[A-Z0-9.&/]+ - (.+)$/);
    next = match?.[1]?.trim() || current;
  } while (next !== current);
  return current;
}

export function canonicalizeMdaName(name: string): string {
  if (!name) return name;

  const candidates = [
    name,
    stripAbbreviationPrefix(name),
  ].map(normalizeAliasKey);

  for (const rename of MDA_RENAMES) {
    const aliasSet = new Set([
      ...rename.aliases.map(normalizeAliasKey),
      normalizeAliasKey(rename.canonicalName),
      ...((rename as { legacyStoredNames?: readonly string[] }).legacyStoredNames || []).map(
        normalizeAliasKey
      ),
    ]);
    if (candidates.some((candidate) => aliasSet.has(candidate))) {
      return rename.canonicalName;
    }
  }

  return name.trim();
}

export function isRenamedMda(name: string, canonicalName: string): boolean {
  return canonicalizeMdaName(name) === canonicalName;
}

export function mdaNamesEquivalent(a: string, b: string): boolean {
  return canonicalizeMdaName(a) === canonicalizeMdaName(b);
}

/**
 * Exact strings to try against `byMdaAndPeriod` before a period-wide scan.
 * Covers dropdown (canonical) names and known legacy DB spellings.
 */
export function mdaNameLookupCandidates(name: string): string[] {
  const trimmed = String(name || "").trim();
  if (!trimmed) return [];

  const canonical = canonicalizeMdaName(trimmed);
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    const key = value.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  };

  push(trimmed);
  push(canonical);

  for (const rename of MDA_RENAMES) {
    if (rename.canonicalName !== canonical) continue;
    push(rename.canonicalName);
    for (const legacy of (rename as { legacyStoredNames?: readonly string[] }).legacyStoredNames || []) {
      push(legacy);
    }
  }

  return out;
}
