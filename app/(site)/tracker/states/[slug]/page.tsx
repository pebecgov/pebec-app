"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MetricBreakdown, SummaryHeader } from "@/components/scores/SummaryPage";
import { Skeleton } from "@/components/scores/primitives";
import { SCORE_YEAR, scoreSlug } from "@/lib/scoreTracker";
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

/** Automation is one scored dropdown, but the tracker should list the three tiers. */
const LAND_AUTOMATION_TIERS = [
  {
    key: "full_automation",
    label: "Full automation end-to-end (7%)",
    maxScore: 7,
  },
  {
    key: "semi_automation",
    label: "Semi-automation (5%)",
    maxScore: 5,
  },
  {
    key: "document_downloads",
    label: "Document downloads / uploads (2%)",
    maxScore: 2,
  },
] as const;

function hasSub(
  subs: Record<string, number> | undefined,
  key: string
): boolean {
  return !!subs && Object.prototype.hasOwnProperty.call(subs, key);
}

function buildLandRegistrationDetails(subs?: Record<string, number>) {
  const hasGis = hasSub(subs, "gis");
  const hasCombined = hasSub(subs, "automated");
  const hasLegacyTier = LAND_AUTOMATION_TIERS.some((tier) => hasSub(subs, tier.key));
  const automationScored = hasCombined || hasLegacyTier;
  const automationPoints = Math.max(
    Number(subs?.automated) || 0,
    ...LAND_AUTOMATION_TIERS.map((tier) => Number(subs?.[tier.key]) || 0)
  );

  return [
    {
      label: "Availability of GIS (3%)",
      score: hasGis ? (subs?.gis ?? 0) : 0,
      scored: hasGis,
      maxScore: 3,
    },
    ...LAND_AUTOMATION_TIERS.map((tier) => ({
      label: tier.label,
      score:
        automationScored && automationPoints === tier.maxScore ? tier.maxScore : 0,
      scored: automationScored,
      maxScore: tier.maxScore,
    })),
  ];
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
            Back to States
          </Link>
        </div>
      </div>
    );
  }

  const yearIndicatorMaxScores = getIndicatorMaxScoresForYear(SCORE_YEAR);
  const metrics = Object.entries(getIndicatorsForYear(SCORE_YEAR)).map(([key, config]) => {
    const data = selected.indicators?.[key];

    if (key === "digitalizing_land_registration") {
      const details = buildLandRegistrationDetails(data?.subIndicators);
      const hasGis = details[0]?.scored === true;
      const automationScored = details.slice(1).some((detail) => detail.scored);
      const isIndicatorFullyScored = hasGis && automationScored;
      return {
        name: config.name,
        score: hasGis || automationScored ? (data?.score ?? 0) : 0,
        maxScore: yearIndicatorMaxScores[key] ?? 0,
        scored: isIndicatorFullyScored,
        justification:
          "Automation tiers are alternatives — only the highest applicable tier counts (max 7), plus GIS (3).",
        details,
      };
    }

    const details = Object.entries(config.subIndicators).map(([subKey, subConfig]) => {
      const hasSubScore =
        !!data?.subIndicators && Object.prototype.hasOwnProperty.call(data.subIndicators, subKey);
      return {
        label: subConfig.label,
        score: hasSubScore ? (data!.subIndicators[subKey] ?? 0) : 0,
        scored: hasSubScore,
        maxScore: subConfig.options
          ? Math.max(...subConfig.options.map((o) => o.score))
          : undefined,
      };
    });
    const scoredSubCount = details.filter((detail) => detail.scored).length;
    const isIndicatorFullyScored = details.length > 0 && scoredSubCount === details.length;

    return {
      name: config.name,
      score: scoredSubCount > 0 ? (data?.score ?? 0) : 0,
      maxScore: yearIndicatorMaxScores[key] ?? 0,
      scored: isIndicatorFullyScored,
      details,
    };
  });

  return (
    <div>
      <SummaryHeader
        backHref="/tracker/states"
        backLabel="Back to States"
        title={selected.state}
        score={selected.totalScore}
        maxScore={selected.maxScore}
        scoreLabel="Overall Business Climate Score"
        scoreNote="Bonus points are included in this total"
        hideScore
        hideStatus
      />
      <MetricBreakdown
        title="Business Climate Indicators"
        hint="Click an indicator to view its sub-indicators"
        metrics={metrics}
        hideStatus
        showMetricMaxOnly
      />
    </div>
  );
}
