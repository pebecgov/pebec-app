/** Exclusion key for one mystery shopping type, e.g. mysteryType:<typeId>. */
export const MYSTERY_TYPE_EXCLUSION_PREFIX = "mysteryType:";

export function mysteryTypeExclusionKey(typeId: string): string {
  return `${MYSTERY_TYPE_EXCLUSION_PREFIX}${typeId}`;
}

export function isTestingServiceMysteryType(typeName: string): boolean {
  const key = String(typeName || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return key.includes("testing service");
}

export function exemptMysteryTypeIds(excluded: Iterable<string>): Set<string> {
  const ids = new Set<string>();
  for (const key of excluded) {
    if (typeof key === "string" && key.startsWith(MYSTERY_TYPE_EXCLUSION_PREFIX)) {
      const typeId = key.slice(MYSTERY_TYPE_EXCLUSION_PREFIX.length).trim();
      if (typeId) ids.add(typeId);
    }
  }
  return ids;
}

export type MysteryTypeRef = {
  typeId: string;
  typeName?: string;
};

export type MysteryQuestionWeight = {
  typeId: string;
  weight?: number;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Testing-service (or any exempt type) points come out of the mystery maximum.
 * Remaining score stays on the reduced maximum and is not scaled back up to the full block.
 */
export function mysteryExemptionAdjustment(args: {
  questions: MysteryQuestionWeight[];
  excludedTypeIds: Set<string>;
  mysteryTotal: number;
}): { exemptPoints: number; applicableMax: number } {
  let rawAll = 0;
  let rawExempt = 0;
  for (const question of args.questions) {
    const weight = question.weight || 0;
    rawAll += weight;
    if (args.excludedTypeIds.has(question.typeId)) rawExempt += weight;
  }

  if (rawAll <= 0 || rawExempt <= 0 || args.mysteryTotal <= 0) {
    return { exemptPoints: 0, applicableMax: args.mysteryTotal };
  }

  const exemptPoints = round2((rawExempt / rawAll) * args.mysteryTotal);
  const applicableMax = round2(Math.max(0, args.mysteryTotal - exemptPoints));
  return { exemptPoints, applicableMax };
}

export function isSavedMysteryTypeExempt(
  savedType: string,
  exemptTypeIds: Set<string>,
  types: MysteryTypeRef[] = []
): boolean {
  const value = String(savedType || "").trim();
  if (!value || exemptTypeIds.size === 0) return false;
  if (exemptTypeIds.has(value)) return true;
  const match = types.find(
    (type) => type.typeId === value || (type.typeName && type.typeName === value)
  );
  if (!match) return false;
  return exemptTypeIds.has(match.typeId);
}
