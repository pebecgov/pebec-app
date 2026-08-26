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
import { canonicalizeMdaName } from "@/lib/mdaNameAliases";

interface MdaScoreData {
  mdaName: string;
  finalScore: number;
  maxPossibleScore: number;
  applicableMetricCount?: number;
  rank: number;
}

export default function MdaScoresPage() {
  const asOf = useMemo(() => Date.now(), []);
  const mdaData = useQuery(api.public_scores.getPublicMdaScores, { year: SCORE_YEAR });
  const reportData = useQuery(api.public_mda_reports.getPublicMdaReportCompliance, {
    year: SCORE_YEAR,
    asOf,
  });
  const frameworkMetrics = (mdaData?.frameworkMetrics || []) as BfaFrameworkMetric[];

  const reportByMda = useMemo(() => {
    const map = new Map<string, { submitted: number; due: number }>();
    for (const mda of reportData?.mdas || []) {
      map.set(canonicalizeMdaName(mda.mdaName), {
        submitted: mda.submitted,
        due: mda.due,
      });
    }
    return map;
  }, [reportData]);

  const rows = useMemo<RankingRow[] | undefined>(() => {
    if (!mdaData) return undefined;
    return (mdaData.mdas as MdaScoreData[]).map((mda) => {
      const reports = reportByMda.get(canonicalizeMdaName(mda.mdaName));
      return {
        id: mda.mdaName,
        rank: mda.rank,
        name: mda.mdaName,
        abbreviation: getMdaAbbreviation(mda.mdaName),
        score: mda.finalScore,
        maxScore: mda.maxPossibleScore,
        extra: reports ? `${reports.submitted}/${reports.due}` : "—",
        href: `/scores/mdas/${scoreSlug(mda.mdaName)}`,
      };
    });
  }, [mdaData, reportByMda]);

  return (
    <RankingDashboard
      title="MDA Performance"
      subtitle="Federal MDA rankings for service delivery and efficiency — 2026. Monthly reports close on the 30th."
      searchPlaceholder="Search MDA..."
      extraColumnHeader="Reports"
      extraCardLabel="reports submitted"
      entityLabel="MDA"
      metricCount={frameworkMetrics.length}
      metricLabel="Metrics"
      rows={rows}
      emptyMessage="No MDA scoring data is available for 2026 yet."
    />
  );
}
