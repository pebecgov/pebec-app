// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import Script from "next/script";

/**
 * Google Website Translator (free widget). Loads once; page default language is English.
 * @see https://translate.google.com/intl/en/about/website/
 */
export default function GoogleTranslate() {
  return (
    <div className="notranslate fixed bottom-4 right-4 z-[100] flex max-w-[min(220px,calc(100vw-2rem))] flex-col items-end gap-1 rounded-lg border border-gray-200 bg-white/95 p-2 shadow-md backdrop-blur-sm dark:border-gray-600 dark:bg-gray-900/95">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Language
      </span>
      <div
        id="google_translate_element"
        className="[&_.goog-te-gadget]:!text-gray-800 [&_.goog-te-gadget-simple]:!border-0 dark:[&_.goog-te-gadget]:!text-gray-100 [&_span]:!text-gray-700 dark:[&_span]:!text-gray-200 [&_select]:!max-w-[200px] [&_select]:!rounded-md [&_select]:!border [&_select]:!border-gray-300 [&_select]:!bg-white [&_select]:!px-2 [&_select]:!py-1 [&_select]:!text-sm dark:[&_select]:!border-gray-500 dark:[&_select]:!bg-gray-800"
      />
      <Script
        id="google-translate-callback"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            function googleTranslateElementInit() {
              try {
                if (!window.google || !google.translate || !google.translate.TranslateElement) return;
                var opts = { pageLanguage: "en" };
                if (google.translate.TranslateElement.InlineLayout) {
                  opts.layout = google.translate.TranslateElement.InlineLayout.SIMPLE;
                }
                new google.translate.TranslateElement(opts, "google_translate_element");
              } catch (e) {
                console.error("Google Translate init failed:", e);
              }
            }
          `
        }}
      />
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
    </div>
  );
}
