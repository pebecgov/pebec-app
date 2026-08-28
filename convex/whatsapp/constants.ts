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
  "2 - Check status",
  "HELP - commands",
  "",
  "Use CANCEL anytime to stop a draft.",
].join("\n");

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
