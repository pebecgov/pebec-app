export type SaberMaterialType = "general" | "final_results" | "prior_results";

export const SABER_MATERIAL_TYPE_LABELS: Record<SaberMaterialType, string> = {
  general: "General SABER material",
  final_results: "Final Results (APA report)",
  prior_results: "Prior Results",
};

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
  "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "Federal Capital Territory", "Gombe", "Imo", "Jigawa",
  "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];
