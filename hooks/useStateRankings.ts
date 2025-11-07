import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export interface StateRanking {
  state: string;
  totalScore: number;
  percentageScore: number;
  rank: number;
}

export function useStateRankings() {
  const rankings = useQuery(api.state_scores.getStateRankings);
  
  return {
    rankings: rankings || [],
    isLoading: rankings === undefined,
    isEmpty: rankings !== undefined && rankings.length === 0,
  };
}
