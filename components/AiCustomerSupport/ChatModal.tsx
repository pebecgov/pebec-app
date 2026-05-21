// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bot, Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DOCUMENT_CHAT_QUICK_PROMPTS,
  type DocumentChatQuickPrompt,
} from "@/lib/documentChatQuickPrompts";
import { AssistantMarkdown } from "./AssistantMarkdown";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello! I'm the PEBEC AI assistant. Ask me about ease of doing business, reforms, or how to get support. I'm here to help.",
};

type ChatModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function ChatModal({ open, onClose }: ChatModalProps) {
  const askSupportAssistant = useAction(api.customerSupport.askSupportAssistant);
  const getQuickChatPrompts = useAction(api.customerSupport.getQuickChatPrompts);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [quickPrompts, setQuickPrompts] = useState<DocumentChatQuickPrompt[]>(
    DOCUMENT_CHAT_QUICK_PROMPTS
  );
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lastMessage = messages[messages.length - 1];
  const showQuickPrompts =
    !isTyping &&
    (lastMessage?.role === "assistant" ||
      (messages.length === 1 && lastMessage?.id === "welcome"));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getQuickChatPrompts({})
      .then((result) => {
        if (!cancelled && result.prompts?.length) {
          setQuickPrompts(result.prompts);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQuickPrompts(DOCUMENT_CHAT_QUICK_PROMPTS);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, getQuickChatPrompts]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const sendMessage = async (text: string, quickPromptId?: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const result = await askSupportAssistant({
        question: trimmed,
        quickPromptId,
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: result.success
          ? result.reply
          : result.error ??
            "Sorry, I couldn't get a response right now. Please try again or email info@pebec.gov.ng.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content:
            "Something went wrong while contacting support. Please try again or email info@pebec.gov.ng.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close chat"
        className="fixed inset-0 z-[65] bg-black/40 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-none"
        onClick={onClose}
      />

      <div
        className={cn(
          "fixed z-[70] flex flex-col overflow-hidden rounded-2xl border border-stroke bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 dark:border-strokedark dark:bg-black",
          "bottom-36 right-4 h-[min(70vh,520px)] w-[min(calc(100vw-2rem),400px)]",
          "lg:bottom-28 lg:right-8"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-chat-title"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-stroke bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 text-white dark:border-strokedark">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <Bot className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="ai-chat-title" className="truncate text-sm font-semibold">
              PEBEC AI Assistant
            </h2>
            <p className="text-xs text-green-100">Typically replies instantly</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/90 transition hover:bg-white/20 hover:text-white"
            aria-label="Close chat window"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col bg-gray-50/80 dark:bg-gray-950/50">
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {showQuickPrompts && (
              <QuickPromptChips
                prompts={quickPrompts}
                disabled={isTyping}
                onSelect={(prompt) => sendMessage(prompt.question, prompt.id)}
              />
            )}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="shrink-0 border-t border-stroke bg-white p-3 dark:border-strokedark dark:bg-black"
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Type your message..."
                disabled={isTyping}
                className="flex-1 rounded-xl border border-stroke bg-gray-50 px-4 py-2.5 text-sm text-black outline-none transition placeholder:text-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-60 dark:border-strokedark dark:bg-gray-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                {isTyping ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
          <Bot className="h-3.5 w-3.5" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-md bg-green-600 text-white"
            : "rounded-bl-md border border-stroke bg-white text-gray-800 shadow-sm dark:border-strokedark dark:bg-gray-900 dark:text-gray-100"
        )}
      >
        {isUser ? message.content : <AssistantMarkdown content={message.content} />}
      </div>
    </div>
  );
}

function QuickPromptChips({
  prompts,
  disabled,
  onSelect,
}: {
  prompts: DocumentChatQuickPrompt[];
  disabled: boolean;
  onSelect: (prompt: DocumentChatQuickPrompt) => void;
}) {
  return (
    <div className="ml-9 flex flex-col gap-2">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        Quick questions
      </p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            disabled={disabled}
            title={prompt.description}
            onClick={() => onSelect(prompt)}
            className="rounded-full border border-green-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-green-800 shadow-sm transition hover:border-green-500 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-900 dark:bg-gray-900 dark:text-green-100 dark:hover:bg-green-950"
          >
            {prompt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-stroke bg-white px-4 py-3 shadow-sm dark:border-strokedark dark:bg-gray-900">
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
      </div>
    </div>
  );
}
