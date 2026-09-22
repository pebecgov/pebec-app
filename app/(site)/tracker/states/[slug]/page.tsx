"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MetricBreakdown, SummaryHeader } from "@/components/scores/SummaryPage";
import { Skeleton } from "@/components/scores/primitives";
import { SCORE_YEAR, getScoreStatus, scoreSlug } from "@/lib/scoreTracker";
import {
  getIndicatorMaxScoresForYear,
  getIndicatorsForYear,
} from "@/convex/config/indicators";

interface StateRankingData {
  state: string;
  totalScore: number;
  maxScore: number;
  rank: number;
  indicators?: Record<string, {
    name?: string;
    score: number;
    maxScore: number;
    subIndicators: Record<string, number>;
  }>;
}

export default function StateSummaryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const stateData = useQuery(api.public_scores.getPublicStateRankings, { year: SCORE_YEAR });

  const selected = useMemo(() => {
    if (!stateData?.states) return undefined;
    return (stateData.states as StateRankingData[]).find((state) => scoreSlug(state.state) === slug) ?? null;
  }, [stateData, slug]);

  if (selected === undefined) {
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
          <h1 className="text-xl font-semibold text-gray-900 mb-2">State not found</h1>
          <p className="text-gray-600 mb-6">No 2026 scoring record matches this state.</p>
          <Link
            href="/tracker/states"
            className="inline-flex items-center rounded-lg bg-[#006B3F] px-4 py-2 text-sm font-medium text-white hover:bg-[#005432]"
          >
            Back to State Rankings
          </Link>
        </div>
      </div>
    );
  }

  const yearIndicatorMaxScores = getIndicatorMaxScoresForYear(SCORE_YEAR);
  const metrics = Object.entries(getIndicatorsForYear(SCORE_YEAR)).map(([key, config]) => {
    const data = selected.indicators?.[key];
    const details = Object.entries(config.subIndicators).map(([subKey, subConfig]) => {
      const hasSubScore =
        !!data?.subIndicators && Object.prototype.hasOwnProperty.call(data.subIndicators, subKey);
      return {
        label: subConfig.label,
        score: hasSubScore ? (data!.subIndicators[subKey] ?? 0) : 0,
        scored: hasSubScore,
      };
    });
    const scoredSubCount = details.filter((detail) => detail.scored).length;
    const isIndicatorFullyScored = details.length > 0 && scoredSubCount === details.length;

    return {
      name: config.name,
      score: scoredSubCount > 0 ? (data?.score ?? 0) : 0,
      maxScore: yearIndicatorMaxScores[key] ?? 0,
      // Only mark complete when every sub-indicator is saved.
      scored: isIndicatorFullyScored,
      details,
    };
  });

  const fullyScored = metrics.every((metric) => metric.scored === true);
  const status = fullyScored
    ? getScoreStatus(selected.totalScore, selected.maxScore)
    : null;

  return (
    <div>
      <SummaryHeader
        backHref="/tracker/states"
        backLabel="Back to State Rankings"
        title={selected.state}
        description={`Rank #${selected.rank} of ${stateData?.totalStates || 0} states`}
        status={status}
        score={selected.totalScore}
        maxScore={selected.maxScore}
        scoreLabel="Overall Business Climate Score"
        notScoredYet={!fullyScored}
      />
      <MetricBreakdown
        title="Business Climate Indicators"
        hint="Click an indicator to view its sub-indicators"
        metrics={metrics}
      />
    </div>
  );
}
