"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BadgeCheck, CircleDashed } from "lucide-react";

type MetricOption = {
  key: string;
  label: string;
};

type Props = {
  year: number;
  scoringPeriod: string;
};

export default function TrackerMetricStatusPanel({ year, scoringPeriod }: Props) {
  const statuses = useQuery(api.scoring_config.getMetricTrackerStatuses, {
    scoringPeriod,
  });
  const othersConfig = useQuery(api.scoring_config.getOthersItems, { year });
  const setStatus = useMutation(api.scoring_config.setMetricTrackerStatus);

  const metrics = useMemo<MetricOption[]>(() => {
    const list: MetricOption[] = [
      { key: "mystery", label: "Mystery Shopping" },
      { key: "sla", label: "SLA Compliance" },
      { key: "reportGov", label: "Report Gov Resolution" },
      { key: "reportSubmission", label: "Monthly Report Submission" },
      { key: "timeliness", label: "Timeliness" },
    ];
    for (const item of othersConfig || []) {
      list.push({
        key: `others:${item.itemId}`,
        label: item.itemName,
      });
    }
    return list;
  }, [othersConfig]);

  const statusByKey = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const row of statuses || []) {
      map.set(row.metricKey, row.fullyScored);
    }
    return map;
  }, [statuses]);

  const handleToggle = async (metric: MetricOption, fullyScored: boolean) => {
    try {
      await setStatus({
        year,
        scoringPeriod,
        metricKey: metric.key,
        metricLabel: metric.label,
        fullyScored,
      });
      toast.success(
        fullyScored
          ? `${metric.label}: marked fully scored on public tracker`
          : `${metric.label}: marked not scored fully on public tracker`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update tracker status");
    }
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
      <div className="flex items-start gap-3 mb-3">
        <CircleDashed className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-amber-950">
            Public tracker — scored fully?
          </h3>
          <p className="text-xs text-amber-900/80 mt-1 max-w-3xl">
            Turn off for metrics that still have work left (e.g. Mystery Shopping while Testing
            Service is unfinished). MDAs will see a <strong>Not scored fully</strong> badge even
            when a running total is shown. Turn on when that metric is ready to treat as final.
          </p>
        </div>
      </div>

      {statuses === undefined || othersConfig === undefined ? (
        <p className="text-xs text-amber-800">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {metrics.map((metric) => {
            // Default: not fully scored (safer for MDAs) until admin turns it on.
            const fullyScored = statusByKey.has(metric.key)
              ? statusByKey.get(metric.key) === true
              : false;
            const hasSavedRow = statusByKey.has(metric.key);

            return (
              <div
                key={metric.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-amber-200/80 bg-white px-3 py-2.5"
              >
                <div className="min-w-0">
                  <Label htmlFor={`tracker-${metric.key}`} className="text-sm font-medium text-gray-900">
                    {metric.label}
                  </Label>
                  <p className="text-[11px] text-gray-500 truncate">
                    {fullyScored ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <BadgeCheck className="h-3 w-3" /> Fully scored
                      </span>
                    ) : (
                      <span className="text-amber-800">Not scored fully</span>
                    )}
                    {!hasSavedRow ? " · default" : ""}
                  </p>
                </div>
                <Switch
                  id={`tracker-${metric.key}`}
                  checked={fullyScored}
                  onCheckedChange={(checked) => handleToggle(metric, checked)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
