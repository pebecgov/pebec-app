import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  getIndicatorMaxScoresForYear,
  getOverallMaxScoreForYear,
  sumStateScoreRows,
} from "@/convex/config/indicators";
import { normalizeStateName } from "@/convex/stateUtils";

export interface StateRanking {
  state: string;
  totalScore: number;
  percentageScore: number;
  rank: number;
  maxScore: number;
}

function rankStates(
  items: Array<{ state: string; totalScore: number; percentageScore: number; maxScore: number }>
): StateRanking[] {
  return items
    .map((item) => ({
      state: normalizeStateName(item.state),
      totalScore: item.totalScore,
      percentageScore: item.percentageScore,
      maxScore: item.maxScore,
    }))
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

      const scoresByState = new Map<string, typeof filtered>();
      filtered.forEach((score) => {
        const normalizedState = normalizeStateName(score.state);
        const bucket = scoresByState.get(normalizedState) ?? [];
        bucket.push(score);
        scoresByState.set(normalizedState, bucket);
      });
      const stateTotals = new Map<string, number>();
      for (const [state, rows] of scoresByState) {
        stateTotals.set(state, sumStateScoreRows(rows, currentYear));
      }

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

      return rankStates(baseItems);
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

    return rankStates(normalizedBase);
  }, [indicator, baseRankings, stateScores, currentYear]);

  return {
    rankings: data || [],
    isLoading:
      data === undefined &&
      ((indicator && stateScores === undefined) || (!indicator && baseRankings === undefined)),
    isEmpty: data !== undefined && data.length === 0,
  };
}
