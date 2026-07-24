// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Search, MapPin, Building2 } from "lucide-react";

function gradeBadgeClass(grade: string) {
  switch (grade) {
    case "A":
      return "bg-emerald-100 text-emerald-800";
    case "B":
      return "bg-green-100 text-green-800";
    case "C":
      return "bg-amber-100 text-amber-800";
    case "D":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-red-100 text-red-800";
  }
}

function statusBadgeClass(status: string) {
  if (status === "Compliant") return "bg-emerald-100 text-emerald-800";
  if (status === "Non-Compliant") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}

export default function PublicScoresPage() {
  const [activeTab, setActiveTab] = useState("states");
  const [stateSearch, setStateSearch] = useState("");
  const [mdaSearch, setMdaSearch] = useState("");
  const [indicator, setIndicator] = useState<string>("all");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [yearInitialized, setYearInitialized] = useState(false);

  const indicators = useQuery(api.public_scores.getPublicStateIndicators);
  const stateData = useQuery(api.public_scores.getPublicStateRankings, {
    indicator: indicator === "all" ? undefined : indicator,
  });
  const mdaData = useQuery(api.public_scores.getPublicMdaScores, { year });

  useEffect(() => {
    if (yearInitialized || !mdaData?.availableYears?.length) return;
    if (!mdaData.availableYears.includes(year)) {
      setYear(mdaData.availableYears[0]);
    }
    setYearInitialized(true);
  }, [mdaData, year, yearInitialized]);

  const filteredStates = useMemo(() => {
    const rankings = stateData?.rankings ?? [];
    const q = stateSearch.trim().toLowerCase();
    if (!q) return rankings;
    return rankings.filter((row) => row.state.toLowerCase().includes(q));
  }, [stateData, stateSearch]);

  const filteredMdas = useMemo(() => {
    const rankings = mdaData?.rankings ?? [];
    const q = mdaSearch.trim().toLowerCase();
    if (!q) return rankings;
    return rankings.filter((row) => row.mdaName.toLowerCase().includes(q));
  }, [mdaData, mdaSearch]);

  const availableYears =
    mdaData?.availableYears?.length
      ? mdaData.availableYears
      : [new Date().getFullYear()];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-white">
      <section className="relative overflow-hidden border-b border-green-100 bg-[#0f3d1e] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.25),transparent_45%)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-28 md:pt-32">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-200">
            PEBEC Performance Tracker
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
            Track State &amp; MDA Scores
          </h1>
          <p className="mt-4 max-w-2xl text-base text-green-50/90 md:text-lg">
            Live rankings from PEBEC&apos;s Score States and BFA scoring systems.
            Results update as soon as new scores are saved.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-2 bg-white p-1 shadow-sm">
            <TabsTrigger
              value="states"
              className="flex items-center justify-center gap-2 py-3 data-[state=active]:bg-green-700 data-[state=active]:text-white"
            >
              <MapPin className="h-4 w-4" />
              State Rankings
            </TabsTrigger>
            <TabsTrigger
              value="mdas"
              className="flex items-center justify-center gap-2 py-3 data-[state=active]:bg-green-700 data-[state=active]:text-white"
            >
              <Building2 className="h-4 w-4" />
              MDA / BFA Scores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="states" className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Search state
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder="e.g. Lagos"
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-full space-y-1 md:w-72">
                <label className="text-sm font-medium text-gray-700">
                  Indicator
                </label>
                <Select value={indicator} onValueChange={setIndicator}>
                  <SelectTrigger>
                    <SelectValue placeholder="All indicators" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All indicators</SelectItem>
                    {(indicators ?? []).map((item) => (
                      <SelectItem key={item.key} value={item.key}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
              <p>
                {stateData === undefined
                  ? "Loading rankings…"
                  : `${filteredStates.length} state${filteredStates.length === 1 ? "" : "s"}`}
                {stateData?.maxScore
                  ? ` · Max score ${stateData.maxScore}`
                  : ""}
              </p>
              {stateData?.lastUpdatedAt ? (
                <p>
                  Last updated{" "}
                  {format(stateData.lastUpdatedAt, "dd MMM yyyy, HH:mm")}
                </p>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-green-50 text-left text-gray-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Rank</th>
                      <th className="px-4 py-3 font-semibold">State</th>
                      <th className="px-4 py-3 font-semibold">Score</th>
                      <th className="px-4 py-3 font-semibold">Percentage</th>
                      <th className="px-4 py-3 font-semibold">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stateData === undefined ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-gray-500"
                        >
                          Loading state rankings…
                        </td>
                      </tr>
                    ) : filteredStates.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-gray-500"
                        >
                          No state scores available yet.
                        </td>
                      </tr>
                    ) : (
                      filteredStates.map((row) => (
                        <tr
                          key={row.state}
                          className="border-t border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            #{row.rank}
                          </td>
                          <td className="px-4 py-3 text-gray-800">{row.state}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {row.totalScore.toFixed(1)} / {row.maxScore}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {row.percentageScore.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${gradeBadgeClass(row.grade)}`}
                            >
                              {row.grade}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mdas" className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Search MDA
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    className="pl-9"
                    placeholder="e.g. CAC"
                    value={mdaSearch}
                    onChange={(e) => setMdaSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-full space-y-1 md:w-48">
                <label className="text-sm font-medium text-gray-700">Year</label>
                <Select
                  value={String(year)}
                  onValueChange={(value) => setYear(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
              <p>
                {mdaData === undefined
                  ? "Loading scorecards…"
                  : `${filteredMdas.length} MDA${filteredMdas.length === 1 ? "" : "s"} scored for ${year}`}
              </p>
              {mdaData?.lastUpdatedAt ? (
                <p>
                  Last updated{" "}
                  {format(mdaData.lastUpdatedAt, "dd MMM yyyy, HH:mm")}
                </p>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-green-50 text-left text-gray-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Rank</th>
                      <th className="px-4 py-3 font-semibold">MDA</th>
                      <th className="px-4 py-3 font-semibold">Period</th>
                      <th className="px-4 py-3 font-semibold">Score</th>
                      <th className="px-4 py-3 font-semibold">Grade</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mdaData === undefined ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-gray-500"
                        >
                          Loading MDA scores…
                        </td>
                      </tr>
                    ) : filteredMdas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-10 text-center text-gray-500"
                        >
                          No MDA scorecards saved for {year} yet.
                        </td>
                      </tr>
                    ) : (
                      filteredMdas.map((row) => (
                        <tr
                          key={row.mdaName}
                          className="border-t border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            #{row.rank}
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            {row.mdaName}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {row.scoringPeriod}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {row.percentage.toFixed(1)}%
                            <span className="ml-1 text-xs text-gray-400">
                              ({row.totalScore.toFixed(1)}/
                              {row.maxPossiblePoints})
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${gradeBadgeClass(row.grade)}`}
                            >
                              {row.grade}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(row.status)}`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
