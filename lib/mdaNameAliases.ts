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
] as const;

function normalizeAliasKey(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stripAbbreviationPrefix(value: string): string {
  const match = String(value || "").match(/^[A-Z0-9.&/ -]+ - (.+)$/);
  return match?.[1]?.trim() || String(value || "").trim();
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
