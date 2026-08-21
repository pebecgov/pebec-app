"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RankingDashboard } from "@/components/scores/RankingDashboard";
import { SCORE_YEAR, scoreSlug, type RankingRow } from "@/lib/scoreTracker";
import { INDICATOR_COUNT } from "@/convex/config/indicators";

interface StateRankingData {
  state: string;
  totalScore: number;
  maxScore: number;
  rank: number;
  indicators?: Record<string, { score: number; maxScore: number; subIndicators: Record<string, number> }>;
}

export default function StateScoresPage() {
  const stateData = useQuery(api.public_scores.getPublicStateRankings, { year: SCORE_YEAR });

  const rows = useMemo<RankingRow[] | undefined>(() => {
    if (!stateData?.states) return undefined;
    return (stateData.states as StateRankingData[]).map((state) => ({
      id: state.state,
      rank: state.rank,
      name: state.state,
      score: state.totalScore,
      maxScore: state.maxScore,
      extra: Object.keys(state.indicators || {}).length,
      href: `/scores/states/${scoreSlug(state.state)}`,
    }));
  }, [stateData]);

  return (
    <RankingDashboard
      title="State Rankings"
      subtitle="Nigerian state business climate rankings — 2026"
      searchPlaceholder="Search state..."
      extraColumnHeader="Indicators"
      extraCardLabel="indicators"
      entityLabel="State"
      metricCount={INDICATOR_COUNT}
      metricLabel="Indicators"
      rows={rows}
      emptyMessage="No state scoring data is available for 2026 yet."
    />
  );
}
