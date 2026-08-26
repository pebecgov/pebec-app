"use client";

interface ReportMonth {
  monthName: string;
  year: number;
  status: "submitted" | "outstanding" | "upcoming";
  submitted: boolean;
}

export function MonthlyReportsPanel({
  submitted,
  due,
  outstanding,
  months,
  lastClosedAt,
}: {
  submitted: number;
  due: number;
  outstanding: number;
  months: ReportMonth[];
  lastClosedAt: number | null;
}) {
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
          <h2 className="text-lg font-semibold text-gray-900">Monthly BFA Reports</h2>
          <p className="text-sm text-gray-500 mt-1">
            Live from Reform Champion submissions. Each month closes on the 30th.
          </p>
        </div>
        <p className="text-sm font-medium text-gray-700">
          {submitted}/{due} due months submitted
          {outstanding > 0 ? ` · ${outstanding} outstanding` : ""}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="w-full bg-gray-200 rounded-full h-2 mb-5">
          <div
            className="bg-[#006B3F] h-2 rounded-full transition-all"
            style={{ width: `${due > 0 ? Math.min(100, (submitted / due) * 100) : 0}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {months.map((month) => {
            const styles =
              month.status === "submitted"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : month.status === "outstanding"
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : "bg-gray-50 border-gray-200 text-gray-500";
            const label =
              month.status === "submitted"
                ? "Submitted"
                : month.status === "outstanding"
                  ? "Outstanding"
                  : "Not due";

            return (
              <div
                key={`${month.monthName}-${month.year}`}
                className={`rounded-lg border px-3 py-2 text-center ${styles}`}
              >
                <div className="text-xs font-semibold">{month.monthName}</div>
                <div className="text-[11px] mt-0.5">{label}</div>
              </div>
            );
          })}
        </div>

        {closedLabel && (
          <p className="text-xs text-gray-400 mt-4">Last monthly close: {closedLabel}</p>
        )}
      </div>
    </section>
  );
}
