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
    canonicalName: "EFCC - Special Control Unit for Money Laundering",
    canonicalAbbr: "SCUML",
    aliases: [
      "scuml",
      "efcc - special control unit for money laundering",
      "scuml - efcc - special control unit for money laundering",
      "special control unit for money laundering",
      "special control unit against money laundering",
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
    const aliasSet = new Set(rename.aliases.map(normalizeAliasKey));
    if (candidates.some((candidate) => aliasSet.has(candidate))) {
      return rename.canonicalName;
    }
  }

  return name.trim();
}

export function isRenamedMda(name: string, canonicalName: string): boolean {
  return canonicalizeMdaName(name) === canonicalName;
}
