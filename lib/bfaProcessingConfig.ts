/** Minimum % of non-blank data rows that must parse as valid for full success. */
export const SUCCESS_VALID_ROW_PERCENT = 80;

/** Below this % of valid rows (but >0), file is treated as failed — not "Processed OK". */
export const MIN_VALID_ROW_PERCENT = 20;

export function computeValidRowPercent(validRows: number, totalRows: number): number {
  if (totalRows <= 0) return 0;
  return (validRows / totalRows) * 100;
}

export function classifyProcessingQuality(
  validRows: number,
  totalRows: number
): "failed" | "partial_success" | "success" {
  if (validRows === 0 || totalRows === 0) return "failed";
  const pct = computeValidRowPercent(validRows, totalRows);
  if (pct < MIN_VALID_ROW_PERCENT) return "failed";
  if (pct < SUCCESS_VALID_ROW_PERCENT) return "partial_success";
  return "success";
}
