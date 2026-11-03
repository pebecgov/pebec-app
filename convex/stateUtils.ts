export const FCT_STATE_NAME = "Federal Capital Territory";

export const STATE_LIST: string[] = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
  "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna",
  "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
  FCT_STATE_NAME,
];

/** Subnational ranking uses the 36 states only — FCT/Abuja is excluded. */
export const RANKING_STATE_LIST: string[] = STATE_LIST.filter(
  (state) => state !== FCT_STATE_NAME
);

const STATE_ALIASES: Record<string, string> = {
  "FCT": FCT_STATE_NAME,
  "FCT/ABUJA": FCT_STATE_NAME,
  "ABUJA": FCT_STATE_NAME,
  "FEDERAL CAPITAL TERRITORY": FCT_STATE_NAME,
};

/** No per-state point deductions for the current cycle (was Ogun −6). */
export const STATE_DEDUCTIONS: Record<string, number> = {};

export const VALID_NIGERIAN_STATES = new Set(STATE_LIST);
export const RANKING_STATE_SET = new Set(RANKING_STATE_LIST);

export function isIncludedInSubnationalRanking(state: string): boolean {
  return RANKING_STATE_SET.has(normalizeStateName(state));
}

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

/** Always 0 for this cycle — rankings/PDF use raw indicator totals only. */
export function getStateDeduction(_state: string): number {
  return 0;
}

