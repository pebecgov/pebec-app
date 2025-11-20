import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { indicators } from "@/convex/config/indicators";
import { getStateDeduction, normalizeStateName } from "@/convex/stateUtils";

export interface StateRanking {
  state: string;
  totalScore: number;
  percentageScore: number;
  rank: number;
  maxScore: number;
  deduction?: number;
}

const indicatorMaxScores = Object.fromEntries(
  Object.entries(indicators).map(([indicatorKey, indicatorConfig]) => {
    const maxScoreForIndicator = Object.values(indicatorConfig.subIndicators).reduce(
      (sum, subIndicator: any) => {
        const options = subIndicator.options as Array<{ score: number }>;
        const maxOptionScore = options.reduce(
          (max, option) => Math.max(max, option.score),
          0
        );
        return sum + maxOptionScore;
      },
      0
    );

    return [indicatorKey, maxScoreForIndicator];
  })
);

const overallMaxScore = Object.values(indicatorMaxScores).reduce(
  (sum, value) => sum + value,
  0
);

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

export function useStateRankings(indicator?: string) {
  const baseRankings = useQuery(api.state_scores.getStateRankings, undefined);
  const stateScores = useQuery(api.saveStateScore.getStateScores, {});

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

      const maxScore = indicatorMaxScores[indicator] ?? 0;
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
  }, [indicator, baseRankings, stateScores]);

  return {
    rankings: data || [],
    isLoading:
      data === undefined &&
      ((indicator && stateScores === undefined) || (!indicator && baseRankings === undefined)),
    isEmpty: data !== undefined && data.length === 0,
  };
}
