"use client";

import NextGoogleTranslateWidget, { LANGUAGES } from "next-google-translate-widget";
import "next-google-translate-widget/styles";

const SITE_TRANSLATE_LANGUAGES = [
  { label: "English", value: "en" },
  ...LANGUAGES.filter((l) => ["fr", "ar", "es", "pt", "hi", "sw"].includes(l.value)),
  { label: "Hausa", value: "ha", flag: "ng" },
  { label: "Igbo", value: "ig", flag: "ng" },
  { label: "Yorùbá", value: "yo", flag: "ng" },
];

export default function HeaderTranslateWidget() {
  return (
    <div className="pebec-header-translate shrink-0">
      <NextGoogleTranslateWidget
        pageLanguage="en"
        languages={SITE_TRANSLATE_LANGUAGES}
        menuAlign="right"
        className="pebec-header-translate-widget"
      />
    </div>
  );
}
