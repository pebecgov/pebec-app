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
} from "@/lib/scoreTracker";

interface MdaScoreData {
  mdaName: string;
  finalScore: number;
  maxPossibleScore: number;
  slaScore: number;
  slaMax: number;
  mysteryShoppingScore: number;
  mysteryShoppingMax: number;
  transparencyScore: number;
  transparencyMax: number;
  stakeholderEngagementScore: number;
  stakeholderEngagementMax: number;
  innovationScore: number;
  innovationMax: number;
  reportGovScore: number;
  reportGovMax: number;
  timelinessScore: number;
  timelinessMax: number;
  monthlyReportScore: number;
  monthlyReportMax: number;
  rank: number;
}

function metricCount(mda: MdaScoreData): number {
  return [
    mda.slaMax,
    mda.mysteryShoppingMax,
    mda.reportGovMax,
    mda.timelinessMax,
    mda.monthlyReportMax,
    mda.transparencyMax,
    mda.stakeholderEngagementMax,
    mda.innovationMax,
  ].filter((max) => max > 0).length;
}

export default function MdaScoresPage() {
  const mdaData = useQuery(api.public_scores.getPublicMdaScores, { year: SCORE_YEAR });

  const rows = useMemo<RankingRow[] | undefined>(() => {
    if (!mdaData?.mdas) return undefined;
    return (mdaData.mdas as MdaScoreData[]).map((mda) => ({
      id: mda.mdaName,
      rank: mda.rank,
      name: mda.mdaName,
      abbreviation: getMdaAbbreviation(mda.mdaName),
      score: mda.finalScore,
      maxScore: mda.maxPossibleScore,
      extra: metricCount(mda),
      href: `/scores/mdas/${scoreSlug(mda.mdaName)}`,
    }));
  }, [mdaData]);

  return (
    <RankingDashboard
      title="MDA Performance"
      subtitle="Federal MDA rankings for service delivery and efficiency — 2026"
      searchPlaceholder="Search MDA..."
      extraColumnHeader="Metrics"
      extraCardLabel="metrics"
      entityLabel="MDA"
      metricCount={8}
      metricLabel="Metrics"
      rows={rows}
      emptyMessage="No MDA scoring data is available for 2026 yet."
    />
  );
}
