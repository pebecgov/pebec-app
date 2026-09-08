import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  getIndicatorMaxScoresForYear,
  getOverallMaxScoreForYear,
} from "@/convex/config/indicators";
import { getStateDeduction, normalizeStateName } from "@/convex/stateUtils";

export interface StateRanking {
  state: string;
  totalScore: number;
  percentageScore: number;
  rank: number;
  maxScore: number;
  deduction?: number;
}

function applyDeductions(
  items: Array<{ state: string; totalScore: number; percentageScore: number; maxScore: number }>
): StateRanking[] {
  return items
    .map((item) => {
      const normalizedState = normalizeStateName(item.state);
      const deduction = getStateDeduction(normalizedState);
      const adjustedScore = Math.max(item.totalScore - deduction, 0);
      const adjustedPercentage =
        item.maxScore > 0 ? (adjustedScore / item.maxScore) * 100 : 0;

      return {
        state: normalizedState,
        totalScore: adjustedScore,
        percentageScore: adjustedPercentage,
        maxScore: item.maxScore,
        deduction,
      };
    })
    .sort((a, b) => b.percentageScore - a.percentageScore)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
}

export function useStateRankings(indicator?: string, year?: number) {
  const currentYear = year || new Date().getFullYear();
  const baseRankings = useQuery(api.state_scores.getStateRankings, { year: currentYear });
  const stateScores = useQuery(api.saveStateScore.getStateScores, { year: currentYear });

  const data = useMemo(() => {
    if (indicator) {
      if (!stateScores) return undefined;

      const filtered = stateScores.filter((score) => score.indicator === indicator);
      if (filtered.length === 0) {
        return [];
      }

      const stateTotals = new Map<string, number>();
      filtered.forEach((score) => {
        const normalizedState = normalizeStateName(score.state);
        const currentTotal = stateTotals.get(normalizedState) || 0;
        stateTotals.set(normalizedState, currentTotal + (score.score || 0));
      });

      const maxScore = getIndicatorMaxScoresForYear(currentYear)[indicator] ?? 0;
      const baseItems = Array.from(stateTotals.entries()).map(([state, totalScore]) => {
        const percentageScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
        return {
          state,
          totalScore,
          percentageScore,
          maxScore,
        };
      });

      return applyDeductions(baseItems);
    }

    if (!baseRankings) return undefined;

    const overallMaxScore = getOverallMaxScoreForYear(currentYear);
    const normalizedBase = baseRankings.map((ranking) => {
      const state = normalizeStateName(ranking.state);
      const totalScore = ranking.totalScore ?? 0;
      const percentageScore =
        ranking.percentageScore ??
        (overallMaxScore > 0 ? (totalScore / overallMaxScore) * 100 : 0);

      return {
        state,
        totalScore,
        percentageScore,
        maxScore: ranking.maxScore ?? overallMaxScore,
      };
    });

    return applyDeductions(normalizedBase);
  }, [indicator, baseRankings, stateScores, currentYear]);

  return {
    rankings: data || [],
    isLoading:
      data === undefined &&
      ((indicator && stateScores === undefined) || (!indicator && baseRankings === undefined)),
    isEmpty: data !== undefined && data.length === 0,
  };
}
