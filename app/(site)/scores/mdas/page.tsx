"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RankingDashboard } from "@/components/scores/RankingDashboard";
import {
  SCORE_YEAR,
  getMdaAbbreviation,
  scoreSlug,
  type RankingRow,
  type BfaFrameworkMetric,
} from "@/lib/scoreTracker";

interface MdaScoreData {
  mdaName: string;
  finalScore: number;
  maxPossibleScore: number;
  applicableMetricCount?: number;
  rank: number;
}

export default function MdaScoresPage() {
  const mdaData = useQuery(api.public_scores.getPublicMdaScores, { year: SCORE_YEAR });
  const frameworkMetrics = (mdaData?.frameworkMetrics || []) as BfaFrameworkMetric[];

  const rows = useMemo<RankingRow[] | undefined>(() => {
    if (!mdaData) return undefined;
    return (mdaData.mdas as MdaScoreData[]).map((mda) => ({
      id: mda.mdaName,
      rank: mda.rank,
      name: mda.mdaName,
      abbreviation: getMdaAbbreviation(mda.mdaName),
      score: mda.finalScore,
      maxScore: mda.maxPossibleScore,
      extra: mda.applicableMetricCount ?? frameworkMetrics.length,
      href: `/scores/mdas/${scoreSlug(mda.mdaName)}`,
    }));
  }, [mdaData, frameworkMetrics.length]);

  return (
    <RankingDashboard
      title="MDA Performance"
      subtitle="Federal MDA rankings for service delivery and efficiency — 2026"
      searchPlaceholder="Search MDA..."
      extraColumnHeader="Metrics"
      extraCardLabel="metrics"
      entityLabel="MDA"
      metricCount={frameworkMetrics.length}
      metricLabel="Metrics"
      rows={rows}
      emptyMessage="No MDA scoring data is available for 2026 yet."
    />
  );
}
