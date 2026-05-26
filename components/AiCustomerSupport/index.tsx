// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { Bot } from "lucide-react";
import ChatModal from "./ChatModal";

export default function AiCustomerSupport() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        aria-label="Open AI customer support chat"
        className="fixed z-[300] bottom-48 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-green-700 text-white shadow-lg transition-transform duration-200 hover:scale-105 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 lg:bottom-8 lg:right-8"
      >
        <Bot className="h-6 w-6" strokeWidth={2} aria-hidden />
      </button>

      <ChatModal open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
