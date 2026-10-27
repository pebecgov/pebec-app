'use client';

import React, { useMemo, useState } from 'react';

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    '70-100': true,
    '50-69': true,
    '40-49': true,
    '0-39': true,
  });

  const rows = useMemo(
    () => processDashboardMdaData(mdaFilter, ministryFilter) || [],
    [processDashboardMdaData, mdaFilter, ministryFilter]
  );

  const byRange = useMemo(() => {
    const next: Record<string, { name: string; score: number }[]> = {
      '70-100': [],
      '50-69': [],
      '40-49': [],
      '0-39': [],
    };
    for (const mda of rows) {
      const score = bandScore(Number(mda.totalScore) || 0);
      const name = String(mda.mdaName || '').trim() || 'Unknown MDA';
      next[rangeKeyForScore(score)].push({ name, score });
    }
    for (const key of Object.keys(next)) {
      next[key].sort((a, b) => a.name.localeCompare(b.name));
    }
    return next;
  }, [rows]);

  const total = rows.length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">MDAs by score range</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Final score out of 100 (same filters as the table). {total} MDA{total === 1 ? '' : 's'} counted.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {RANGES.map((range) => {
          const mdas = byRange[range.key] ?? [];
          const count = mdas.length;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isOpen = expanded[range.key] ?? true;
          return (
            <div
              key={range.key}
              className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3"
            >
              <button
                type="button"
                className="w-full flex items-start justify-between gap-3 text-left"
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [range.key]: !isOpen }))
                }
              >
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {range.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                    {count}
                  </p>
                  <p className="text-xs text-gray-500">{pct}% of listed MDAs</p>
                </div>
                <span className="mt-1 text-xs font-medium text-gray-500 shrink-0">
                  {isOpen ? 'Hide' : 'Show'} names
                </span>
              </button>
              {isOpen && (
                <ul className="mt-3 max-h-56 overflow-y-auto space-y-1.5 border-t border-gray-200 pt-3">
                  {mdas.length === 0 ? (
                    <li className="text-xs text-gray-400 italic">No MDAs in this range</li>
                  ) : (
                    mdas.map((mda) => (
                      <li
                        key={`${range.key}-${mda.name}`}
                        className="text-sm text-gray-800 leading-snug"
                      >
                        {mda.name}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
