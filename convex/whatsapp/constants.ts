export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "Federal Capital Territory",
] as const;

const STATE_ALIASES: Record<string, string> = {
  abj: "Federal Capital Territory",
  abuja: "Federal Capital Territory",
  fct: "Federal Capital Territory",
  "federal capital territory": "Federal Capital Territory",
  "akwa ibom": "Akwa Ibom",
  "cross river": "Cross River",
};

export const WELCOME_MESSAGE = [
  "Welcome to ReportGov (WhatsApp test).",
  "",
  "Reply:",
  "1 - File a complaint",
  "2 - Check complaint",
  "HELP - commands",
  "",
  "Use CANCEL anytime to stop a draft.",
].join("\n");

export const PEBEC_HELLO_MESSAGE =
  "Hello! Welcome to PEBEC. How can we help you?";

export const PEBEC_MENU_BODY =
  "Welcome to PEBEC 👋\n\nHow can we help you?";

export const WHATSAPP_DEFAULT_TITLE = "Complaint from WhatsApp";

export const PEBEC_COMPLAINT_PROMPT =
  "Step 5 of 5 — Describe what happened.\n\nType the details in your own words.\nType EXIT to cancel.";

export const PEBEC_EXITED_MESSAGE =
  "Complaint cancelled. Nothing was submitted.\n\nSend Hi for the menu.";

export const PEBEC_STATUS_PROMPT =
  "Send your ticket number (for example REP-130926-001) to check one ticket, or tap Check Complaint to see your recent tickets.";

export const PEBEC_HELP_SHORT_MESSAGE =
  "Tap Submit Complaint to file an issue with a Ports & Customs MDA.\nTap Check Complaint to track a ticket.\nType EXIT during filing to cancel.";

export const PEBEC_ZONE_LIST_BODY =
  "Step 1 of 5 — Where did this happen?\n\nTap Select region. Choose Exit to cancel.";

export const PEBEC_MDA_LIST_BODY =
  "Step 3 of 5 — Which Ports & Customs MDA should handle this?\n\nTap Select MDA and choose one agency.\nType EXIT to cancel.";

export const PEBEC_DATE_PROMPT =
  "Step 4 of 5 — When did this happen?\n\nType the date as DD/MM/YYYY.\nType EXIT to cancel.";

export const PEBEC_DATE_INVALID =
  "I could not read that date. Use a past date as DD/MM/YYYY.";

export const HELP_MESSAGE = [
  "ReportGov commands:",
  "NEW or 1 — start a complaint",
  "STATUS or 2 — list your tickets",
  "STATUS REP-DDMMYY-000 — one ticket",
  "CANCEL — stop the current draft",
  "MENU — show this welcome again",
].join("\n");

export function normalizePhone(from: string): string {
  return from.replace(/^whatsapp:/i, "").trim();
}

export function toNigeriaLocalPhone(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length >= 13) {
    return `0${digits.slice(3)}`;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return digits;
  }
  return digits;
}

export function guestEmailForPhone(e164: string): string {
  return `whatsapp.${e164.replace(/\D/g, "")}@guest.reportgov.ng`;
}

export function extractTicketNumber(text: string): string | null {
  const match = text.toUpperCase().match(/REP-\d{6}-\d{3}/);
  return match ? match[0] : null;
}

export function matchState(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  const aliased = STATE_ALIASES[trimmed];
  if (aliased) return aliased;
  const exact = NIGERIAN_STATES.find((state) => state.toLowerCase() === trimmed);
  if (exact) return exact;
  const partial = NIGERIAN_STATES.filter((state) =>
    state.toLowerCase().includes(trimmed),
  );
  return partial.length === 1 ? partial[0] : null;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
