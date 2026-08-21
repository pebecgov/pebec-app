"use client";

import type { ReactNode } from "react";
import {
  getScoreStatus,
  getStatusColorClasses,
  formatPoints,
  type RankingRow,
  type ScoreStatus,
  type StatusColor,
} from "@/lib/scoreTracker";

export function RankBadge({ rank, size = "md" }: { rank: number; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
  };

  return (
    <div
      className={`${sizeClasses[size]} bg-gray-100 text-gray-600 rounded-full flex items-center justify-center font-bold`}
    >
      {rank}
    </div>
  );
}

export function StatusBadge({ status, size = "md" }: { status: ScoreStatus; size?: "sm" | "md" | "lg" }) {
  const colors = getStatusColorClasses(status.color);
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${colors.badge} ${sizeClasses[size]}`}>
      {status.label}
    </span>
  );
}

export function ProgressBar({
  score,
  maxScore,
  color,
  size = "md",
}: {
  score: number;
  maxScore: number;
  color: StatusColor;
  size?: "sm" | "md" | "lg";
}) {
  const colors = getStatusColorClasses(color);
  const percentage = maxScore > 0 ? Math.min(Math.max((score / maxScore) * 100, 0), 100) : 0;
  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${colors.progress} ${sizeClasses[size]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#006B3F] to-[#008B52]" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {icon && (
          <div className="p-3 bg-gradient-to-br from-[#006B3F]/10 to-[#008B52]/10 rounded-xl text-[#006B3F]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function EntityCard({
  row,
  extraLabel,
  onClick,
}: {
  row: RankingRow;
  extraLabel: string;
  onClick: () => void;
}) {
  const status = getScoreStatus(row.score, row.maxScore);

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all duration-200 relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:border-[#006B3F]/30"
      onClick={onClick}
    >
      {row.rank <= 3 && (
        <div
          className={`absolute top-0 right-0 w-16 h-16 ${
            row.rank === 1 ? "bg-yellow-400" : row.rank === 2 ? "bg-gray-300" : "bg-amber-600"
          } opacity-10 rounded-bl-full`}
        />
      )}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <RankBadge rank={row.rank} />
          <div>
            {row.abbreviation && (
              <span className="inline-flex px-2 py-0.5 text-xs font-bold text-[#006B3F] bg-[#006B3F]/10 rounded mb-1">
                {row.abbreviation}
              </span>
            )}
            <h3 className="text-base font-semibold text-gray-900 leading-tight">{row.name}</h3>
          </div>
        </div>
      </div>
      <div className="mb-4">
        <ProgressBar score={row.score} maxScore={row.maxScore} color={status.color} />
      </div>
      <div className="flex items-center justify-between">
        <StatusBadge status={status} size="sm" />
        <span className="text-lg font-bold text-[#006B3F]">{formatPoints(row.score)}</span>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        {row.extra} {extraLabel}
      </p>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <Skeleton className="h-4 w-full" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 border-b border-gray-200 flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-2.5 w-32" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="h-2.5 w-full mb-4" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}
