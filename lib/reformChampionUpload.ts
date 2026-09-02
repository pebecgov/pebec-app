/** Reform champions may only upload modern Excel workbooks for BFA reports. */
export const REFORM_CHAMPION_UPLOAD_EXTENSION = ".xlsx";

const XLSX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

export function isAllowedReformChampionUpload(fileName: string, mimeType?: string | null): boolean {
  const lower = fileName.toLowerCase().trim();
  if (!lower.endsWith(REFORM_CHAMPION_UPLOAD_EXTENSION)) return false;
  if (mimeType && mimeType.length > 0 && !XLSX_MIME_TYPES.has(mimeType)) {
    return false;
  }
  return true;
}

export function reformChampionUploadRejectedMessage(fileName: string): string {
  return `Only .xlsx Excel files are accepted for BFA monthly reports. "${fileName}" cannot be uploaded — save your file as Excel (.xlsx), not PDF, Word, or .xls.`;
}
