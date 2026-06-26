const STATE_LIST = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
  "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna",
  "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
  "Federal Capital Territory",
];

export type SaberMaterialType = "general" | "final_results" | "prior_results";

export const SABER_MATERIAL_TYPES: SaberMaterialType[] = [
  "general",
  "final_results",
  "prior_results",
];

export function parseStateFromMaterialTitle(title: string): string | undefined {
  const normalized = title.trim();
  if (!normalized) return undefined;

  if (/\bFCT\b/i.test(normalized) || /Abuja/i.test(normalized)) {
    return "Federal Capital Territory";
  }

  const sortedStates = [...STATE_LIST].sort((a, b) => b.length - a.length);
  for (const state of sortedStates) {
    const statePattern = new RegExp(`\\b${state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (statePattern.test(normalized)) {
      return state;
    }
  }

  return undefined;
}

export function inferMaterialTypeFromTitle(title: string): SaberMaterialType | undefined {
  const lower = title.toLowerCase();

  if (lower.includes("prior result")) {
    return "prior_results";
  }

  if (
    (lower.includes("final") && lower.includes("apa")) ||
    lower.includes("final saber apa") ||
    lower.includes("final assessment report")
  ) {
    return "final_results";
  }

  return undefined;
}

export { STATE_LIST as NIGERIAN_STATES_FOR_MATERIALS };
