"use client";

import { formatPoints, getScoreStatus, type RankingRow } from "@/lib/scoreTracker";
import { ProgressBar, RankBadge, StatusBadge } from "./primitives";

interface RankingTableProps {
  rows: RankingRow[];
  extraColumnHeader: string;
  onRowClick: (row: RankingRow) => void;
}

export function RankingTable({ rows, extraColumnHeader, onRowClick }: RankingTableProps) {
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
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Progress</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">{extraColumnHeader}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, index) => {
              const status = getScoreStatus(row.score, row.maxScore);
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-900">{formatPoints(row.score)}</span>
                  </td>
                  <td className="px-6 py-4 w-40">
                    <ProgressBar score={row.score} maxScore={row.maxScore} color={status.color} size="sm" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={status} size="sm" />
                  </td>
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
