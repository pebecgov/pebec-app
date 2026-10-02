"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronUp, Eye, Loader2, PlayCircle, Zap } from "lucide-react";

type Metric = "reportSubmission" | "timeliness" | "reportGov";
type Status = "saved" | "would_save" | "excluded" | "manual_override" | "error";

type Outcome = {
  metric: Metric;
  status: Status;
  previousScore: number | null;
  newScore: number;
  detail: string;
};

type MdaResult = { mdaName: string; onPlatform: boolean; outcomes: Outcome[] };

type RunSummary = {
  dryRun: boolean;
  points: Record<Metric, number>;
  totalMonths: number;
  results: MdaResult[];
  failedChunks: string[];
};

const METRIC_OPTIONS: Array<{ key: Metric; label: string; hint: string }> = [
  { key: "reportSubmission", label: "Monthly Report Submission", hint: "from reform-champion report uploads" },
  { key: "timeliness", label: "Deadline Compliance", hint: "reports submitted by the last Friday of the month" },
  { key: "reportGov", label: "Report Gov Resolution", hint: "from ReportGov ticket resolution and response times" },
];

const STATUS_LABEL: Record<Status, string> = {
  saved: "Saved",
  would_save: "Will save",
  excluded: "Excluded",
  manual_override: "Kept manual",
  error: "Error",
};

const STATUS_CLASS: Record<Status, string> = {
  saved: "bg-green-100 text-green-800",
  would_save: "bg-blue-100 text-blue-800",
  excluded: "bg-gray-200 text-gray-700",
  manual_override: "bg-amber-100 text-amber-800",
  error: "bg-rose-100 text-rose-800",
};

const CHUNK_SIZE = 10;

type Props = {
  scoringPeriod: string;
  mdaNames: string[];
};

export default function BulkEfficiencyCard({ scoringPeriod, mdaNames }: Props) {
  const run = useMutation(api.bulkEfficiencyScoring.runAutomaticEfficiencyScoring);

  const [selected, setSelected] = useState<Set<Metric>>(
    () => new Set<Metric>(["reportSubmission", "timeliness", "reportGov"]),
  );
  const [overwriteManual, setOverwriteManual] = useState(false);
  const [running, setRunning] = useState<"dry" | "live" | null>(null);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const uniqueMdaNames = useMemo(
    () => Array.from(new Set(mdaNames.map((n) => n.trim()).filter(Boolean))),
    [mdaNames],
  );

  const toggleMetric = (metric: Metric) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(metric)) next.delete(metric);
      else next.add(metric);
      return next;
    });
  };

  const execute = async (dryRun: boolean) => {
    if (selected.size === 0) {
      toast.error("Select at least one metric");
      return;
    }
    if (uniqueMdaNames.length === 0) {
      toast.error("No MDAs to process");
      return;
    }

    setRunning(dryRun ? "dry" : "live");
    setProgress(0);
    setSummary(null);
    setShowDetails(false);

    const metrics = Array.from(selected);
    const results: MdaResult[] = [];
    const failedChunks: string[] = [];
    let points: Record<Metric, number> | null = null;
    let totalMonths = 0;

    const chunks: string[][] = [];
    for (let i = 0; i < uniqueMdaNames.length; i += CHUNK_SIZE) {
      chunks.push(uniqueMdaNames.slice(i, i + CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const res = await run({ scoringPeriod, mdaNames: chunk, metrics, dryRun, overwriteManual });
        points = res.points;
        totalMonths = res.totalMonths;
        results.push(...res.results);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        failedChunks.push(`${chunk[0]} … ${chunk[chunk.length - 1]}: ${message}`);
      }
      setProgress(Math.round(((i + 1) / chunks.length) * 100));
    }

    setSummary({
      dryRun,
      points: points ?? { reportSubmission: 0, timeliness: 0, reportGov: 0 },
      totalMonths,
      results,
      failedChunks,
    });
    setRunning(null);

    const written = results.flatMap((r) => r.outcomes).filter((o) => o.status === "saved").length;
    if (failedChunks.length > 0) {
      toast.error(`Finished with ${failedChunks.length} failed batch${failedChunks.length > 1 ? "es" : ""}`);
    } else if (dryRun) {
      toast.success(`Preview ready for ${results.length} MDAs — nothing was saved`);
    } else {
      toast.success(`Saved ${written} metric score${written === 1 ? "" : "s"} across ${results.length} MDAs`);
    }
  };

  const counts = useMemo(() => {
    if (!summary) return null;
    const all = summary.results.flatMap((r) => r.outcomes);
    const by = (s: Status) => all.filter((o) => o.status === s).length;
    return {
      saved: by("saved"),
      wouldSave: by("would_save"),
      excluded: by("excluded"),
      manual: by("manual_override"),
      offPlatform: summary.results.filter((r) => !r.onPlatform).length,
    };
  }, [summary]);

  const selectedOptions = METRIC_OPTIONS.filter((m) => selected.has(m.key));

  return (
    <Card className="w-full border-dashed border-emerald-300 bg-emerald-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-700" />
          Run automatic metrics for all MDAs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-gray-600">
          Computes and saves the data-driven Efficiency metrics for all{" "}
          <strong>{uniqueMdaNames.length} MDAs</strong> in <strong>{scoringPeriod}</strong>, exactly as if you
          opened each MDA and pressed Save. SLA and Mystery Shopping need manual input and are not included.
          Use <em>Preview</em> first to see the scores without saving.
        </p>

        <div className="grid gap-2 sm:grid-cols-3">
          {METRIC_OPTIONS.map((m) => (
            <label
              key={m.key}
              className={`flex items-start gap-2 rounded-md border bg-white p-2.5 text-xs cursor-pointer ${
                selected.has(m.key) ? "border-emerald-400" : "border-gray-200"
              }`}
            >
              <Checkbox
                checked={selected.has(m.key)}
                onCheckedChange={() => toggleMetric(m.key)}
                disabled={running !== null}
                className="mt-0.5"
              />
              <span>
                <span className="block font-medium text-gray-900">{m.label}</span>
                <span className="block text-[11px] text-gray-500">{m.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-700">
          <Checkbox
            checked={overwriteManual}
            onCheckedChange={(v) => setOverwriteManual(v === true)}
            disabled={running !== null}
          />
          Also replace MDAs set to &ldquo;Skip (0 points)&rdquo; or entered manually
          <span className="text-gray-400">(off by default — those are left untouched)</span>
        </label>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
            disabled={running !== null || selected.size === 0}
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
            className="flex-1 bg-emerald-700 hover:bg-emerald-800"
            disabled={running !== null || selected.size === 0}
            onClick={() => execute(false)}
          >
            {running === "live" ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running…
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4 mr-2" /> Run &amp; save for all MDAs
              </>
            )}
          </Button>
        </div>

        {running !== null && (
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-[11px] text-gray-500">{progress}% — processing in batches of {CHUNK_SIZE}</p>
          </div>
        )}

        {summary && counts && (
          <div className="rounded-md border bg-white p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded px-2 py-0.5 font-medium ${summary.dryRun ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}>
                {summary.dryRun ? "Preview" : "Saved"}
              </span>
              <span className="text-gray-700">
                {summary.results.length} MDAs · {summary.totalMonths} months in period
              </span>
              <span className="text-gray-400">·</span>
              {summary.dryRun ? (
                <span className="text-gray-700">{counts.wouldSave} scores would be written</span>
              ) : (
                <span className="text-gray-700">{counts.saved} scores written</span>
              )}
              {counts.manual > 0 && <span className="text-amber-700">{counts.manual} kept manual/skip</span>}
              {counts.excluded > 0 && <span className="text-gray-600">{counts.excluded} excluded</span>}
              {counts.offPlatform > 0 && <span className="text-gray-600">{counts.offPlatform} not on platform</span>}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
              {selectedOptions.map((m) => (
                <span key={m.key}>
                  {m.label}: max {summary.points[m.key]} pts
                </span>
              ))}
            </div>

            {summary.failedChunks.length > 0 && (
              <div className="rounded border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-800">
                <p className="font-medium mb-1">Some batches failed and were not saved:</p>
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
              className="flex items-center gap-1 text-xs font-medium text-emerald-800 hover:underline"
            >
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showDetails ? "Hide" : "Show"} per-MDA results
            </button>

            {showDetails && (
              <div className="max-h-96 overflow-auto rounded border">
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">MDA</th>
                      {selectedOptions.map((m) => (
                        <th key={m.key} className="px-2 py-1.5 font-medium">
                          {m.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.results.map((r) => (
                      <tr key={r.mdaName} className="border-t align-top">
                        <td className="px-2 py-1.5">
                          <span className="font-medium text-gray-900">{r.mdaName}</span>
                          {!r.onPlatform && (
                            <span className="ml-1 rounded bg-gray-100 px-1 text-[10px] text-gray-600">not on platform</span>
                          )}
                        </td>
                        {selectedOptions.map((m) => {
                          const o = r.outcomes.find((x) => x.metric === m.key);
                          if (!o) return <td key={m.key} className="px-2 py-1.5 text-gray-400">—</td>;
                          return (
                            <td key={m.key} className="px-2 py-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CLASS[o.status]}`}>
                                  {STATUS_LABEL[o.status]}
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {o.newScore.toFixed(2)}/{summary.points[m.key]}
                                </span>
                                {o.previousScore !== null && o.previousScore !== o.newScore && (
                                  <span className="text-gray-400 line-through">{o.previousScore.toFixed(2)}</span>
                                )}
                              </div>
                              <div className="text-gray-500">{o.detail}</div>
                            </td>
                          );
                        })}
                      </tr>
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
