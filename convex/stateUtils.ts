const STATE_LIST = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
  "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna",
  "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
  "Federal Capital Territory",
];

const STATE_ALIASES: Record<string, string> = {
  "FCT": "Federal Capital Territory",
  "FEDERAL CAPITAL TERRITORY": "Federal Capital Territory",
};

export const VALID_NIGERIAN_STATES = new Set(STATE_LIST);

export function normalizeStateName(state: string): string {
  if (!state) return state;
  const trimmed = state.trim();
  if (!trimmed) return trimmed;

  const upper = trimmed.toUpperCase();
  if (STATE_ALIASES[upper]) {
    return STATE_ALIASES[upper];
  }

  return trimmed;
}

export function isValidNigerianState(state: string): boolean {
  return VALID_NIGERIAN_STATES.has(state);
}

