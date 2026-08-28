"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MetricBreakdown, ScoreAdjustments, SummaryHeader } from "@/components/scores/SummaryPage";
import { MonthlyReportsPanel } from "@/components/scores/MonthlyReportsPanel";
import { Skeleton } from "@/components/scores/primitives";
import {
  SCORE_YEAR,
  getMdaAbbreviation,
  getScoreStatus,
  scoreSlug,
  type BfaFrameworkMetric,
} from "@/lib/scoreTracker";
import { canonicalizeMdaName } from "@/lib/mdaNameAliases";

interface AdjustmentItem {
  id: string;
  name: string;
  value: number;
}

interface MdaScoreData {
  mdaName: string;
  finalScore: number;
  maxPossibleScore: number;
  metricScores?: Record<string, { score: number; max: number }>;
  excludedMetrics?: string[];
  penaltyScore?: number;
  bonusScore?: number;
  penaltyValues?: Record<string, boolean>;
  bonusValues?: Record<string, boolean>;
  rank: number;
}

export default function MdaSummaryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const asOf = useMemo(() => Date.now(), []);
  const mdaData = useQuery(api.public_scores.getPublicMdaScores, { year: SCORE_YEAR });
  const reportData = useQuery(api.public_mda_reports.getPublicMdaReportCompliance, {
    year: SCORE_YEAR,
    asOf,
  });
  const frameworkMetrics = (mdaData?.frameworkMetrics || []) as BfaFrameworkMetric[];

  const selected = useMemo(() => {
    if (!mdaData?.mdas) return undefined;
    return (mdaData.mdas as MdaScoreData[]).find((mda) => scoreSlug(mda.mdaName) === slug) ?? null;
  }, [mdaData, slug]);

  if (selected === undefined || mdaData === undefined) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (selected === null) {
    return (
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">MDA not found</h1>
          <p className="text-gray-600 mb-6">No 2026 scoring record matches this MDA.</p>
          <Link
            href="/scores/mdas"
            className="inline-flex items-center rounded-lg bg-[#006B3F] px-4 py-2 text-sm font-medium text-white hover:bg-[#005432]"
          >
            Back to MDA Rankings
          </Link>
        </div>
      </div>
    );
  }

  const status = getScoreStatus(selected.finalScore, selected.maxPossibleScore);
  const abbreviation = getMdaAbbreviation(selected.mdaName);
  const excluded = selected.excludedMetrics || [];
  const reports = (reportData?.mdas || []).find(
    (mda) => canonicalizeMdaName(mda.mdaName) === canonicalizeMdaName(selected.mdaName)
  );
  const metrics = frameworkMetrics
    .filter((metric) => !excluded.includes(metric.key))
    .map((metric) => {
      const scored = selected.metricScores?.[metric.key];
      return {
        name: metric.label,
        score: scored?.score ?? 0,
        maxScore: scored?.max ?? metric.max,
        details: [
          { label: "Score awarded", score: scored?.score ?? 0 },
          { label: "Maximum possible", score: scored?.max ?? metric.max },
        ],
      };
    });

  return (
    <div>
      <SummaryHeader
        backHref="/scores/mdas"
        backLabel="Back to MDA Rankings"
        abbreviation={abbreviation}
        title={selected.mdaName}
        description={`Rank #${selected.rank} of ${mdaData?.totalMdas || 0} MDAs`}
        status={status}
        score={selected.finalScore}
        maxScore={selected.maxPossibleScore}
        scoreLabel="Overall BFA Score"
      />
      <MetricBreakdown
        title="BFA Metrics"
        hint="Efficiency bundle and Others from the 2026 BFA configuration"
        metrics={metrics}
      />
      {reports && (
        <MonthlyReportsPanel
          submitted={reports.submitted}
          due={reports.due}
          outstanding={reports.outstanding}
          months={reports.months}
          lastClosedAt={reportData?.lastClosedAt ?? null}
        />
      )}
      <ScoreAdjustments
        bonuses={((mdaData.adjustments?.bonuses || []) as AdjustmentItem[]).map((item) => ({
          name: item.name,
          applied: selected.bonusValues?.[item.id] === true,
          value: item.value,
        }))}
        penalties={((mdaData.adjustments?.penalties || []) as AdjustmentItem[]).map((item) => ({
          name: item.name,
          applied: selected.penaltyValues?.[item.id] === true,
          value: item.value,
        }))}
        bonusTotal={selected.bonusScore ?? 0}
        penaltyTotal={selected.penaltyScore ?? 0}
      />
    </div>
  );
}
