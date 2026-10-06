"use client";

import { formatPercentageValue, formatPoints, getScoreStatus, type RankingRow } from "@/lib/scoreTracker";
import { ProgressBar, RankBadge, StatusBadge } from "./primitives";

interface RankingTableProps {
  rows: RankingRow[];
  extraColumnHeader: string;
  onRowClick: (row: RankingRow) => void;
  hideStatusColumn?: boolean;
  /** When true, Score column shows percentage (MDA tracker). */
  showAsPercentage?: boolean;
}

export function RankingTable({
  rows,
  extraColumnHeader,
  onRowClick,
  hideStatusColumn = false,
  showAsPercentage = false,
}: RankingTableProps) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#006B3F] to-[#008B52]" />
      <div className="overflow-auto max-h-[640px]">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gradient-to-r from-[#006B3F] to-[#008B52] text-white">
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Rank</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Score</th>
              {!hideStatusColumn && (
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Progress</th>
              )}
              {!hideStatusColumn && (
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
              )}
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">{extraColumnHeader}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, index) => {
              const status = hideStatusColumn ? null : getScoreStatus(row.score, row.maxScore);
              const pct =
                row.percentage ??
                (row.maxScore > 0 ? (row.score / row.maxScore) * 100 : 0);
              return (
                <tr
                  key={row.id}
                  className={`transition-all duration-150 cursor-pointer hover:bg-[#006B3F]/5 hover:shadow-sm ${
                    index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  }`}
                  onClick={() => onRowClick(row)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <RankBadge rank={row.rank} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{row.name}</div>
                    {row.abbreviation && <div className="text-sm text-gray-500">{row.abbreviation}</div>}
                    {row.badges && row.badges.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {row.badges.map((badge) => (
                          <span
                            key={badge}
                            className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-50 text-amber-900 border border-amber-200"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {showAsPercentage ? formatPercentageValue(pct) : formatPoints(row.score)}
                    </span>
                  </td>
                  {!hideStatusColumn && status && (
                    <td className="px-6 py-4 w-40">
                      <ProgressBar score={row.score} maxScore={row.maxScore} color={status.color} size="sm" />
                    </td>
                  )}
                  {!hideStatusColumn && status && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={status} size="sm" />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.extra}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
