"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { mdasList } from "@/components/mdaList";
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
import { SCALE_1_10_OPTIONS, YES_NO_OPTIONS } from "@/app/(site)/admin/scoring-metrics/utils/constants";

type MatrixMetric = "others" | "mystery";
type CellMap = Record<string, Record<string, string>>;

function cellKey(mdaName: string, colId: string): string {
  return `${mdaName}::${colId}`;
}

type Props = {
  scoringPeriod: string;
  year: number;
};

export default function MdaScoringMatrix({ scoringPeriod, year }: Props) {
  const [metric, setMetric] = useState<MatrixMetric>("others");
  const [mysteryType, setMysteryType] = useState("");
  const [draft, setDraft] = useState<CellMap>({});
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [fillColId, setFillColId] = useState("");
  const [fillValue, setFillValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const othersConfig = useQuery(api.scoring_config.getOthersItems, { year });
  const mysteryConfig = useQuery(
    api.scoring_config.getMysteryShoppingTypesWithQuestions,
    { year }
  );
  const othersRows = useQuery(
    api.mda_scoring.getAllOthersDataForPeriod,
    metric === "others" ? { scoringPeriod } : "skip"
  );
  const mysteryRows = useQuery(
    api.mda_scoring.getAllMysteryDataForPeriod,
    metric === "mystery" ? { scoringPeriod } : "skip"
  );

  const bulkSaveOthers = useMutation(api.mda_scoring.bulkSaveOthersMatrixCells);
  const bulkSaveMystery = useMutation(api.mda_scoring.bulkSaveMysteryMatrixCells);

  const mdaRows = useMemo(
    () =>
      [...mdasList].sort((a, b) =>
        (a.abbreviation || a.name).localeCompare(b.abbreviation || b.name)
      ),
    []
  );

  const columns = useMemo(() => {
    if (metric === "others") {
      return (othersConfig || []).map((item) => ({
        id: item.itemId,
        label: item.itemName,
        answerType: (item.answerType || "yes_no") as "yes_no" | "scale_1_10",
        weight: item.weight,
      }));
    }
    const typeObj = (mysteryConfig || []).find(
      (t) => (t.typeId || t.typeName) === mysteryType
    );
    return (typeObj?.questions || []).map((q) => ({
      id: q.questionId,
      label: q.questionText,
      answerType: (q.answerType || "yes_no") as "yes_no" | "scale_1_10",
      weight: q.weight,
    }));
  }, [metric, othersConfig, mysteryConfig, mysteryType]);

  useEffect(() => {
    if (metric !== "mystery") return;
    if (!mysteryConfig || mysteryConfig.length === 0) return;
    const stillValid = mysteryConfig.some(
      (t) => (t.typeId || t.typeName) === mysteryType
    );
    if (!stillValid) {
      setMysteryType(mysteryConfig[0]!.typeId || mysteryConfig[0]!.typeName);
    }
  }, [metric, mysteryConfig, mysteryType]);

  // Hydrate draft from server
  useEffect(() => {
    if (metric === "others" && othersRows === undefined) return;
    if (metric === "mystery" && mysteryRows === undefined) return;
    if (metric === "mystery" && !mysteryType) return;
    if (metric === "others" && othersConfig === undefined) return;
    if (metric === "mystery" && mysteryConfig === undefined) return;

    const cols =
      metric === "others"
        ? (othersConfig || []).map((item) => ({
            id: item.itemId,
            answerType: (item.answerType || "yes_no") as "yes_no" | "scale_1_10",
          }))
        : (
            (mysteryConfig || []).find((t) => (t.typeId || t.typeName) === mysteryType)
              ?.questions || []
          ).map((q) => ({
            id: q.questionId,
            answerType: (q.answerType || "yes_no") as "yes_no" | "scale_1_10",
          }));

    const next: CellMap = {};
    for (const mda of mdaRows) {
      next[mda.name] = {};
    }

    if (metric === "others") {
      for (const row of othersRows || []) {
        if (!next[row.mdaName]) next[row.mdaName] = {};
        const values = (row.values || {}) as Record<string, boolean | number>;
        for (const col of cols) {
          const raw = values[col.id];
          if (raw === undefined || raw === null) continue;
          if (col.answerType === "yes_no") {
            next[row.mdaName]![col.id] = raw === true ? "yes" : "no";
          } else {
            next[row.mdaName]![col.id] = String(raw);
          }
        }
      }
    } else {
      for (const row of mysteryRows || []) {
        if (row.mysteryType !== mysteryType) continue;
        if (!next[row.mdaName]) next[row.mdaName] = {};
        const ratings = (row.ratings || {}) as Record<string, number>;
        for (const col of cols) {
          if (ratings[col.id] === undefined) continue;
          next[row.mdaName]![col.id] = String(ratings[col.id]);
        }
      }
    }

    setDraft(next);
    setDirtyKeys(new Set());
  }, [metric, mysteryType, othersRows, mysteryRows, mdaRows, othersConfig, mysteryConfig]);

  const setCell = useCallback((mdaName: string, colId: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [mdaName]: {
        ...(prev[mdaName] || {}),
        [colId]: value,
      },
    }));
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      next.add(cellKey(mdaName, colId));
      return next;
    });
  }, []);

  const isMdaComplete = useCallback(
    (mdaName: string) => {
      if (columns.length === 0) return false;
      const row = draft[mdaName] || {};
      return columns.every((col) => Boolean(row[col.id]));
    },
    [draft, columns]
  );

  const filteredMdas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mdaRows.filter((mda) => {
      if (
        q &&
        !mda.name.toLowerCase().includes(q) &&
        !(mda.abbreviation || "").toLowerCase().includes(q)
      ) {
        return false;
      }
      if (showIncompleteOnly && isMdaComplete(mda.name)) return false;
      return true;
    });
  }, [mdaRows, search, showIncompleteOnly, isMdaComplete]);

  const completedCount = useMemo(
    () => mdaRows.filter((mda) => isMdaComplete(mda.name)).length,
    [mdaRows, isMdaComplete]
  );

  const filledCellCount = useMemo(() => {
    if (columns.length === 0) return 0;
    let count = 0;
    for (const mda of mdaRows) {
      const row = draft[mda.name] || {};
      for (const col of columns) {
        if (row[col.id]) count += 1;
      }
    }
    return count;
  }, [draft, mdaRows, columns]);

  const totalCellCount = mdaRows.length * columns.length;
  const progressPct =
    totalCellCount > 0 ? Math.round((filledCellCount / totalCellCount) * 100) : 0;

  const fillOptions = useMemo(() => {
    const col = columns.find((c) => c.id === fillColId);
    if (!col) return [];
    if (col.answerType === "yes_no") {
      return YES_NO_OPTIONS.map((o) => ({
        value: o.value === 1 ? "yes" : "no",
        label: o.label,
      }));
    }
    return SCALE_1_10_OPTIONS.map((o) => ({
      value: String(o.value),
      label: o.label,
    }));
  }, [columns, fillColId]);

  const applyColumnFill = () => {
    if (!fillColId || !fillValue) {
      toast.error("Pick a column and a value to fill");
      return;
    }
    setDraft((prev) => {
      const next = { ...prev };
      for (const mda of filteredMdas) {
        next[mda.name] = {
          ...(next[mda.name] || {}),
          [fillColId]: fillValue,
        };
      }
      return next;
    });
    setDirtyKeys((prev) => {
      const next = new Set(prev);
      for (const mda of filteredMdas) {
        next.add(cellKey(mda.name, fillColId));
      }
      return next;
    });
    toast.success(
      `Set column for ${filteredMdas.length} visible MDA${filteredMdas.length === 1 ? "" : "s"}`
    );
  };

  const handleSaveAll = async () => {
    if (dirtyKeys.size === 0) {
      toast.message("Nothing to save — no changes yet");
      return;
    }
    if (metric === "mystery" && !mysteryType) {
      toast.error("Pick a mystery shopping type first");
      return;
    }

    const cells: Array<{ mdaName: string; colId: string; value: string }> = [];
    for (const key of dirtyKeys) {
      const [mdaName, colId] = key.split("::");
      if (!mdaName || !colId) continue;
      const value = draft[mdaName]?.[colId] || "";
      if (!value) continue;
      cells.push({ mdaName, colId, value });
    }

    if (cells.length === 0) {
      toast.message("Nothing to save — empty cells are skipped");
      return;
    }

    setIsSaving(true);
    try {
      if (metric === "others") {
        const result = await bulkSaveOthers({
          scoringPeriod,
          year,
          cells: cells.map((c) => ({
            mdaName: c.mdaName,
            itemId: c.colId,
            value: c.value,
          })),
        });
        setDirtyKeys(new Set());
        toast.success(
          `Saved ${result.saved} cell${result.saved === 1 ? "" : "s"} across ${result.mdasTouched} MDA${result.mdasTouched === 1 ? "" : "s"}`
        );
      } else {
        const result = await bulkSaveMystery({
          scoringPeriod,
          year,
          mysteryType,
          cells: cells.map((c) => ({
            mdaName: c.mdaName,
            questionId: c.colId,
            value: c.value,
          })),
        });
        setDirtyKeys(new Set());
        toast.success(
          `Saved ${result.saved} cell${result.saved === 1 ? "" : "s"} across ${result.mdasTouched} MDA${result.mdasTouched === 1 ? "" : "s"}`
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save matrix");
    } finally {
      setIsSaving(false);
    }
  };

  const ready =
    metric === "others"
      ? othersConfig !== undefined && othersRows !== undefined
      : mysteryConfig !== undefined &&
        mysteryRows !== undefined &&
        Boolean(mysteryType);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gradient-to-r from-[#006B3F]/5 to-white px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-[#006B3F]" />
              Score by metric (matrix)
            </h3>
            <p className="text-sm text-gray-600 mt-1 max-w-2xl">
              Pick Others or Mystery Shopping, then score every MDA in one grid — same
              workflow as state scoring. Use <span className="font-medium">Save all</span> when ready.
            </p>
          </div>
          <div className="min-w-[220px]">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">
                {completedCount}/{mdaRows.length} MDAs complete
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
          <Label className="text-xs text-gray-500">Period</Label>
          <p className="mt-1.5 text-sm font-medium text-gray-900">{scoringPeriod}</p>
        </div>

        <div>
          <Label className="text-xs text-gray-500">Metric</Label>
          <Select
            value={metric}
            onValueChange={(v) => setMetric(v as MatrixMetric)}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="others">Other metrics</SelectItem>
              <SelectItem value="mystery">Mystery shopping</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {metric === "mystery" && (
          <div>
            <Label className="text-xs text-gray-500">Mystery type</Label>
            <Select value={mysteryType} onValueChange={setMysteryType}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Choose type…" />
              </SelectTrigger>
              <SelectContent>
                {(mysteryConfig || []).map((t) => (
                  <SelectItem key={t.typeId || t.typeName} value={t.typeId || t.typeName}>
                    {t.typeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="text-xs text-gray-500">Find MDA</Label>
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

      {columns.length > 0 && (
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
              <Select value={fillColId} onValueChange={setFillColId}>
                <SelectTrigger className="mt-1.5 w-[220px]">
                  <SelectValue placeholder="Column…" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.label}
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
                disabled={!fillColId}
              >
                <SelectTrigger className="mt-1.5 w-[160px]">
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

      {!ready ? (
        <div className="p-12 flex items-center justify-center text-gray-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading matrix…
        </div>
      ) : columns.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <Grid3X3 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-700">
            {metric === "mystery"
              ? "Choose a mystery shopping type (or configure questions first)"
              : "No other metrics configured for this year"}
          </p>
        </div>
      ) : (
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full text-sm border-collapse min-w-[720px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[#006B3F] text-white">
                <th className="sticky left-0 z-30 bg-[#006B3F] px-4 py-3 text-left font-semibold min-w-[200px]">
                  MDA
                </th>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className="px-3 py-3 text-left font-semibold min-w-[160px] max-w-[220px]"
                  >
                    <span className="line-clamp-2">{col.label}</span>
                    <span className="block text-[10px] font-normal text-white/80 mt-0.5">
                      {col.answerType === "yes_no" ? "Yes / No" : "Range 0–10"} · {col.weight} pts
                    </span>
                  </th>
                ))}
                <th className="px-3 py-3 text-left font-semibold w-24">Done</th>
              </tr>
            </thead>
            <tbody>
              {filteredMdas.map((mda, index) => {
                const complete = isMdaComplete(mda.name);
                return (
                  <tr
                    key={mda.name}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50/80"}
                  >
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2 font-medium text-gray-900 border-r border-gray-100 whitespace-nowrap">
                      <span className="text-[#006B3F] font-semibold mr-1.5">
                        {mda.abbreviation}
                      </span>
                      <span className="text-gray-600 text-xs">{mda.name}</span>
                    </td>
                    {columns.map((col) => {
                      const value = draft[mda.name]?.[col.id] || "";
                      const dirty = dirtyKeys.has(cellKey(mda.name, col.id));
                      const options =
                        col.answerType === "yes_no"
                          ? YES_NO_OPTIONS.map((o) => ({
                              value: o.value === 1 ? "yes" : "no",
                              label: o.label,
                            }))
                          : SCALE_1_10_OPTIONS.map((o) => ({
                              value: String(o.value),
                              label: o.label,
                            }));
                      return (
                        <td key={col.id} className="px-2 py-1.5">
                          <Select
                            value={value || undefined}
                            onValueChange={(v) => setCell(mda.name, col.id, v)}
                          >
                            <SelectTrigger
                              className={`h-9 text-xs ${
                                dirty
                                  ? "border-amber-400 bg-amber-50"
                                  : value
                                    ? "border-emerald-200"
                                    : ""
                              }`}
                            >
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {options.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      {complete ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-300 inline" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
