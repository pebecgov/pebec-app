"use client";

import { useState } from "react";
import Link from "next/link";
import {
  formatPoints,
  formatScorePair,
  getScoreStatus,
  SCORE_YEAR,
  type ScoreStatus,
} from "@/lib/scoreTracker";
import { ProgressBar, StatusBadge } from "./primitives";

export interface MetricItem {
  name: string;
  score: number;
  maxScore: number;
  details?: { label: string; score: number }[];
}

export function SummaryHeader({
  backHref,
  backLabel,
  abbreviation,
  title,
  description,
  status,
  score,
  maxScore,
  scoreLabel,
}: {
  backHref: string;
  backLabel: string;
  abbreviation?: string;
  title: string;
  description?: string;
  status: ScoreStatus;
  score: number;
  maxScore: number;
  scoreLabel: string;
}) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="h-2 bg-gradient-to-r from-[#006B3F] to-[#008B52]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 px-4 py-2 mb-4 text-sm font-medium text-white bg-[#006B3F] rounded-lg hover:bg-[#005432] transition-colors shadow-md"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {backLabel}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              {abbreviation && (
                <span className="inline-flex items-center justify-center px-3 py-1 text-sm font-bold text-white bg-[#006B3F] rounded-lg">
                  {abbreviation}
                </span>
              )}
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            </div>
            {description && <p className="text-gray-500 mt-2">{description}</p>}
          </div>
          <StatusBadge status={status} size="lg" />
        </div>

        <div className="mt-6 bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{scoreLabel}</span>
            <span className="text-2xl font-bold text-[#006B3F]">{formatScorePair(score, maxScore)}</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">Assessment year {SCORE_YEAR}</p>
          <ProgressBar score={score} maxScore={maxScore} color={status.color} size="lg" />
        </div>
      </div>
    </header>
  );
}

export function MetricBreakdown({
  title,
  hint,
  metrics,
}: {
  title: string;
  hint: string;
  metrics: MetricItem[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {title} ({metrics.length})
        </h2>
        <p className="text-sm text-gray-500">{hint}</p>
      </div>

      {metrics.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No detailed breakdown is available yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {metrics.map((metric, index) => {
            const isExpanded = expanded === metric.name;
            const status = getScoreStatus(metric.score, metric.maxScore);
            const hasDetails = (metric.details?.length ?? 0) > 0;

            return (
              <div
                key={metric.name}
                className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div
                  className={`p-5 ${hasDetails ? "cursor-pointer hover:bg-gray-50" : ""} transition-colors`}
                  onClick={() => hasDetails && setExpanded(isExpanded ? null : metric.name)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {hasDetails && (
                        <button type="button" className="text-gray-400 hover:text-gray-600 p-1">
                          <svg
                            className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#006B3F] text-white text-sm font-bold shadow-sm">
                          {index + 1}
                        </span>
                        <h3 className="text-base font-semibold text-gray-900">{metric.name}</h3>
                      </div>
                    </div>
                    <StatusBadge status={status} size="sm" />
                  </div>
                  <div className={`flex items-center gap-4 ${hasDetails ? "ml-9" : "ml-0"}`}>
                    <div className="flex-1 max-w-md">
                      <ProgressBar score={metric.score} maxScore={metric.maxScore} color={status.color} size="sm" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 min-w-[72px]">
                      {formatPoints(metric.score)}
                    </span>
                    <span className="text-sm text-gray-500">/ {formatPoints(metric.maxScore)}</span>
                  </div>
                </div>

                {isExpanded && hasDetails && (
                  <div className="border-t border-gray-200">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 grid grid-cols-12 gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <div className="col-span-8">Sub-indicator</div>
                      <div className="col-span-4 text-right">Score</div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {metric.details!.map((detail) => (
                        <div key={detail.label} className="px-5 py-4 grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-8 text-sm text-gray-900 capitalize">
                            {detail.label.replace(/_/g, " ")}
                          </div>
                          <div className="col-span-4 text-right text-sm font-semibold text-gray-900">
                            {formatPoints(detail.score)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
