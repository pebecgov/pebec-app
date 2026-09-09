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
  SHOW_PUBLIC_MDA_REPORT_COMPLIANCE,
  getMdaAbbreviation,
  getScoreStatus,
  scoreSlug,
  type BfaFrameworkMetric,
} from "@/lib/scoreTracker";
import { canonicalizeMdaName } from "@/lib/mdaNameAliases";
import { matchBeepaTrackerRosterEntry } from "@/lib/beepaTrackerRoster";

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
  othersBreakdown?: Array<{
    itemId: string;
    itemName: string;
    score: number;
    max: number;
  }>;
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
  const frameworkMetrics = (mdaData?.frameworkMetrics || []) as BfaFrameworkMetric[];

  const selected = useMemo(() => {
    if (!mdaData?.mdas) return undefined;
    return (mdaData.mdas as MdaScoreData[]).find((mda) => scoreSlug(mda.mdaName) === slug) ?? null;
  }, [mdaData, slug]);

  const reportData = useQuery(
    api.public_mda_reports.getPublicMdaReportCompliance,
    SHOW_PUBLIC_MDA_REPORT_COMPLIANCE && selected?.mdaName
      ? { year: SCORE_YEAR, asOf, mdaName: selected.mdaName }
      : "skip"
  );

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
  const rosterEntry = matchBeepaTrackerRosterEntry(selected.mdaName, abbreviation);
  const beepaExempted =
    rosterEntry?.beepaExempted === true ||
    excluded.some((key) => key === "others" || key.startsWith("others:"));
  const reports =
    (reportData?.mdas || []).find(
      (mda) => canonicalizeMdaName(mda.mdaName) === canonicalizeMdaName(selected.mdaName)
    ) ?? reportData?.mdas?.[0];
  const efficiencyKeys = new Set([
    "sla",
    "mystery",
    "reportGov",
    "reportSubmission",
    "timeliness",
  ]);
  const metrics = frameworkMetrics
    .filter((metric) => {
      const isOthersExempted =
        metric.key.startsWith("others:") &&
        (excluded.includes(metric.key) || excluded.includes("others") || beepaExempted);
      // Keep exempted Others items (e.g. BEEPA) visible; hide other excluded metrics.
      if (isOthersExempted) return true;
      if (excluded.includes(metric.key)) return false;
      return true;
    })
    .map((metric) => {
      const isBeepaMetric =
        metric.key.startsWith("others:") && /beepa/i.test(metric.label);
      const exempted =
        (metric.key.startsWith("others:") &&
          (excluded.includes(metric.key) || excluded.includes("others"))) ||
        (isBeepaMetric && beepaExempted);
      const scored = selected.metricScores?.[metric.key];
      return {
        name: metric.label,
        score: exempted ? 0 : (scored?.score ?? 0),
        maxScore: scored?.max ?? metric.max,
        badge: efficiencyKeys.has(metric.key) ? "Efficiency" : undefined,
        exempted,
        details: exempted
          ? [
              {
                label: "Status",
                score: 0,
              },
            ]
          : [
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
      {beepaExempted && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
            <p className="text-sm font-semibold">Exempted from BEEPA</p>
            <p className="text-sm mt-1 text-amber-900/90">
              This agency has a programme exemption from BEEPA. BEEPA is not included in its overall
              BFA score — the total is recalculated on the remaining metrics only.
            </p>
          </div>
        </div>
      )}
      <MetricBreakdown title="BFA Metrics" metrics={metrics} />
      {SHOW_PUBLIC_MDA_REPORT_COMPLIANCE && reports && (
        <MonthlyReportsPanel
          mdaName={abbreviation ? `${abbreviation} - ${selected.mdaName}` : selected.mdaName}
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
