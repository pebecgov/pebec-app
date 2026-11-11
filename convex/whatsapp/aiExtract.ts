"use node";

import { action, internalAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { GoogleGenAI } from "@google/genai";
import { buildSystemPrompt, buildUserPrompt, parseModelJson } from "./aiPrompt";
import {
  finalizeValidatedIntent,
  getLagosYmd,
  hashPhone,
  previewText,
  validateExtraction,
  type ValidatedExtraction,
} from "./aiValidate";

/** Interim "Reading…" is already sent; allow enough time for Flash + JSON parse. */
const EXTRACT_TIMEOUT_MS = 15000;

const fieldResultValidator = v.object({
  value: v.union(v.string(), v.null()),
  confidence: v.number(),
  status: v.union(
    v.literal("accepted"),
    v.literal("verify"),
    v.literal("missing"),
  ),
  raw: v.optional(v.union(v.string(), v.null())),
});

const dateFieldValidator = v.object({
  value: v.union(v.number(), v.null()),
  confidence: v.number(),
  status: v.union(
    v.literal("accepted"),
    v.literal("verify"),
    v.literal("missing"),
  ),
  raw: v.optional(v.union(v.string(), v.null())),
});

const validatedValidator = v.object({
  intent: v.string(),
  language: v.union(v.string(), v.null()),
  state: fieldResultValidator,
  assignedMDA: fieldResultValidator,
  incidentDate: dateFieldValidator,
  description: fieldResultValidator,
  title: fieldResultValidator,
  fullName: fieldResultValidator,
  overallConfidence: v.number(),
  needsReview: v.boolean(),
  reviewReasons: v.array(v.string()),
  pendingFields: v.array(v.string()),
  verifyFields: v.array(v.string()),
  outOfScopeAgency: v.union(v.string(), v.null()),
  notes: v.union(v.string(), v.null()),
  incidentDateLabel: v.union(v.string(), v.null()),
});

const extractResultValidator = v.object({
  ok: v.boolean(),
  timedOut: v.boolean(),
  error: v.optional(v.string()),
  validated: v.optional(validatedValidator),
  latencyMs: v.number(),
});

const extractArgs = {
  message: v.string(),
  priorDraftJson: v.optional(v.string()),
  /** Analytics only — hashed, never sent to the model. */
  phoneHash: v.optional(v.string()),
  messageSid: v.optional(v.string()),
  logOffScript: v.optional(v.boolean()),
};

function lagosTodayLabel(nowMs: number): string {
  const { y, m, d } = getLagosYmd(nowMs);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function serializeValidated(validated: ValidatedExtraction) {
  return {
    intent: validated.intent,
    language: validated.language,
    state: {
      value: validated.state.value,
      confidence: validated.state.confidence,
      status: validated.state.status,
      raw: validated.state.raw ?? null,
    },
    assignedMDA: {
      value: validated.assignedMDA.value,
      confidence: validated.assignedMDA.confidence,
      status: validated.assignedMDA.status,
      raw: validated.assignedMDA.raw ?? null,
    },
    incidentDate: {
      value: validated.incidentDate.value,
      confidence: validated.incidentDate.confidence,
      status: validated.incidentDate.status,
      raw: validated.incidentDate.raw ?? null,
    },
    description: {
      value: validated.description.value,
      confidence: validated.description.confidence,
      status: validated.description.status,
      raw: validated.description.raw ?? null,
    },
    title: {
      value: validated.title.value,
      confidence: validated.title.confidence,
      status: validated.title.status,
      raw: validated.title.raw ?? null,
    },
    fullName: {
      value: validated.fullName.value,
      confidence: validated.fullName.confidence,
      status: validated.fullName.status,
      raw: validated.fullName.raw ?? null,
    },
    overallConfidence: validated.overallConfidence,
    needsReview: validated.needsReview,
    reviewReasons: validated.reviewReasons,
    pendingFields: validated.pendingFields,
    verifyFields: validated.verifyFields,
    outOfScopeAgency: validated.outOfScopeAgency,
    notes: validated.notes,
    incidentDateLabel: validated.incidentDateLabel,
  };
}

async function callGeminiExtract(args: {
  message: string;
  priorDraftJson?: string | null;
  nowMs: number;
}): Promise<ValidatedExtraction> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENAI_API_KEY is not configured");
  }
  const genAI = new GoogleGenAI({ apiKey });
  const system = buildSystemPrompt(lagosTodayLabel(args.nowMs));
  // Never include phone numbers in the prompt payload.
  const user = buildUserPrompt({
    message: args.message,
    priorDraftJson: args.priorDraftJson,
  });

  // gemini-flash-lite-latest is currently available and fast; 3.8-flash often
  // returns 503 high-demand. Override with Convex env WHATSAPP_AI_MODEL.
  const modelCandidates = [
    process.env.WHATSAPP_AI_MODEL?.trim(),
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
  ].filter((m): m is string => Boolean(m));

  const contents = [
    {
      role: "user" as const,
      parts: [{ text: `${system}\n\n${user}` }],
    },
  ];
  const config = {
    temperature: 0.1,
    maxOutputTokens: 1024,
    responseMimeType: "application/json" as const,
  };

  let result: Awaited<ReturnType<typeof genAI.models.generateContent>> | null =
    null;
  let lastError: unknown;
  for (const model of modelCandidates) {
    // Up to 2 attempts per model for transient 503s.
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
          await new Promise((r) => setTimeout(r, 700 * attempt));
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
      : new Error(String(lastError ?? "All Gemini model candidates failed"));
  }

  const text =
    result.candidates?.[0]?.content?.parts
      ?.map((p) => ("text" in p ? p.text ?? "" : ""))
      .join("") ?? "";
  if (!text.trim()) {
    throw new Error("Empty AI response");
  }

  const parsed = parseModelJson(text);
  return finalizeValidatedIntent(
    validateExtraction(parsed, args.message, args.nowMs),
  );
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
      resolve({ timedOut: true, error: `AI extract timed out after ${ms}ms` });
    }, ms);
    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ value, timedOut: false });
      })
      .catch((err: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({
          timedOut: false,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  });
}

async function runExtract(
  ctx: ActionCtx,
  args: {
    message: string;
    priorDraftJson?: string;
    phoneHash?: string;
    messageSid?: string;
    logOffScript?: boolean;
  },
) {
  const started = Date.now();
  const nowMs = Date.now();
  const message = args.message.trim();
  if (!message) {
    return {
      ok: false as const,
      timedOut: false,
      error: "empty_message",
      latencyMs: Date.now() - started,
    };
  }

  if (args.logOffScript && args.phoneHash) {
    await ctx.runMutation(internal.whatsapp.aiLog.recordAiLog, {
      phoneHash: args.phoneHash,
      messageSid: args.messageSid,
      kind: "off_script",
      textPreview: previewText(message),
    });
  }

  const raced = await withTimeout(
    callGeminiExtract({
      message,
      priorDraftJson: args.priorDraftJson,
      nowMs,
    }),
    EXTRACT_TIMEOUT_MS,
  );

  const latencyMs = Date.now() - started;

  if (raced.timedOut || raced.error || !raced.value) {
    if (args.phoneHash) {
      await ctx.runMutation(internal.whatsapp.aiLog.recordAiLog, {
        phoneHash: args.phoneHash,
        messageSid: args.messageSid,
        kind: raced.timedOut ? "fallback" : "error",
        textPreview: previewText(message),
        error: raced.error ?? "timeout",
      });
    }
    return {
      ok: false as const,
      timedOut: Boolean(raced.timedOut),
      error: raced.error ?? "extract_failed",
      latencyMs,
    };
  }

  const validated = raced.value;
  if (args.phoneHash) {
    await ctx.runMutation(internal.whatsapp.aiLog.recordAiLog, {
      phoneHash: args.phoneHash,
      messageSid: args.messageSid,
      kind: validated.intent === "out_of_scope" ? "out_of_scope" : "extract",
      intent: validated.intent,
      textPreview: previewText(message),
      overallConfidence: validated.overallConfidence,
      needsReview: validated.needsReview,
      meta: JSON.stringify({
        pendingFields: validated.pendingFields,
        verifyFields: validated.verifyFields,
        latencyMs,
      }),
    });
  }

  return {
    ok: true as const,
    timedOut: false,
    validated: serializeValidated(validated),
    latencyMs,
  };
}

/**
 * Extract complaint fields from free-form text.
 * Does not receive or send phone numbers to the model.
 */
export const extractComplaintFields = action({
  args: extractArgs,
  returns: extractResultValidator,
  handler: async (ctx, args) => runExtract(ctx, args),
});

/** Internal variant for WhatsApp cloud orchestration. */
export const extractComplaintFieldsInternal = internalAction({
  args: extractArgs,
  returns: extractResultValidator,
  handler: async (ctx, args) => runExtract(ctx, args),
});

/** Helper for callers that only have a phone string. */
export function phoneHashFor(phone: string): string {
  return hashPhone(phone);
}
