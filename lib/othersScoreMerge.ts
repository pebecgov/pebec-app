/**
 * One MDA can have several Others rows (half-year, full year, or a renamed
 * spelling). The tracker and admin must read the same combined result.
 *
 * Only items present in a row's `values` are applied from that row. A newer
 * save that fills every configured item with 0 must not erase an older
 * Transparency or Stakeholder score it never edited.
 */

export type OthersSavedRow = {
  updatedAt?: number;
  _creationTime?: number;
  values?: Record<string, boolean | number> | null;
  scores?: Record<string, number> | null;
};

export function mergeOthersSavedRows(rows: OthersSavedRow[]): {
  values: Record<string, boolean | number>;
  scores: Record<string, number>;
} {
  const ordered = [...rows].sort(
    (a, b) => (a.updatedAt || a._creationTime || 0) - (b.updatedAt || b._creationTime || 0),
  );
  const values: Record<string, boolean | number> = {};
  const scores: Record<string, number> = {};

  for (const row of ordered) {
    const rowValues =
      row.values && typeof row.values === "object" ? row.values : {};
    const rowScores =
      row.scores && typeof row.scores === "object" ? row.scores : {};
    const valueIds = Object.keys(rowValues);

    if (valueIds.length > 0) {
      for (const itemId of valueIds) {
        const value = rowValues[itemId];
        if (typeof value !== "boolean" && typeof value !== "number") continue;
        values[itemId] = value;
        if (Object.prototype.hasOwnProperty.call(rowScores, itemId)) {
          scores[itemId] = Number(rowScores[itemId]) || 0;
        }
      }
      continue;
    }

    for (const [itemId, score] of Object.entries(rowScores)) {
      scores[itemId] = Number(score) || 0;
    }
  }

  return { values, scores };
}

/** Overlay an edit onto a merged Others record without dropping untouched items. */
export function applyOthersEdit(
  base: { values: Record<string, boolean | number>; scores: Record<string, number> },
  incomingValues: Record<string, boolean | number> | null | undefined,
  incomingScores: Record<string, number> | null | undefined,
): {
  values: Record<string, boolean | number>;
  scores: Record<string, number>;
  totalScore: number;
} {
  const values = { ...base.values };
  const scores = { ...base.scores };
  const nextValues =
    incomingValues && typeof incomingValues === "object" ? incomingValues : {};
  const nextScores =
    incomingScores && typeof incomingScores === "object" ? incomingScores : {};

  for (const [itemId, value] of Object.entries(nextValues)) {
    if (typeof value !== "boolean" && typeof value !== "number") continue;
    values[itemId] = value;
    if (Object.prototype.hasOwnProperty.call(nextScores, itemId)) {
      scores[itemId] = Number(nextScores[itemId]) || 0;
    }
  }

  for (const [itemId, score] of Object.entries(nextScores)) {
    if ((Number(score) || 0) > 0 && !Object.prototype.hasOwnProperty.call(values, itemId)) {
      scores[itemId] = Number(score) || 0;
    }
  }

  const totalScore = Object.values(scores).reduce((sum, value) => sum + (Number(value) || 0), 0);
  return {
    values,
    scores,
    totalScore: Math.round(totalScore * 100) / 100,
  };
}
