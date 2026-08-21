import { mdasList } from "@/components/mdaList";
import { canonicalizeMdaName } from "@/lib/mdaNameAliases";
import { createSlugFromName } from "@/lib/utils";

export const SCORE_YEAR = 2026;
export const PEBEC_GREEN = "#006B3F";

export type StatusLabel =
  | "Requires Intervention"
  | "Progressing With Difficulty"
  | "In Progress"
  | "Progressing Well"
  | "Successful";

export type StatusColor = "red" | "orange" | "yellow" | "blue" | "green";

export interface ScoreStatus {
  label: StatusLabel;
  color: StatusColor;
}

export interface RankingRow {
  id: string;
  rank: number;
  name: string;
  abbreviation?: string;
  score: number;
  maxScore: number;
  extra: string | number;
  href: string;
}

/** Status bands aligned with the BEEPA tracker. */
export function getScoreStatus(score: number, maxScore: number): ScoreStatus {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  if (pct >= 100) return { label: "Successful", color: "green" };
  if (pct >= 80) return { label: "Progressing Well", color: "blue" };
  if (pct >= 60) return { label: "In Progress", color: "yellow" };
  if (pct >= 50) return { label: "Progressing With Difficulty", color: "orange" };
  return { label: "Requires Intervention", color: "red" };
}

export function getNormalizedScore(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.min(Math.max(score / maxScore, 0), 1);
}

export function formatPoints(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

export function formatScorePair(score: number, maxScore: number): string {
  return `${formatPoints(score)} / ${formatPoints(maxScore)}`;
}

export function getStatusColorClasses(color: StatusColor): {
  bg: string;
  text: string;
  border: string;
  badge: string;
  progress: string;
} {
  const colorMap = {
    red: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      badge: "bg-red-100 text-red-800",
      progress: "bg-red-500",
    },
    orange: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
      badge: "bg-orange-100 text-orange-800",
      progress: "bg-orange-500",
    },
    yellow: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      border: "border-yellow-200",
      badge: "bg-yellow-100 text-yellow-800",
      progress: "bg-yellow-500",
    },
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      badge: "bg-blue-100 text-blue-800",
      progress: "bg-blue-500",
    },
    green: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      badge: "bg-green-100 text-green-800",
      progress: "bg-green-500",
    },
  };
  return colorMap[color];
}

export function getMdaAbbreviation(name: string): string | undefined {
  const canonical = canonicalizeMdaName(name);
  const match = mdasList.find(
    (mda) =>
      mda.name === canonical ||
      mda.name === name ||
      mda.name.toLowerCase() === canonical.toLowerCase()
  );
  return match?.abbreviation;
}

export function scoreSlug(name: string): string {
  return createSlugFromName(name);
}
