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
import {
  beepaMaxPointsForMda,
  isSuperBeepaMda,
  matchBeepaTrackerRosterEntry,
} from "@/lib/beepaTrackerRoster";
import { beepaScoreBreakdown, type ScoreBreakdownLine } from "@/lib/bfaScoreBreakdowns";

interface AdjustmentItem {
  id: string;
  name: string;
  value: number;
  justification?: string;
}

interface MdaScoreData {
  mdaName: string;
  finalScore: number;
  maxPossibleScore: number;
  metricScores?: Record<
    string,
    {
      score: number;
      max: number;
      scored?: boolean;
      complete?: boolean;
      monthsWithData?: number;
      totalMonths?: number;
      percentage?: number;
    }
  >;
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
  slaMonthIssues?: Array<{
    monthKey: string;
    monthLabel: string;
    kind: "failed" | "missing" | "partial";
    message: string;
  }>;
  scoreBreakdowns?: Record<
    string,
    Array<{
      label: string;
      value?: string;
      points?: number;
      maxPoints?: number;
      explanation: string;
    }>
  >;
  efficiencyMonthStatuses?: Record<
    string,
    Array<{
      monthKey: string;
      monthLabel: string;
      status: "on_time" | "late" | "missing";
      submitted: boolean;
      onTime: boolean;
    }>
  >;
  slaMonthStatuses?: Array<{
    monthKey: string;
    monthLabel: string;
    status: "scored" | "failed" | "partial" | "missing";
    points: number;
    maxPoints: number;
    percentage: number | null;
    message: string;
  }>;
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
            href="/tracker/mdas"
            className="inline-flex items-center rounded-lg bg-[#006B3F] px-4 py-2 text-sm font-medium text-white hover:bg-[#005432]"
          >
            Back to MDA Rankings
          </Link>
        </div>
      </div>
    );
  }

  const abbreviation = getMdaAbbreviation(selected.mdaName);
  const excluded = selected.excludedMetrics || [];
  const rosterEntry = matchBeepaTrackerRosterEntry(selected.mdaName, abbreviation);
  const beepaExempted =
    rosterEntry?.beepaExempted === true ||
    excluded.some((key) => key === "others" || key.startsWith("others:"));
  const isSuperMda = isSuperBeepaMda(selected.mdaName, abbreviation);
  const beepaMax = beepaMaxPointsForMda(selected.mdaName, abbreviation);
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
      const isScored = scored?.scored === true;
      const isComplete = isScored && scored?.complete !== false;
      const slaIssues =
        metric.key === "sla" && !exempted
          ? (selected.slaMonthIssues || []).map((issue) => ({
              label: issue.monthLabel,
              message: issue.message,
              kind: issue.kind,
            }))
          : undefined;
      const scoreValue = exempted ? 0 : (scored?.score ?? 0);
      let maxValue = scored?.max ?? metric.max;
      if (isBeepaMetric && !exempted) {
        maxValue = beepaMax;
      }
      const showDetail = !exempted && (isScored || scoreValue > 0);

      // Explanations only for Report Gov + BEEPA (Super MDAs out of 10, others out of 9).
      let breakdown: ScoreBreakdownLine[] | undefined;
      if (showDetail && metric.key === "reportGov") {
        breakdown = selected.scoreBreakdowns?.reportGov;
      } else if (showDetail && isBeepaMetric) {
        breakdown =
          selected.scoreBreakdowns?.[metric.key] ??
          beepaScoreBreakdown({
            score: Math.min(scoreValue, beepaMax),
            maxPoints: beepaMax,
            isSuperMda,
          });
      }

      const monthStatuses =
        showDetail && metric.key === "sla" && (selected.slaMonthStatuses?.length ?? 0) > 0
          ? selected.slaMonthStatuses!.map((month) => ({
              monthKey: month.monthKey,
              monthLabel: month.monthLabel,
              status: month.status,
              labelMode: "sla" as const,
              points: month.points,
              maxPoints: month.maxPoints,
              percentage: month.percentage,
              message: month.message,
            }))
          : showDetail &&
              (metric.key === "timeliness" || metric.key === "reportSubmission") &&
              (selected.efficiencyMonthStatuses?.[metric.key]?.length ?? 0) > 0
            ? selected.efficiencyMonthStatuses![metric.key]!.map((month) => ({
                monthKey: month.monthKey,
                monthLabel: month.monthLabel,
                status: month.status,
                labelMode:
                  metric.key === "reportSubmission"
                    ? ("submission" as const)
                    : ("timeliness" as const),
              }))
            : undefined;

      return {
        name: metric.label,
        score: isBeepaMetric && !exempted ? Math.min(scoreValue, beepaMax) : scoreValue,
        maxScore: maxValue,
        scored: exempted ? true : isScored,
        complete: exempted ? true : isComplete,
        badge: efficiencyKeys.has(metric.key) ? "Efficiency" : undefined,
        // Admin metric justifications stay in admin scoring only — not on the public tracker.
        justification: undefined,
        exempted,
        issues: slaIssues && slaIssues.length > 0 ? slaIssues : undefined,
        // Score math only for Report Gov + BEEPA; month grids for SLA / reports / timeliness.
        scoreBreakdown: breakdown && breakdown.length > 0 ? breakdown : undefined,
        monthStatuses,
      };
    });

  const fullyScored = metrics
    .filter((metric) => !metric.exempted)
    .every((metric) => metric.scored === true && metric.complete !== false);
  const status = fullyScored
    ? getScoreStatus(selected.finalScore, selected.maxPossibleScore)
    : null;

  return (
    <div>
      <SummaryHeader
        backHref="/tracker/mdas"
        backLabel="Back to MDA Rankings"
        abbreviation={abbreviation}
        title={selected.mdaName}
        description={`Rank #${selected.rank} of ${mdaData?.totalMdas || 0} MDAs`}
        status={status}
        score={selected.finalScore}
        maxScore={selected.maxPossibleScore}
        scoreLabel="Overall BFA Score"
        notScoredYet={!fullyScored}
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
      <MetricBreakdown
        title="BFA Metrics"
        hint="Report Gov and BEEPA show how scores are graded. SLA, Monthly Report, and Timeliness show month-by-month status."
        metrics={metrics}
        hideStatus={!fullyScored}
      />
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
          justification: item.justification,
        }))}
        penalties={((mdaData.adjustments?.penalties || []) as AdjustmentItem[]).map((item) => ({
          name: item.name,
          applied: selected.penaltyValues?.[item.id] === true,
          value: item.value,
          justification: item.justification,
        }))}
        bonusTotal={selected.bonusScore ?? 0}
        penaltyTotal={selected.penaltyScore ?? 0}
      />
    </div>
  );
}
