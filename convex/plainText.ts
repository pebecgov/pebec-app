/** Strip HTML for absence notices and other plain-text fields stored in Convex. */
export function htmlToPlainText(html: string, maxLength?: number): string {
  if (!html) return "";
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, " — ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (maxLength != null && text.length > maxLength) {
    text = `${text.slice(0, maxLength).trim()}…`;
  }
  return text;
}

export function buildLeaveAbsenceDescription(
  subject: string,
  _bodyHtml?: string,
): string {
  // Keep absence notices concise: only the leave subject is propagated.
  return `Approved leave request: ${subject.trim()}`;
}
