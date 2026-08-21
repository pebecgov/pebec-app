"use client";

import { getScoreStatus, getStatusColorClasses, type RankingRow } from "@/lib/scoreTracker";

interface StatusDistributionProps {
  rows: RankingRow[];
}

const BANDS = [
  { label: "Successful", color: "green" as const, range: "100%" },
  { label: "Progressing Well", color: "blue" as const, range: "80% - 99%" },
  { label: "In Progress", color: "yellow" as const, range: "60% - 79%" },
  { label: "Progressing With Difficulty", color: "orange" as const, range: "50% - 59%" },
  { label: "Requires Intervention", color: "red" as const, range: "0% - 49%" },
];

export function StatusDistribution({ rows }: StatusDistributionProps) {
  const total = rows.length;
  const counts = BANDS.map((band) => ({
    ...band,
    count: rows.filter((row) => getScoreStatus(row.score, row.maxScore).label === band.label).length,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#006B3F] to-[#008B52]" />
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
      <div className="h-8 rounded-full overflow-hidden flex mb-6">
        {counts.map((item) => {
          const percentage = total > 0 ? (item.count / total) * 100 : 0;
          if (percentage === 0) return null;
          const colors = getStatusColorClasses(item.color);
          return (
            <div
              key={item.label}
              className={`${colors.progress} transition-all duration-500`}
              style={{ width: `${percentage}%` }}
              title={`${item.label}: ${item.count}`}
            />
          );
        })}
        {total === 0 && <div className="w-full bg-gray-200" />}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {counts.map((item) => {
          const colors = getStatusColorClasses(item.color);
          const percentage = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <div key={item.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${colors.progress}`} />
              <div className="flex-1">
                <span className="text-sm text-gray-600">{item.label}</span>
                <span className="text-xs text-gray-400 ml-2">({item.range})</span>
              </div>
              <span className="text-sm font-medium text-gray-900 ml-auto">
                {item.count} ({Math.round(percentage)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
