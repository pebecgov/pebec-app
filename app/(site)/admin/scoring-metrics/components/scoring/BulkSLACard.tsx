"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  PlayCircle,
  RefreshCw,
  Scale,
} from "lucide-react";

type MonthOutcome = {
  monthKey: string;
  monthName: string;
  status: "scored" | "failed" | "no_report" | "no_file" | "unsupported_format" | "kept";
  score: number;
  overallPercentage: number | null;
  validRows?: number;
  totalRows?: number;
  detail: string;
};

type MdaResult = {
  mdaName: string;
  status: "saved" | "would_save" | "excluded" | "kept_existing" | "unchanged" | "error";
  previousScore: number | null;
  newScore: number;
  percentage: number;
  monthsWithData: number;
  monthsScored: number;
  monthsFailed: number;
  monthsMissing: number;
  monthsUpdated?: number;
  monthsKept?: number;
  detail: string;
  months: MonthOutcome[];
};

type RunSummary = {
  dryRun: boolean;
  updateLatestOnly: boolean;
  slaPoints: number;
  pointsPerMonth: number;
  totalMonths: number;
  results: MdaResult[];
  failedChunks: string[];
};

type RunMode = "full" | "latest";

const STATUS_LABEL: Record<MdaResult["status"], string> = {
  saved: "Saved",
  would_save: "Will save",
  excluded: "Excluded",
  kept_existing: "Kept existing",
  unchanged: "No changes",
  error: "Error",
};

const STATUS_CLASS: Record<MdaResult["status"], string> = {
  saved: "bg-green-100 text-green-800",
  would_save: "bg-blue-100 text-blue-800",
  excluded: "bg-gray-200 text-gray-700",
  kept_existing: "bg-amber-100 text-amber-800",
  unchanged: "bg-slate-100 text-slate-700",
  error: "bg-rose-100 text-rose-800",
};

const SLA_STATUS_LABEL: Record<string, string> = {
  scored: "SLA scored",
  failed: "SLA failed",
  missing: "No upload",
  none: "Uploaded · not scored",
};

const CHUNK_SIZE = 3;
const PREVIEW_LIMIT = 25;

function formatSubmittedAt(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  scoringPeriod: string;
  mdaNames: string[];
};

export default function BulkSLACard({ scoringPeriod, mdaNames }: Props) {
  const context = useQuery(api.bulkSlaScoring.getBulkSlaContext, { scoringPeriod });
  const runChunk = useAction(api.bulkSlaScoringActions.runBulkSlaScoringChunk);
  const logAudit = useMutation(api.bulkSlaScoring.logBulkSlaAudit);

  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [running, setRunning] = useState<"dry" | "live" | null>(null);
  const [runMode, setRunMode] = useState<RunMode>("full");
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedMda, setExpandedMda] = useState<string | null>(null);
  const [confirmLatest, setConfirmLatest] = useState(false);
  const [selectedMdas, setSelectedMdas] = useState<string[]>([]);
  const [mdaFilter, setMdaFilter] = useState("");
  const [showSubmissionDates, setShowSubmissionDates] = useState(false);
  const [datesExpandedMda, setDatesExpandedMda] = useState<string | null>(null);

  const uniqueMdaNames = useMemo(
    () => Array.from(new Set(mdaNames.map((n) => n.trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b),
    ),
    [mdaNames],
  );

  const didInitSelection = useRef(false);
  // Default: all selected on first load; later only drop names that disappeared.
  useEffect(() => {
    setSelectedMdas((prev) => {
      if (uniqueMdaNames.length === 0) return [];
      if (!didInitSelection.current) {
        didInitSelection.current = true;
        return uniqueMdaNames;
      }
      const allowed = new Set(uniqueMdaNames);
      return prev.filter((name) => allowed.has(name));
    });
  }, [uniqueMdaNames]);

  const filteredMdaNames = useMemo(() => {
    const q = mdaFilter.trim().toLowerCase();
    if (!q) return uniqueMdaNames;
    return uniqueMdaNames.filter((name) => name.toLowerCase().includes(q));
  }, [uniqueMdaNames, mdaFilter]);

  const selectedSet = useMemo(() => new Set(selectedMdas), [selectedMdas]);
  const selectedCount = selectedMdas.length;

  const previewNames = useMemo(
    () => selectedMdas.slice(0, PREVIEW_LIMIT),
    [selectedMdas],
  );

  const submissionPreview = useQuery(
    api.bulkSlaScoring.getBulkSlaSubmissionPreview,
    showSubmissionDates && previewNames.length > 0
      ? { scoringPeriod, mdaNames: previewNames }
      : "skip",
  );

  const toggleMda = (name: string) => {
    setSelectedMdas((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const selectAllFiltered = () => {
    setSelectedMdas((prev) => Array.from(new Set([...prev, ...filteredMdaNames])));
  };

  const clearFiltered = () => {
    const drop = new Set(filteredMdaNames);
    setSelectedMdas((prev) => prev.filter((n) => !drop.has(n)));
  };

  const execute = async (dryRun: boolean, mode: RunMode) => {
    const targetMdas = selectedMdas.filter(Boolean);
    if (targetMdas.length === 0) {
      toast.error("Select at least one MDA");
      return;
    }

    setRunning(dryRun ? "dry" : "live");
    setRunMode(mode);
    setProgress(0);
    setSummary(null);
    setShowDetails(false);
    setExpandedMda(null);
    setConfirmLatest(false);

    const updateLatestOnly = mode === "latest";
    const results: MdaResult[] = [];
    const failedChunks: string[] = [];
    let slaPoints = context?.slaPoints ?? 0;
    let pointsPerMonth = context?.pointsPerMonth ?? 0;
    let totalMonths = context?.totalMonths ?? 0;

    const chunks: string[][] = [];
    for (let i = 0; i < targetMdas.length; i += CHUNK_SIZE) {
      chunks.push(targetMdas.slice(i, i + CHUNK_SIZE));
    }

    const runMdas = async (mdaNamesToRun: string[]) => {
      const res = await runChunk({
        scoringPeriod,
        mdaNames: mdaNamesToRun,
        dryRun,
        overwriteExisting: updateLatestOnly ? true : overwriteExisting,
        updateLatestOnly,
      });
      slaPoints = res.slaPoints;
      pointsPerMonth = res.pointsPerMonth;
      totalMonths = res.totalMonths;
      results.push(...res.results);
    };

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      try {
        await runMdas(chunk);
      } catch {
        for (const mdaName of chunk) {
          try {
            await runMdas([mdaName]);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            failedChunks.push(`${mdaName}: ${message}`);
          }
        }
      }
      setProgress(Math.round(((i + 1) / chunks.length) * 100));
    }

    const savedCount = results.filter((r) => r.status === "saved").length;
    if (!dryRun && savedCount > 0) {
      try {
        await logAudit({
          scoringPeriod,
          mdaCount: results.length,
          savedCount,
          dryRun: false,
        });
      } catch {
        // non-fatal
      }
    }

    setSummary({
      dryRun,
      updateLatestOnly,
      slaPoints,
      pointsPerMonth,
      totalMonths,
      results,
      failedChunks,
    });
    setRunning(null);

    if (failedChunks.length > 0) {
      toast.error(`Finished with ${failedChunks.length} failed batch${failedChunks.length > 1 ? "es" : ""}`);
    } else if (dryRun) {
      toast.success(
        updateLatestOnly
          ? `Latest-months preview ready for ${results.length} MDAs — nothing was saved`
          : `SLA preview ready for ${results.length} MDAs — nothing was saved`,
      );
    } else {
      toast.success(
        updateLatestOnly
          ? `Updated latest SLA months for ${savedCount} MDA${savedCount === 1 ? "" : "s"}`
          : `Saved SLA scores for ${savedCount} MDA${savedCount === 1 ? "" : "s"}`,
      );
    }
  };

  const counts = useMemo(() => {
    if (!summary) return null;
    const by = (s: MdaResult["status"]) => summary.results.filter((r) => r.status === s).length;
    return {
      saved: by("saved"),
      wouldSave: by("would_save"),
      excluded: by("excluded"),
      kept: by("kept_existing"),
      unchanged: by("unchanged"),
      errors: by("error"),
      monthsFailed: summary.results.reduce((n, r) => n + r.monthsFailed, 0),
      monthsUpdated: summary.results.reduce((n, r) => n + (r.monthsUpdated ?? 0), 0),
    };
  }, [summary]);

  return (
    <Card className="w-full border-dashed border-sky-300 bg-sky-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Scale className="w-4 h-4 text-sky-700" />
          Run Service Level Agreement (selected MDAs)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-gray-600">
          Scores SLA from reform-champion Excel uploads for{" "}
          <strong>{selectedCount}</strong> selected of <strong>{uniqueMdaNames.length}</strong> MDAs in{" "}
          <strong>{scoringPeriod}</strong>
          {context ? (
            <>
              {" "}
              ({context.totalMonths} months · max {context.slaPoints} pts ·{" "}
              {context.pointsPerMonth.toFixed(2)} pts/month)
            </>
          ) : null}
          . Always uses the <strong>latest upload</strong> when a month was submitted more than once.
        </p>

        <div className="rounded-md border border-sky-200 bg-white p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-gray-800">Select MDAs</p>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                disabled={running !== null}
                onClick={selectAllFiltered}
              >
                Select shown
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                disabled={running !== null}
                onClick={clearFiltered}
              >
                Clear shown
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                disabled={running !== null}
                onClick={() => setSelectedMdas(uniqueMdaNames)}
              >
                Select all
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                disabled={running !== null}
                onClick={() => setSelectedMdas([])}
              >
                Clear all
              </Button>
            </div>
          </div>
          <input
            type="search"
            value={mdaFilter}
            onChange={(e) => setMdaFilter(e.target.value)}
            placeholder="Filter MDAs…"
            className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs"
            disabled={running !== null}
          />
          <div className="max-h-40 overflow-auto rounded border border-gray-100 divide-y">
            {filteredMdaNames.map((name) => (
              <label
                key={name}
                className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-gray-800 hover:bg-sky-50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedSet.has(name)}
                  onCheckedChange={() => toggleMda(name)}
                  disabled={running !== null}
                />
                <span className="truncate">{name}</span>
              </label>
            ))}
            {filteredMdaNames.length === 0 && (
              <p className="px-2 py-2 text-[11px] text-gray-500">No MDAs match this filter.</p>
            )}
          </div>
          <p className="text-[11px] text-gray-500">
            {selectedCount} selected
            {mdaFilter.trim() ? ` · showing ${filteredMdaNames.length}` : ""}
          </p>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-gray-800">Submission dates</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              disabled={running !== null || selectedCount === 0}
              onClick={() => setShowSubmissionDates((v) => !v)}
            >
              {showSubmissionDates ? "Hide dates" : "Show dates for selected"}
            </Button>
          </div>
          {showSubmissionDates && (
            <>
              {selectedCount > PREVIEW_LIMIT && (
                <p className="text-[11px] text-amber-800">
                  Showing the first {PREVIEW_LIMIT} selected MDAs (select fewer for a full preview).
                </p>
              )}
              {submissionPreview === undefined && (
                <p className="text-[11px] text-gray-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading submission dates…
                </p>
              )}
              {submissionPreview && (
                <div className="max-h-56 overflow-auto rounded border">
                  <table className="w-full text-[11px]">
                    <thead className="sticky top-0 bg-gray-50 text-left text-gray-600">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">MDA</th>
                        <th className="px-2 py-1.5 font-medium">Uploads</th>
                        <th className="px-2 py-1.5 font-medium">Latest submit</th>
                        <th className="px-2 py-1.5 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {submissionPreview.rows.map((row) => {
                        const withUpload = row.months.filter((m) => m.submittedAt);
                        const latestTs = withUpload.reduce(
                          (max, m) => Math.max(max, m.submittedAt ?? 0),
                          0,
                        );
                        return (
                          <Fragment key={row.mdaName}>
                            <tr className="border-t align-top">
                              <td className="px-2 py-1.5 font-medium text-gray-900">{row.mdaName}</td>
                              <td className="px-2 py-1.5 text-gray-600">
                                {withUpload.length}/{row.months.length} months
                              </td>
                              <td className="px-2 py-1.5 text-gray-600">
                                {latestTs ? formatSubmittedAt(latestTs) : "—"}
                              </td>
                              <td className="px-2 py-1.5">
                                <button
                                  type="button"
                                  className="text-sky-700 hover:underline"
                                  onClick={() =>
                                    setDatesExpandedMda((cur) =>
                                      cur === row.mdaName ? null : row.mdaName,
                                    )
                                  }
                                >
                                  {datesExpandedMda === row.mdaName ? "Hide months" : "Months"}
                                </button>
                              </td>
                            </tr>
                            {datesExpandedMda === row.mdaName &&
                              row.months.map((m) => (
                                <tr
                                  key={`${row.mdaName}-${m.monthKey}`}
                                  className="border-t bg-slate-50/80 align-top"
                                >
                                  <td className="px-2 py-1 pl-6 text-gray-600" colSpan={2}>
                                    {m.monthName} {m.year}
                                    {m.reportCount > 1 ? ` · ${m.reportCount} uploads` : ""}
                                    {m.fileName ? (
                                      <span className="block text-[10px] text-gray-400 truncate max-w-[16rem]">
                                        {m.fileName}
                                      </span>
                                    ) : null}
                                  </td>
                                  <td className="px-2 py-1 text-gray-700">
                                    {formatSubmittedAt(m.submittedAt)}
                                  </td>
                                  <td className="px-2 py-1 text-gray-600">
                                    {SLA_STATUS_LABEL[m.slaStatus] ?? m.slaStatus}
                                  </td>
                                </tr>
                              ))}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-700">
          <Checkbox
            checked={overwriteExisting}
            onCheckedChange={(v) => setOverwriteExisting(v === true)}
            disabled={running !== null}
          />
          Also replace MDAs that already have a saved SLA score
          <span className="text-gray-400">(full run only — off by default)</span>
        </label>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 border-sky-300 text-sky-800 hover:bg-sky-100"
            disabled={running !== null || selectedCount === 0}
            onClick={() => execute(true, "full")}
          >
            {running === "dry" && runMode === "full" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Previewing…
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" /> Preview selected (no save)
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-1 bg-sky-700 hover:bg-sky-800"
            disabled={running !== null || selectedCount === 0}
            onClick={() => execute(false, "full")}
          >
            {running === "live" && runMode === "full" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running…
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 mr-2" /> Run &amp; save for selected
              </>
            )}
          </Button>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 space-y-2">
          <p className="text-xs text-amber-950 font-medium">Update latest months only</p>
          <p className="text-[11px] text-amber-900/90 leading-relaxed">
            Keeps months that already scored successfully. Only processes months that are missing or whose last
            score failed — those are re-scored from the latest upload. Successful months are not re-scored even
            if a newer file was uploaded later. Runs only for the MDAs you selected above.
          </p>

          {!confirmLatest ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full border-amber-400 text-amber-950 hover:bg-amber-100"
              disabled={running !== null || selectedCount === 0}
              onClick={() => setConfirmLatest(true)}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Ask: update latest / unscored months for selected?
            </Button>
          ) : (
            <div className="space-y-2 rounded border border-amber-300 bg-white p-2">
              <p className="text-[11px] text-gray-700">
                Confirm: only score missing or previously failed months for{" "}
                <strong>{selectedCount}</strong> selected MDA{selectedCount === 1 ? "" : "s"} in{" "}
                <strong>{scoringPeriod}</strong>? Months that already succeeded stay unchanged.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={running !== null}
                  onClick={() => setConfirmLatest(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 border-amber-400"
                  disabled={running !== null}
                  onClick={() => execute(true, "latest")}
                >
                  {running === "dry" && runMode === "latest" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Previewing…
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" /> Preview latest only
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 bg-amber-700 hover:bg-amber-800"
                  disabled={running !== null}
                  onClick={() => execute(false, "latest")}
                >
                  {running === "live" && runMode === "latest" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" /> Confirm &amp; update
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {running !== null && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-[11px] text-gray-500">
              {progress}% — {runMode === "latest" ? "updating latest months" : "processing"}{" "}
              {selectedCount} MDA{selectedCount === 1 ? "" : "s"} in batches of {CHUNK_SIZE}
            </p>
          </div>
        )}

        {summary && counts && (
          <div className="rounded-md border bg-white p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`rounded px-2 py-0.5 font-medium ${
                  summary.dryRun ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                }`}
              >
                {summary.dryRun ? "Preview" : "Saved"}
                {summary.updateLatestOnly ? " · latest months" : ""}
              </span>
              <span className="text-gray-700">
                {summary.results.length} MDAs · max {summary.slaPoints} pts
              </span>
              {summary.dryRun ? (
                <span className="text-gray-700">{counts.wouldSave} would be written</span>
              ) : (
                <span className="text-gray-700">{counts.saved} written</span>
              )}
              {counts.unchanged > 0 && (
                <span className="text-slate-600">{counts.unchanged} unchanged</span>
              )}
              {counts.kept > 0 && <span className="text-amber-700">{counts.kept} kept existing</span>}
              {counts.excluded > 0 && <span className="text-gray-600">{counts.excluded} excluded</span>}
              {summary.updateLatestOnly && counts.monthsUpdated > 0 && (
                <span className="text-sky-800">{counts.monthsUpdated} month(s) updated</span>
              )}
              {counts.monthsFailed > 0 && (
                <span className="text-rose-700">{counts.monthsFailed} month file(s) failed</span>
              )}
            </div>

            {summary.failedChunks.length > 0 && (
              <div className="rounded border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
                <p className="font-medium mb-1">Some batches failed:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {summary.failedChunks.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowDetails((s) => !s)}
              className="flex items-center gap-1 text-xs font-medium text-sky-800 hover:underline"
            >
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showDetails ? "Hide" : "Show"} per-MDA results
            </button>

            {showDetails && (
              <div className="max-h-[28rem] overflow-auto rounded border">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">MDA</th>
                      <th className="px-2 py-1.5 font-medium">Status</th>
                      <th className="px-2 py-1.5 font-medium">Score</th>
                      <th className="px-2 py-1.5 font-medium">Months</th>
                      <th className="px-2 py-1.5 font-medium">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.results.map((r) => (
                      <Fragment key={r.mdaName}>
                        <tr className="border-t align-top">
                          <td className="px-2 py-1.5 font-medium text-gray-900">{r.mdaName}</td>
                          <td className="px-2 py-1.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CLASS[r.status]}`}
                            >
                              {STATUS_LABEL[r.status]}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <span className="font-semibold text-gray-900">
                              {r.newScore.toFixed(2)}/{summary.slaPoints}
                            </span>
                            {r.previousScore !== null && r.previousScore !== r.newScore && (
                              <span className="ml-1 text-gray-400 line-through">
                                {r.previousScore.toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-gray-600">
                            {summary.updateLatestOnly
                              ? `${r.monthsUpdated ?? 0} updated · ${r.monthsKept ?? 0} kept · ${r.monthsFailed} fail`
                              : `${r.monthsScored} ok · ${r.monthsFailed} fail · ${r.monthsMissing} missing`}
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="text-gray-600">{r.detail}</div>
                            {r.months.length > 0 && (
                              <button
                                type="button"
                                className="mt-0.5 text-sky-700 hover:underline"
                                onClick={() =>
                                  setExpandedMda((cur) => (cur === r.mdaName ? null : r.mdaName))
                                }
                              >
                                {expandedMda === r.mdaName ? "Hide months" : "Show months"}
                              </button>
                            )}
                          </td>
                        </tr>
                        {expandedMda === r.mdaName &&
                          r.months.map((m) => (
                            <tr
                              key={`${r.mdaName}-${m.monthKey}`}
                              className="border-t bg-sky-50/50 align-top"
                            >
                              <td className="px-2 py-1 pl-6 text-gray-500" colSpan={2}>
                                {m.monthName}
                              </td>
                              <td className="px-2 py-1">
                                {m.status === "scored" || m.status === "kept" ? (
                                  <span className="font-medium text-gray-900">
                                    {m.score.toFixed(2)} pts
                                    {m.overallPercentage !== null && (
                                      <span className="text-gray-500">
                                        {" "}
                                        ({m.overallPercentage.toFixed(1)}%)
                                      </span>
                                    )}
                                    {m.status === "kept" && (
                                      <span className="ml-1 text-slate-500">kept</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-rose-700 capitalize">
                                    {m.status.replace(/_/g, " ")}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-1 text-gray-500" colSpan={2}>
                                {m.detail}
                              </td>
                            </tr>
                          ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
