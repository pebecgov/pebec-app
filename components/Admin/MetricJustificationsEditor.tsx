"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export type JustificationMetricOption = {
  key: string;
  label: string;
  group?: string;
};

type Props = {
  framework: "bfa" | "state";
  year: number;
  metrics: JustificationMetricOption[];
  title?: string;
  description?: string;
};

export default function MetricJustificationsEditor({
  framework,
  year,
  metrics,
  title = "Metric justifications",
  description = "Explain why each metric is scored. Text appears on the public tracker for MDAs and states.",
}: Props) {
  const saved = useQuery(api.metric_justifications.list, { framework, year });
  const saveJustification = useMutation(api.metric_justifications.save);

  const savedByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of saved || []) {
      map.set(row.metricKey, row.justification);
    }
    return map;
  }, [saved]);

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (saved === undefined) return;
    const next: Record<string, string> = {};
    for (const metric of metrics) {
      next[metric.key] = savedByKey.get(metric.key) || "";
    }
    setDrafts(next);
  }, [saved, savedByKey, metrics]);

  const handleSave = async (metric: JustificationMetricOption) => {
    setSavingKey(metric.key);
    try {
      await saveJustification({
        framework,
        year,
        metricKey: metric.key,
        metricLabel: metric.label,
        justification: drafts[metric.key] || "",
      });
      toast.success(`Saved justification for ${metric.label}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save justification");
    } finally {
      setSavingKey(null);
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, JustificationMetricOption[]>();
    for (const metric of metrics) {
      const group = metric.group || "Metrics";
      const list = map.get(group) || [];
      list.push(metric);
      map.set(group, list);
    }
    return Array.from(map.entries());
  }, [metrics]);

  if (saved === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading justifications…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>

      {groups.map(([group, groupMetrics]) => (
        <div key={group} className="space-y-4">
          {groups.length > 1 ? (
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{group}</h4>
          ) : null}
          {groupMetrics.map((metric) => {
            const draft = drafts[metric.key] ?? "";
            const original = savedByKey.get(metric.key) || "";
            const dirty = draft !== original;
            const isSaving = savingKey === metric.key;

            return (
              <div
                key={metric.key}
                className="rounded-lg border border-gray-200 bg-white p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-900">{metric.label}</Label>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">{metric.key}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSave(metric)}
                    disabled={isSaving || !dirty}
                    className="shrink-0"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <Save className="h-4 w-4 mr-1.5" />
                    )}
                    Save
                  </Button>
                </div>
                <Textarea
                  value={draft}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [metric.key]: e.target.value }))
                  }
                  placeholder="Why this metric is measured…"
                  rows={3}
                  className="text-sm"
                />
                {dirty ? (
                  <p className="text-xs text-amber-700">Unsaved changes</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}

      {metrics.length === 0 ? (
        <p className="text-sm text-gray-500">No metrics available for this year yet.</p>
      ) : null}
    </div>
  );
}
