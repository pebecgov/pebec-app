"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, List, Search } from "lucide-react";
import { SCORE_YEAR, formatPoints, type RankingRow } from "@/lib/scoreTracker";
import { RankingTable } from "./RankingTable";
import { StatusDistribution } from "./StatusDistribution";
import {
  CardSkeleton,
  EntityCard,
  StatCard,
  StatCardSkeleton,
  TableSkeleton,
} from "./primitives";

type ViewMode = "ranking" | "grid";

interface RankingDashboardProps {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  extraColumnHeader: string;
  extraCardLabel: string;
  entityLabel: string;
  metricCount: number;
  metricLabel: string;
  rows: RankingRow[] | undefined;
  emptyMessage: string;
}

export function RankingDashboard({
  title,
  subtitle,
  searchPlaceholder,
  extraColumnHeader,
  extraCardLabel,
  entityLabel,
  metricCount,
  metricLabel,
  rows,
  emptyMessage,
}: RankingDashboardProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("ranking");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        row.abbreviation?.toLowerCase().includes(query)
    );
  }, [rows, searchQuery]);

  const averageScore =
    filteredRows.length > 0
      ? filteredRows.reduce((sum, row) => sum + row.score, 0) / filteredRows.length
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <Link
        href="/scores"
        className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm font-medium text-white bg-[#006B3F] rounded-lg hover:bg-[#005432] transition-colors shadow-md"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Tracker
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-500 mt-1">{subtitle}</p>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {rows ? (
            <>
              <StatCard
                title={`Total ${entityLabel}s`}
                value={rows.length}
                subtitle={entityLabel === "MDA" ? "Ministries, Departments & Agencies" : "Nigerian states & FCT"}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
              />
              <StatCard
                title={metricLabel}
                value={metricCount}
                subtitle={`Scored ${metricLabel.toLowerCase()} in the ${SCORE_YEAR} framework`}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                }
              />
              <StatCard
                title="Assessment Year"
                value={SCORE_YEAR}
                subtitle="Current scoring cycle"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
              <StatCard
                title="Average Score"
                value={formatPoints(averageScore)}
                subtitle={searchQuery ? `Across ${filteredRows.length} matching results` : `Across all ${entityLabel.toLowerCase()}s`}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                }
              />
            </>
          ) : (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          )}
        </div>
      </section>

      {rows && rows.length > 0 && (
        <section className="mb-8">
          <StatusDistribution rows={rows} />
        </section>
      )}

      <section>
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{entityLabel} Rankings</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-56 sm:w-64 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006B3F] focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode("ranking")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "ranking" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
                aria-label="Table view"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>
        </div>

        {searchQuery && rows && (
          <p className="text-sm text-gray-500 mb-3">
            Found {filteredRows.length} of {rows.length} {entityLabel.toLowerCase()}s
          </p>
        )}

        {!rows ? (
          viewMode === "ranking" ? (
            <TableSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          )
        ) : filteredRows.length > 0 ? (
          viewMode === "ranking" ? (
            <RankingTable
              rows={filteredRows}
              extraColumnHeader={extraColumnHeader}
              onRowClick={(row) => router.push(row.href)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRows.map((row) => (
                <EntityCard
                  key={row.id}
                  row={row}
                  extraLabel={extraCardLabel}
                  onClick={() => router.push(row.href)}
                />
              ))}
            </div>
          )
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? `No ${entityLabel.toLowerCase()}s found` : emptyMessage}
            </h3>
            {searchQuery && (
              <p className="text-gray-500">No results for &quot;{searchQuery}&quot;. Try a different search term.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
