"use client";

import { reportCountsFromMonths, startMonthsFromNovember } from "@/lib/scoreTracker";

interface ReportMonth {
  monthName: string;
  month?: number;
  year: number;
  status: "submitted" | "outstanding" | "upcoming";
  submitted: boolean;
  onTime?: boolean;
}

type MatrixKind = "onTime" | "late" | "outstanding" | "upcoming";

const LIGHT_GREEN = "#86efac";
const LIGHT_PURPLE = "#d8b4fe";
const LIGHT_AMBER = "#fcd34d";
const LIGHT_RED = "#fca5a5";
const LIGHT_GRAY = "#e5e7eb";

function monthKind(month: ReportMonth): MatrixKind {
  if (month.status === "outstanding") return "outstanding";
  if (month.status === "upcoming") return "upcoming";
  return month.onTime === false ? "late" : "onTime";
}

function monthTitle(month: ReportMonth): string {
  const period = `${month.monthName} ${month.year}`;
  const kind = monthKind(month);
  if (kind === "onTime") return `Submitted on time: ${period}`;
  if (kind === "late") return `Submitted late: ${period}`;
  if (kind === "outstanding") return `Outstanding: ${period}`;
  return `Not due: ${period}`;
}

function StatusBox({ kind, size = "md" }: { kind: MatrixKind; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-5 h-5" : "w-8 h-8";
  const style =
    kind === "onTime"
      ? { background: `linear-gradient(to right, ${LIGHT_GREEN} 50%, ${LIGHT_PURPLE} 50%)` }
      : kind === "late"
        ? { background: `linear-gradient(to right, ${LIGHT_GREEN} 50%, ${LIGHT_AMBER} 50%)` }
        : kind === "outstanding"
          ? { background: LIGHT_RED }
          : { background: LIGHT_GRAY };

  return (
    <span
      className={`inline-block ${dim} rounded-sm align-middle shrink-0 ring-1 ring-black/10`}
      style={style}
    />
  );
}

export function MonthlyReportsPanel({
  mdaName,
  months,
  lastClosedAt,
}: {
  mdaName: string;
  months: ReportMonth[];
  lastClosedAt: number | null;
}) {
  const displayMonths = startMonthsFromNovember(months);
  const { submitted, due, outstanding } = reportCountsFromMonths(displayMonths);
  const closedLabel = lastClosedAt
    ? new Date(lastClosedAt).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Submission Matrix</h2>
          <p className="text-sm text-gray-500 mt-1">
            Monthly BFA filings for this MDA. Cycle runs November to November. Each month closes on the 30th.
          </p>
        </div>
        <p className="text-sm font-medium text-gray-700">
          {submitted}/{due} due months submitted
          {outstanding > 0 ? ` · ${outstanding} outstanding` : ""}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-[#006B3F] h-2 rounded-full transition-all"
            style={{ width: `${due > 0 ? Math.min(100, (submitted / due) * 100) : 0}%` }}
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Legend</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-700">
            <span className="inline-flex items-center gap-1.5">
              <StatusBox kind="onTime" size="sm" />
              On time
            </span>
            <span className="inline-flex items-center gap-1.5">
              <StatusBox kind="late" size="sm" />
              Submitted late
            </span>
            <span className="inline-flex items-center gap-1.5">
              <StatusBox kind="outstanding" size="sm" />
              Outstanding
            </span>
            <span className="inline-flex items-center gap-1.5">
              <StatusBox kind="upcoming" size="sm" />
              Not due
            </span>
          </div>
        </div>

        {displayMonths.length > 0 && (
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full table-fixed">
              <thead>
                <tr className="bg-gray-100">
                  <th className="sticky left-0 z-10 bg-gray-100 px-3 py-2 text-left text-xs font-semibold text-gray-600 w-[220px] max-w-[220px]">
                    MDA
                  </th>
                  {displayMonths.map((month) => (
                    <th
                      key={`${month.monthName}-${month.year}`}
                      className="px-2 py-2 text-center text-xs font-semibold text-gray-600 whitespace-nowrap"
                    >
                      {month.monthName.slice(0, 3)} {month.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="sticky left-0 z-10 bg-white px-3 py-3 text-sm font-medium text-gray-900 w-[220px] max-w-[220px] break-words">
                    {mdaName}
                  </td>
                  {displayMonths.map((month) => {
                    const kind = monthKind(month);
                    const title = monthTitle(month);
                    return (
                      <td
                        key={`${month.monthName}-${month.year}`}
                        className="px-2 py-3.5 text-center align-middle"
                      >
                        <span title={title} aria-label={title}>
                          <StatusBox kind={kind} />
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {closedLabel && (
          <p className="text-xs text-gray-400 mt-4">Last monthly close: {closedLabel}</p>
        )}
      </div>
    </section>
  );
}
