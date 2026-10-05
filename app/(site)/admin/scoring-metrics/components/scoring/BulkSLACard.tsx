"use client";

import { Fragment, useMemo, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronUp, Eye, Loader2, PlayCircle, Scale } from "lucide-react";

type MonthOutcome = {
  monthKey: string;
  monthName: string;
  status: "scored" | "failed" | "no_report" | "no_file" | "unsupported_format";
  score: number;
  overallPercentage: number | null;
  validRows?: number;
  totalRows?: number;
  detail: string;
};

type MdaResult = {
  mdaName: string;
  status: "saved" | "would_save" | "excluded" | "kept_existing" | "error";
  previousScore: number | null;
  newScore: number;
  percentage: number;
  monthsWithData: number;
  monthsScored: number;
  monthsFailed: number;
  monthsMissing: number;
  detail: string;
  months: MonthOutcome[];
};

type RunSummary = {
  dryRun: boolean;
  slaPoints: number;
  pointsPerMonth: number;
  totalMonths: number;
  results: MdaResult[];
  failedChunks: string[];
};

const STATUS_LABEL: Record<MdaResult["status"], string> = {
  saved: "Saved",
  would_save: "Will save",
  excluded: "Excluded",
  kept_existing: "Kept existing",
  error: "Error",
};

const STATUS_CLASS: Record<MdaResult["status"], string> = {
  saved: "bg-green-100 text-green-800",
  would_save: "bg-blue-100 text-blue-800",
  excluded: "bg-gray-200 text-gray-700",
  kept_existing: "bg-amber-100 text-amber-800",
  error: "bg-rose-100 text-rose-800",
};

const CHUNK_SIZE = 3;

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
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedMda, setExpandedMda] = useState<string | null>(null);

  const uniqueMdaNames = useMemo(
    () => Array.from(new Set(mdaNames.map((n) => n.trim()).filter(Boolean))),
    [mdaNames],
  );

  const execute = async (dryRun: boolean) => {
    if (uniqueMdaNames.length === 0) {
      toast.error("No MDAs to process");
      return;
    }

    setRunning(dryRun ? "dry" : "live");
    setProgress(0);
    setSummary(null);
    setShowDetails(false);
    setExpandedMda(null);

    const results: MdaResult[] = [];
    const failedChunks: string[] = [];
    let slaPoints = context?.slaPoints ?? 0;
    let pointsPerMonth = context?.pointsPerMonth ?? 0;
    let totalMonths = context?.totalMonths ?? 0;

    const chunks: string[][] = [];
    for (let i = 0; i < uniqueMdaNames.length; i += CHUNK_SIZE) {
      chunks.push(uniqueMdaNames.slice(i, i + CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      try {
        const res = await runChunk({
          scoringPeriod,
          mdaNames: chunk,
          dryRun,
          overwriteExisting,
        });
        slaPoints = res.slaPoints;
        pointsPerMonth = res.pointsPerMonth;
        totalMonths = res.totalMonths;
        results.push(...res.results);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        failedChunks.push(`${chunk[0]} … ${chunk[chunk.length - 1]}: ${message}`);
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

    setSummary({ dryRun, slaPoints, pointsPerMonth, totalMonths, results, failedChunks });
    setRunning(null);

    if (failedChunks.length > 0) {
      toast.error(`Finished with ${failedChunks.length} failed batch${failedChunks.length > 1 ? "es" : ""}`);
    } else if (dryRun) {
      toast.success(`SLA preview ready for ${results.length} MDAs — nothing was saved`);
    } else {
      toast.success(`Saved SLA scores for ${savedCount} MDA${savedCount === 1 ? "" : "s"}`);
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
      errors: by("error"),
      monthsFailed: summary.results.reduce((n, r) => n + r.monthsFailed, 0),
    };
  }, [summary]);

  return (
    <Card className="w-full border-dashed border-sky-300 bg-sky-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Scale className="w-4 h-4 text-sky-700" />
          Run Service Level Agreement for all MDAs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-gray-600">
          Scores SLA from reform-champion Excel uploads for all{" "}
          <strong>{uniqueMdaNames.length} MDAs</strong> in <strong>{scoringPeriod}</strong>
          {context ? (
            <>
              {" "}
              ({context.totalMonths} months · max {context.slaPoints} pts ·{" "}
              {context.pointsPerMonth.toFixed(2)} pts/month)
            </>
          ) : null}
          , the same way as Configure Monthly SLA → Auto-Process. Pending completions (NIL / N/A / Not yet
          approved) get half credit while the expected timeline is still open. Files with at least one scorable
          row are accepted (no 20% minimum). Failures show plain-language reasons.
        </p>

        <label className="flex items-center gap-2 text-xs text-gray-700">
          <Checkbox
            checked={overwriteExisting}
            onCheckedChange={(v) => setOverwriteExisting(v === true)}
            disabled={running !== null}
          />
          Also replace MDAs that already have a saved SLA score
          <span className="text-gray-400">(off by default — those are left untouched)</span>
        </label>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 border-sky-300 text-sky-800 hover:bg-sky-100"
            disabled={running !== null}
            onClick={() => execute(true)}
          >
            {running === "dry" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Previewing…
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" /> Preview (no save)
              </>
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            className="flex-1 bg-sky-700 hover:bg-sky-800"
            disabled={running !== null}
            onClick={() => execute(false)}
          >
            {running === "live" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running…
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 mr-2" /> Run &amp; save SLA for all MDAs
              </>
            )}
          </Button>
        </div>

        {running !== null && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-[11px] text-gray-500">
              {progress}% — processing in batches of {CHUNK_SIZE} (reads each monthly Excel)
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
              </span>
              <span className="text-gray-700">
                {summary.results.length} MDAs · max {summary.slaPoints} pts
              </span>
              {summary.dryRun ? (
                <span className="text-gray-700">{counts.wouldSave} would be written</span>
              ) : (
                <span className="text-gray-700">{counts.saved} written</span>
              )}
              {counts.kept > 0 && <span className="text-amber-700">{counts.kept} kept existing</span>}
              {counts.excluded > 0 && <span className="text-gray-600">{counts.excluded} excluded</span>}
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
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CLASS[r.status]}`}>
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
                            {r.monthsScored} ok · {r.monthsFailed} fail · {r.monthsMissing} missing
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
                            <tr key={`${r.mdaName}-${m.monthKey}`} className="border-t bg-sky-50/50 align-top">
                              <td className="px-2 py-1 pl-6 text-gray-500" colSpan={2}>
                                {m.monthName}
                              </td>
                              <td className="px-2 py-1">
                                {m.status === "scored" ? (
                                  <span className="font-medium text-gray-900">
                                    {m.score.toFixed(2)} pts
                                    {m.overallPercentage !== null && (
                                      <span className="text-gray-500">
                                        {" "}
                                        ({m.overallPercentage.toFixed(1)}%)
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-rose-700 capitalize">{m.status.replace(/_/g, " ")}</span>
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
