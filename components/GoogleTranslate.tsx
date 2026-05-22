// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
// @ts-nocheck
"use client";

import { useEffect, useRef } from "react";
import { Globe } from "lucide-react";

/**
 * Loads the legacy Google Website Translator widget for public pages only
 * (see `isHiddenPath` in `app/(site)/layout.tsx`).
 */
export default function GoogleTranslate() {
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    window.googleTranslateElementInit = function googleTranslateElementInit() {
      try {
        if (!window.google?.translate?.TranslateElement) return;
        const T = window.google.translate.TranslateElement;
        new T(
          {
            pageLanguage: "en",
            // Avoid invalid codes here — a bad `includedLanguages` value can prevent the widget from initializing.
            includedLanguages: "en,fr,ha,ig,yo",
            layout: T.InlineLayout?.SIMPLE ?? 0,
            autoDisplay: false
          },
          "google_translate_element"
        );
      } catch (e) {
        console.error("Google Translate failed to initialize:", e);
      }
    };

    const scriptId = "google-translate-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      document.body.appendChild(script);
    } else if (window.google?.translate) {
      window.googleTranslateElementInit?.();
    }
  }, []);

  return (
    <div
      className="pebec-translate-shell pointer-events-auto fixed bottom-4 right-4 z-[200] flex max-w-[min(100vw-2rem,24rem)] flex-nowrap items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-2.5 text-sm text-foreground shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-card/80"
      aria-label="Translate this page"
    >
      <Globe className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <div
        id="google_translate_element"
        className="relative z-[1] min-h-[36px] min-w-0 flex-1 overflow-visible [&_.goog-te-gadget]:!m-0"
      />
    </div>
  );
}
