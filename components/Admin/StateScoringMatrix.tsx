"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getIndicatorsForYear } from "@/convex/config/indicators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  Grid3X3,
  Loader2,
  Save,
  Search,
} from "lucide-react";

const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "Federal Capital Territory",
];

type CellMap = Record<string, Record<string, string>>;

function cellKey(state: string, subIndicator: string): string {
  return `${state}::${subIndicator}`;
}

export default function StateScoringMatrix() {
  const [year, setYear] = useState(2026);
  const [indicator, setIndicator] = useState("");
  const [draft, setDraft] = useState<CellMap>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [fillSubIndicator, setFillSubIndicator] = useState("");
  const [fillValue, setFillValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const yearIndicators = useMemo(() => getIndicatorsForYear(year), [year]);

  useEffect(() => {
    if (indicator && !(indicator in yearIndicators)) {
      setIndicator("");
    }
  }, [indicator, yearIndicators]);

  const existingScores = useQuery(
    api.saveStateScore.getStateScores,
    indicator ? { indicator, year } : "skip"
  );

  const bulkSave = useMutation(api.saveStateScore.bulkSaveStateScoreCells);

  const subIndicators = useMemo(() => {
    if (!indicator || !yearIndicators[indicator]) return [];
    return Object.entries(yearIndicators[indicator].subIndicators).map(([key, config]) => ({
      key,
      label: config.label,
      options: config.options,
    }));
  }, [indicator, yearIndicators]);

  // Hydrate draft from server whenever scores load / indicator changes.
  useEffect(() => {
    if (!indicator || existingScores === undefined) return;

    const next: CellMap = {};
    for (const state of NIGERIAN_STATES) {
      next[state] = {};
    }
    for (const row of existingScores) {
      if (row.indicator !== indicator) continue;
      if (!next[row.state]) next[row.state] = {};
      next[row.state]![row.subIndicator] = row.value || "";
    }
    setDraft(next);
    setDirtyKeys(new Set());
  }, [existingScores, indicator]);

  const setCell = useCallback((state: string, subKey: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [state]: {
        ...(prev[state] || {}),
        [subKey]: value,
      },
    }));
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      next.add(cellKey(state, subKey));
      return next;
    });
  }, []);

  const isStateComplete = useCallback(
    (state: string) => {
      if (subIndicators.length === 0) return false;
      const row = draft[state] || {};
      return subIndicators.every((sub) => Boolean(row[sub.key]));
    },
    [draft, subIndicators]
  );

  const filteredStates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return NIGERIAN_STATES.filter((state) => {
      if (q && !state.toLowerCase().includes(q)) return false;
      if (showIncompleteOnly && isStateComplete(state)) return false;
      return true;
    });
  }, [search, showIncompleteOnly, isStateComplete]);

  const completedCount = useMemo(
    () => NIGERIAN_STATES.filter((state) => isStateComplete(state)).length,
    [isStateComplete]
  );

  const filledCellCount = useMemo(() => {
    if (!indicator || subIndicators.length === 0) return 0;
    let count = 0;
    for (const state of NIGERIAN_STATES) {
      const row = draft[state] || {};
      for (const sub of subIndicators) {
        if (row[sub.key]) count += 1;
      }
    }
    return count;
  }, [draft, indicator, subIndicators]);

  const totalCellCount = NIGERIAN_STATES.length * subIndicators.length;
  const progressPct =
    totalCellCount > 0 ? Math.round((filledCellCount / totalCellCount) * 100) : 0;

  const applyColumnFill = () => {
    if (!fillSubIndicator || !fillValue) {
      toast.error("Pick a sub-indicator and a value to fill");
      return;
    }

    setDraft((prev) => {
      const next = { ...prev };
      for (const state of filteredStates) {
        next[state] = {
          ...(next[state] || {}),
          [fillSubIndicator]: fillValue,
        };
      }
      return next;
    });
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      for (const state of filteredStates) {
        next.add(cellKey(state, fillSubIndicator));
      }
      return next;
    });
    toast.success(
      `Set column for ${filteredStates.length} visible state${filteredStates.length === 1 ? "" : "s"}`
    );
  };

  const handleSaveAll = async () => {
    if (!indicator) return;
    if (dirtyKeys.size === 0) {
      toast.message("Nothing to save — no changes yet");
      return;
    }

    const cells: Array<{ state: string; subIndicator: string; value: string }> = [];
    for (const key of dirtyKeys) {
      const [state, subIndicator] = key.split("::");
      if (!state || !subIndicator) continue;
      const value = draft[state]?.[subIndicator] || "";
      if (!value) continue;
      cells.push({ state, subIndicator, value });
    }

    if (cells.length === 0) {
      toast.message("Nothing to save — empty cells are skipped");
      return;
    }

    setIsSaving(true);
    try {
      const result = await bulkSave({ year, indicator, cells });
      setDirtyKeys(new Set());
      toast.success(
        `Saved ${result.saved} cell${result.saved === 1 ? "" : "s"} (${result.inserted} new, ${result.updated} updated)`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save matrix");
    } finally {
      setIsSaving(false);
    }
  };

  const fillOptions =
    subIndicators.find((s) => s.key === fillSubIndicator)?.options ?? [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#006B3F]/5 to-white px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-[#006B3F]" />
              Score by indicator (matrix)
            </h3>
            <p className="text-sm text-gray-600 mt-1 max-w-2xl">
              Pick one indicator, then score every state in one grid. Different values per
              state are fine. Use <span className="font-medium">Save all</span> when ready.
            </p>
          </div>
          <div className="min-w-[220px]">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">
                {completedCount}/{NIGERIAN_STATES.length} states complete
              </span>
              <span className="font-medium text-gray-900">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              {filledCellCount}/{totalCellCount || 0} cells filled
              {dirtyKeys.size > 0 ? ` · ${dirtyKeys.size} unsaved` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 border-b border-gray-100">
        <div>
          <Label className="text-xs text-gray-500">Assessment year</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2026, 2025, 2024, 2023, 2022].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-1 xl:col-span-2">
          <Label className="text-xs text-gray-500">Indicator</Label>
          <Select value={indicator} onValueChange={setIndicator}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Choose an indicator…" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(yearIndicators).map(([id, config]) => (
                <SelectItem key={id} value={id}>
                  {config.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs text-gray-500">Find state</Label>
          <div className="relative mt-1.5">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {indicator && (
        <div className="px-5 py-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between border-b border-gray-100 bg-gray-50/60">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showIncompleteOnly}
                onChange={(e) => setShowIncompleteOnly(e.target.checked)}
                className="rounded border-gray-300"
              />
              Incomplete only
            </label>

            <div>
              <Label className="text-xs text-gray-500">Fill column (visible rows)</Label>
              <Select value={fillSubIndicator} onValueChange={setFillSubIndicator}>
                <SelectTrigger className="mt-1.5 w-[220px]">
                  <SelectValue placeholder="Sub-indicator…" />
                </SelectTrigger>
                <SelectContent>
                  {subIndicators.map((sub) => (
                    <SelectItem key={sub.key} value={sub.key}>
                      {sub.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-gray-500">Value</Label>
              <Select
                value={fillValue}
                onValueChange={setFillValue}
                disabled={!fillSubIndicator}
              >
                <SelectTrigger className="mt-1.5 w-[200px]">
                  <SelectValue placeholder="Score…" />
                </SelectTrigger>
                <SelectContent>
                  {fillOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="button" variant="outline" onClick={applyColumnFill}>
              Apply to visible
            </Button>
          </div>

          <Button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving || dirtyKeys.size === 0}
            className="bg-[#006B3F] hover:bg-[#005432] text-white"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save all{dirtyKeys.size > 0 ? ` (${dirtyKeys.size})` : ""}
          </Button>
        </div>
      )}

      {!indicator ? (
        <div className="p-12 text-center text-gray-500">
          <Grid3X3 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-700">Choose an indicator to open the matrix</p>
          <p className="text-sm mt-1">
            You’ll see all 37 states as rows and that indicator’s questions as columns.
          </p>
        </div>
      ) : existingScores === undefined ? (
        <div className="p-12 flex items-center justify-center text-gray-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading scores…
        </div>
      ) : (
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-sm border-collapse min-w-[720px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[#006B3F] text-white">
                <th className="sticky left-0 z-30 bg-[#006B3F] px-4 py-3 text-left font-semibold min-w-[180px]">
                  State
                </th>
                {subIndicators.map((sub) => (
                  <th
                    key={sub.key}
                    className="px-3 py-3 text-left font-semibold min-w-[200px] max-w-[260px]"
                  >
                    <span className="line-clamp-2">{sub.label}</span>
                  </th>
                ))}
                <th className="px-3 py-3 text-left font-semibold w-24">Done</th>
              </tr>
            </thead>
            <tbody>
              {filteredStates.map((state, index) => {
                const complete = isStateComplete(state);
                return (
                  <tr
                    key={state}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50/80"}
                  >
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2 font-medium text-gray-900 border-r border-gray-100 whitespace-nowrap">
                      {state}
                    </td>
                    {subIndicators.map((sub) => {
                      const value = draft[state]?.[sub.key] || "";
                      const dirty = dirtyKeys.has(cellKey(state, sub.key));
                      return (
                        <td key={sub.key} className="px-2 py-1.5">
                          <Select
                            value={value || undefined}
                            onValueChange={(v) => setCell(state, sub.key, v)}
                          >
                            <SelectTrigger
                              className={`h-9 text-xs ${
                                dirty
                                  ? "border-amber-400 bg-amber-50"
                                  : value
                                    ? "border-emerald-200 bg-emerald-50/40"
                                    : "border-gray-200"
                              }`}
                            >
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {sub.options.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2">
                      {complete ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-300" />
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredStates.length === 0 && (
                <tr>
                  <td
                    colSpan={subIndicators.length + 2}
                    className="px-4 py-10 text-center text-gray-500"
                  >
                    No states match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
