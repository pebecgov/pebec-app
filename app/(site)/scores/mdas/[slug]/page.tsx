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

export default function MdaSummaryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const mdaData = useQuery(api.public_scores.getPublicMdaScores, { year: SCORE_YEAR });

  const selected = useMemo(() => {
    if (!mdaData?.mdas) return undefined;
    return (mdaData.mdas as MdaScoreData[]).find((mda) => scoreSlug(mda.mdaName) === slug) ?? null;
  }, [mdaData, slug]);

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
  const metrics = [
    { name: "SLA Compliance", score: selected.slaScore, maxScore: selected.slaMax },
    { name: "Mystery Shopping", score: selected.mysteryShoppingScore, maxScore: selected.mysteryShoppingMax },
    { name: "Report Gov Resolution", score: selected.reportGovScore, maxScore: selected.reportGovMax },
    { name: "Timeliness in Submission", score: selected.timelinessScore, maxScore: selected.timelinessMax },
    { name: "Monthly Report Submission", score: selected.monthlyReportScore, maxScore: selected.monthlyReportMax },
    { name: "Transparency", score: selected.transparencyScore, maxScore: selected.transparencyMax },
    { name: "Stakeholder Engagement", score: selected.stakeholderEngagementScore, maxScore: selected.stakeholderEngagementMax },
    { name: "Innovation", score: selected.innovationScore, maxScore: selected.innovationMax },
  ]
    .filter((metric) => metric.score > 0 || metric.maxScore > 0)
    .map((metric) => ({
      ...metric,
      details: [
        { label: "Score awarded", score: metric.score },
        { label: "Maximum possible", score: metric.maxScore },
      ],
    }));

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
        hint="Click a metric to view awarded vs maximum points"
        metrics={metrics}
      />
    </div>
  );
}
