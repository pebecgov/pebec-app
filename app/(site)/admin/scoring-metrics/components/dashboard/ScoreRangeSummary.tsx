'use client';

import React, { useMemo } from 'react';

const RANGES = [
  { key: '70-100', label: '100 – 70', min: 70, max: 100 },
  { key: '50-69', label: '69 – 50', min: 50, max: 69.999999 },
  { key: '40-49', label: '49 – 40', min: 40, max: 49.999999 },
  { key: '0-39', label: '0 – 39', min: 0, max: 39.999999 },
] as const;

type Props = {
  processDashboardMdaData: (
    filter: 'all' | 'withData',
    ministryFilter: 'all' | 'ministries-only' | 'without-ministries'
  ) => any[];
  mdaFilter: 'all' | 'withData';
  ministryFilter: 'all' | 'ministries-only' | 'without-ministries';
};

function bandScore(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.min(Math.max(raw, 0), 100);
}

function rangeKeyForScore(score: number): (typeof RANGES)[number]['key'] {
  if (score >= 70) return '70-100';
  if (score >= 50) return '50-69';
  if (score >= 40) return '40-49';
  return '0-39';
}

export default function ScoreRangeSummary({
  processDashboardMdaData,
  mdaFilter,
  ministryFilter,
}: Props) {
  const rows = useMemo(
    () => processDashboardMdaData(mdaFilter, ministryFilter) || [],
    [processDashboardMdaData, mdaFilter, ministryFilter]
  );

  const byRange = useMemo(() => {
    const next: Record<string, string[]> = {
      '70-100': [],
      '50-69': [],
      '40-49': [],
      '0-39': [],
    };
    for (const mda of rows) {
      const score = bandScore(Number(mda.totalScore) || 0);
      const name = String(mda.mdaName || '').trim() || 'Unknown MDA';
      next[rangeKeyForScore(score)].push(name);
    }
    for (const key of Object.keys(next)) {
      next[key].sort((a, b) => a.localeCompare(b));
    }
    return next;
  }, [rows]);

  const total = rows.length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">MDAs by score range</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Final score out of 100 (same filters as the table). {total} MDA{total === 1 ? '' : 's'} counted.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {RANGES.map((range) => {
          const names = byRange[range.key] ?? [];
          const count = names.length;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div
              key={range.key}
              className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4"
            >
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {range.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                    {count}
                  </p>
                  <p className="text-xs text-gray-500">{pct}% of listed MDAs</p>
                </div>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                  MDA names
                </p>
                {names.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No MDAs in this range</p>
                ) : (
                  <ul className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {names.map((name) => (
                      <li key={`${range.key}-${name}`} className="text-sm text-gray-800 leading-snug">
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
