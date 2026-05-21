// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

export type DocumentChatQuickPrompt = {
  id: string;
  label: string;
  question: string;
  description: string;
};

/** Mirror of rag_api.py QUICK_CHAT_PROMPTS — fallback if GET /chat/quick-prompts is unavailable. */
export const DOCUMENT_CHAT_QUICK_PROMPTS: DocumentChatQuickPrompt[] = [
  {
    id: "reportgov-submit",
    label: "Submit a complaint",
    question: "How do I submit a complaint on ReportGov.ng?",
    description: "Step-by-step submission from the official complain-steps guide.",
  },
  {
    id: "reportgov-track",
    label: "Track a complaint",
    question: "How do I track my complaint on ReportGov.ng?",
    description: "Follow your ticket after you have filed on the portal.",
  },
  {
    id: "reportgov-who-can-submit",
    label: "Who can complain?",
    question: "Who can submit a complaint on ReportGov.ng?",
    description: "Whether citizens and businesses may use the portal.",
  },
  {
    id: "reportgov-which-mda",
    label: "Which MDAs?",
    question: "Which MDAs can I file a complaint against on ReportGov.ng?",
    description: "Choosing the ministry or agency when you submit.",
  },
  {
    id: "pebec-council",
    label: "PEBEC Council members",
    question: "Who are the PEBEC Council members?",
    description: "Named roster from the PEBEC Knowledge Base.",
  },
];
