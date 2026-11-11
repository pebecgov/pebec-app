"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";
import type { WhatsAppLang } from "./i18n";

const LANG_NAMES: Record<WhatsAppLang, string> = {
  en: "English",
  ha: "Hausa",
  ig: "Igbo",
  yo: "Yoruba",
};

const TRANSLATE_TIMEOUT_MS = 12000;

function modelCandidates(): string[] {
  return [
    process.env.WHATSAPP_AI_MODEL?.trim(),
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
  ].filter((m): m is string => Boolean(m));
}

async function callGeminiTranslate(args: {
  text: string;
  sourceLang: WhatsAppLang;
  targetLang: WhatsAppLang;
}): Promise<string> {
  const trimmed = args.text.trim();
  if (!trimmed) return trimmed;
  if (args.sourceLang === args.targetLang) return trimmed;

  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENAI_API_KEY is not configured");
  }

  const genAI = new GoogleGenAI({ apiKey });
  const sourceName = LANG_NAMES[args.sourceLang];
  const targetName = LANG_NAMES[args.targetLang];
  const prompt = [
    `Translate the text into ${targetName}.`,
    `Expected source language: ${sourceName}. Target language: ${targetName}.`,
    `If the text is already in ${targetName}, return it unchanged.`,
    `Do NOT translate into ${sourceName}. The output must be ${targetName} only.`,
    "Return ONLY the translated text. Do not add quotes, labels, or explanations.",
    "Preserve names, ticket numbers, MDA names, dates, and numbers.",
    "",
    trimmed,
  ].join("\n");

  const contents = [
    {
      role: "user" as const,
      parts: [{ text: prompt }],
    },
  ];
  const config = {
    temperature: 0.1,
    maxOutputTokens: 2048,
  };

  let result: Awaited<ReturnType<typeof genAI.models.generateContent>> | null =
    null;
  let lastError: unknown;
  for (const model of modelCandidates()) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        result = await genAI.models.generateContent({ model, contents, config });
        break;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const retryable =
          /UNAVAILABLE|high demand|429|RESOURCE_EXHAUSTED/i.test(message);
        const tryNextModel =
          /NOT_FOUND|no longer available|not found/i.test(message);
        if (tryNextModel) break;
        if (retryable && attempt < 2) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        if (!retryable) throw error;
        break;
      }
    }
    if (result) break;
  }
  if (!result) {
    throw lastError instanceof Error
      ? lastError
      : new Error(String(lastError ?? "Translation failed"));
  }

  const out =
    result.candidates?.[0]?.content?.parts
      ?.map((p) => ("text" in p ? p.text ?? "" : ""))
      .join("")
      .trim() ?? "";
  if (!out) {
    throw new Error("Empty translation response");
  }
  return out;
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<{ value?: T; timedOut: boolean; error?: string }> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve({ timedOut: true, error: `Translation timed out after ${ms}ms` });
    }, ms);
    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ value, timedOut: false });
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({
          timedOut: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  });
}

/** Translate free text between WhatsApp languages. Falls back to original on failure. */
export async function translateText(args: {
  text: string;
  sourceLang: WhatsAppLang;
  targetLang: WhatsAppLang;
}): Promise<string> {
  const trimmed = args.text.trim();
  if (!trimmed) return trimmed;
  if (args.sourceLang === args.targetLang) return trimmed;

  const result = await withTimeout(
    callGeminiTranslate(args),
    TRANSLATE_TIMEOUT_MS,
  );
  if (result.value) return result.value;
  console.error("whatsapp translate failed", result.error ?? "unknown");
  return trimmed;
}

const langValidator = v.union(
  v.literal("en"),
  v.literal("ha"),
  v.literal("ig"),
  v.literal("yo"),
);

/** After WhatsApp filing: English fields for agents + deferred staff emails. */
export const enrichTicketForStaff = internalAction({
  args: {
    ticketId: v.id("tickets"),
  },
  returns: v.null(),
  handler: async (ctx, { ticketId }) => {
    const ticket = await ctx.runQuery(
      internal.whatsapp.aiTranslateStore.getTicketForTranslate,
      { ticketId },
    );
    if (!ticket) return null;

    const lang = (ticket.citizenLanguage ?? "en") as WhatsAppLang;
    if (lang === "en") {
      await ctx.runMutation(
        internal.whatsapp.aiTranslateStore.patchTicketTranslations,
        {
          ticketId,
          titleEn: ticket.title,
          descriptionEn: ticket.description,
          sendStaffEmail: true,
        },
      );
      return null;
    }

    // AI extraction often normalizes title/description to English even when
    // the citizen filed in another language. Treat draft fields as English for
    // agents, and write a citizen-language copy into title/description.
    const titleEn = ticket.title;
    const descriptionEn = ticket.description;
    const [titleLocal, descriptionLocal] = await Promise.all([
      translateText({
        text: titleEn,
        sourceLang: "en",
        targetLang: lang,
      }),
      translateText({
        text: descriptionEn,
        sourceLang: "en",
        targetLang: lang,
      }),
    ]);

    await ctx.runMutation(
      internal.whatsapp.aiTranslateStore.patchTicketTranslations,
      {
        ticketId,
        title: titleLocal,
        description: descriptionLocal,
        titleEn,
        descriptionEn,
        sendStaffEmail: true,
      },
    );
    return null;
  },
});

/** Translate agent English → citizen language for WhatsApp delivery. */
export const translateToCitizen = internalAction({
  args: {
    text: v.string(),
    citizenLanguage: langValidator,
  },
  returns: v.string(),
  handler: async (_ctx, args) => {
    const lang = args.citizenLanguage as WhatsAppLang;
    if (lang === "en") return args.text.trim();
    return await translateText({
      text: args.text,
      sourceLang: "en",
      targetLang: lang,
    });
  },
});
