"use client";

import { useMemo, useState } from "react";

type CitizenLanguage = "en" | "ha" | "ig" | "yo";

type TicketLanguageContentProps = {
  title: string;
  description: string;
  titleEn?: string | null;
  descriptionEn?: string | null;
  citizenLanguage?: CitizenLanguage | null;
  ticketNumber: string;
  children?: React.ReactNode;
};

const LANG_LABEL: Record<CitizenLanguage, string> = {
  en: "English",
  ha: "Hausa",
  ig: "Igbo",
  yo: "Yoruba",
};

type ViewLang = "en" | "original";

/** Rough check: Hausa/Igbo/Yoruba orthography markers vs plain English. */
function looksLikeEnglish(text: string): boolean {
  const sample = text.trim();
  if (!sample) return true;
  // Special Latin letters common in Hausa orthography.
  if (/[ɓƁɗƊƙƘƴƳṣṢ]/.test(sample)) return false;
  // Very rough: if text has many non-English function words from HA/IG/YO, treat as local.
  const localHints =
    /\b(da|wani|wata|kuma|don|ba|ne|ce|na|ka|yi|na-enyocha|nwere|esun|osise|jami'?i|kwastam|cin hanci|mkpesa|ọrụ)\b/i;
  if (localHints.test(sample)) return false;
  return true;
}

function resolvePair(
  primary: string,
  englishField: string | null | undefined,
): { english: string; original: string } {
  const en = englishField?.trim() || "";
  const base = primary.trim();
  if (!en) {
    return { english: base, original: base };
  }
  // Correct storage: primary = original, englishField = English.
  if (looksLikeEnglish(en) && !looksLikeEnglish(base)) {
    return { english: en, original: base };
  }
  // Inverted storage (seen in early enrich): primary = English, englishField = local.
  if (looksLikeEnglish(base) && !looksLikeEnglish(en)) {
    return { english: base, original: en };
  }
  // Fallback: trust englishField as English.
  return { english: en, original: base };
}

export default function TicketLanguageContent({
  title,
  description,
  titleEn,
  descriptionEn,
  citizenLanguage,
  ticketNumber,
  children,
}: TicketLanguageContentProps) {
  const hasTranslation =
    Boolean(titleEn?.trim()) || Boolean(descriptionEn?.trim());
  const canSwitch =
    Boolean(citizenLanguage) &&
    citizenLanguage !== "en" &&
    hasTranslation;

  const [view, setView] = useState<ViewLang>("en");
  const showEnglish = !canSwitch || view === "en";

  const titlePair = useMemo(
    () => resolvePair(title, titleEn),
    [title, titleEn],
  );
  const descriptionPair = useMemo(
    () => resolvePair(description, descriptionEn),
    [description, descriptionEn],
  );

  const displayTitle = showEnglish ? titlePair.english : titlePair.original;
  const displayDescription = showEnglish
    ? descriptionPair.english
    : descriptionPair.original;

  const originalLabel = citizenLanguage
    ? LANG_LABEL[citizenLanguage]
    : "Original";

  return (
    <div className="mt-6 space-y-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-gray-900 leading-snug">
              {displayTitle}
            </h1>
            <p className="text-gray-500 mt-1">
              Ticket Number:{" "}
              <span className="font-semibold text-gray-700">
                {ticketNumber}
              </span>
            </p>
          </div>

          {canSwitch && (
            <div
              className="shrink-0 self-start"
              role="group"
              aria-label="Complaint language"
            >
              <div className="inline-flex items-center rounded-md border border-gray-200 bg-white p-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setView("en")}
                  aria-pressed={view === "en"}
                  className={[
                    "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                    view === "en"
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                  ].join(" ")}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setView("original")}
                  aria-pressed={view === "original"}
                  className={[
                    "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                    view === "original"
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {originalLabel}
                </button>
              </div>
            </div>
          )}
        </div>

        {canSwitch && (
          <p className="text-xs text-gray-500">
            {showEnglish
              ? `Filed in ${originalLabel} · Showing English translation`
              : `Showing the citizen's original ${originalLabel} submission`}
          </p>
        )}

        {children}
      </div>

      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-semibold text-lg text-gray-900">Description</h3>
          {canSwitch && (
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              {showEnglish ? "English" : originalLabel}
            </span>
          )}
        </div>
        <div
          className="text-gray-800 leading-relaxed prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: displayDescription }}
        />
      </div>
    </div>
  );
}
