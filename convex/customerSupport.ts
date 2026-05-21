// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
import { action } from "./_generated/server";
import { v } from "convex/values";
import {
  DOCUMENT_CHAT_QUICK_PROMPTS,
  type DocumentChatQuickPrompt,
} from "./documentChatQuickPrompts";

const DEFAULT_RAG_API_URL = "https://settling-laboring-monitor.ngrok-free.dev";

const quickPromptValidator = v.object({
  id: v.string(),
  label: v.string(),
  question: v.string(),
  description: v.string(),
});

function getRagApiBaseUrl(): string {
  const url =
    process.env.RAG_API_URL?.trim() ||
    process.env.PEBEC_AI_API_BASE_URL?.trim() ||
    DEFAULT_RAG_API_URL;
  return url.replace(/\/$/, "");
}

function ragFetchHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };
}

function extractReplyText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;

  const candidates = [
    data.answer,
    data.reply,
    data.response,
    data.message,
    data.text,
    data.content,
    typeof data.data === "object" && data.data !== null
      ? (data.data as Record<string, unknown>).answer ??
        (data.data as Record<string, unknown>).reply ??
        (data.data as Record<string, unknown>).response
      : undefined,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeQuickPrompts(payload: unknown): DocumentChatQuickPrompt[] {
  if (!payload || typeof payload !== "object") {
    return DOCUMENT_CHAT_QUICK_PROMPTS;
  }
  const data = payload as Record<string, unknown>;
  const raw = data.prompts;
  if (!Array.isArray(raw) || raw.length === 0) {
    return DOCUMENT_CHAT_QUICK_PROMPTS;
  }
  const prompts: DocumentChatQuickPrompt[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const label = typeof row.label === "string" ? row.label : "";
    const question = typeof row.question === "string" ? row.question : "";
    const description = typeof row.description === "string" ? row.description : "";
    if (id && label && question) {
      prompts.push({ id, label, question, description });
    }
  }
  return prompts.length > 0 ? prompts : DOCUMENT_CHAT_QUICK_PROMPTS;
}

export const getQuickChatPrompts = action({
  args: {},
  handler: async () => {
    const endpoint = `${getRagApiBaseUrl()}/chat/quick-prompts`;
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: ragFetchHeaders(),
        cache: "no-store",
      });

      if (!response.ok) {
        return {
          prompts: DOCUMENT_CHAT_QUICK_PROMPTS,
          requiresShortcuts: true,
        };
      }

      const payload = await response.json();
      const data = payload as Record<string, unknown>;
      return {
        prompts: normalizeQuickPrompts(payload),
        requiresShortcuts:
          typeof data.requiresShortcuts === "boolean"
            ? data.requiresShortcuts
            : true,
      };
    } catch {
      return {
        prompts: DOCUMENT_CHAT_QUICK_PROMPTS,
        requiresShortcuts: true,
      };
    }
  },
});

export const askSupportAssistant = action({
  args: {
    question: v.string(),
    quickPromptId: v.optional(v.string()),
  },
  handler: async (_ctx, { question, quickPromptId }) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      return {
        success: false as const,
        error: "Question is required.",
      };
    }

    const endpoint = `${getRagApiBaseUrl()}/chat`;
    const body: { question: string; quick_prompt_id?: string } = {
      question: trimmedQuestion,
    };
    if (quickPromptId?.trim()) {
      body.quick_prompt_id = quickPromptId.trim();
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: ragFetchHeaders(),
        body: JSON.stringify(body),
      });

      const payload = await response.json();

      if (!response.ok) {
        const errorMessage =
          (typeof payload === "object" &&
          payload !== null &&
          typeof (payload as Record<string, unknown>).error === "string"
            ? String((payload as Record<string, unknown>).error)
            : null) ?? `AI service returned ${response.status}`;

        console.error(`customerSupport.askSupportAssistant failed: ${errorMessage}`);
        return {
          success: false as const,
          error: errorMessage,
        };
      }

      const reply = extractReplyText(payload);
      if (!reply) {
        return {
          success: false as const,
          error: "AI service returned an empty response.",
        };
      }

      return {
        success: true as const,
        reply,
      };
    } catch (error) {
      console.error("customerSupport.askSupportAssistant network error:", error);
      return {
        success: false as const,
        error: "Unable to reach the document chat service.",
      };
    }
  },
});
