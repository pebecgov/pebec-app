"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MetricBreakdown, SummaryHeader } from "@/components/scores/SummaryPage";
import { Skeleton } from "@/components/scores/primitives";
import {
  SCORE_YEAR,
  getMdaAbbreviation,
  getScoreStatus,
  scoreSlug,
  type BfaFrameworkMetric,
} from "@/lib/scoreTracker";

interface MdaScoreData {
  mdaName: string;
  finalScore: number;
  maxPossibleScore: number;
  metricScores?: Record<string, { score: number; max: number }>;
  excludedMetrics?: string[];
  rank: number;
}

export default function MdaSummaryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const mdaData = useQuery(api.public_scores.getPublicMdaScores, { year: SCORE_YEAR });
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
        hint="Metrics follow the 2026 BFA configuration used in admin scoring"
        metrics={metrics}
      />
    </div>
  );
}
