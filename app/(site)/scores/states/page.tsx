"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MapPin, Calendar, Trophy, Download, FileText, FileSpreadsheet, Eye, ArrowLeft } from "lucide-react";

interface StateRankingData {
  state: string;
  totalScore: number;
  percentage: number;
  maxScore: number;
  lastUpdated: number;
  rank: number;
  indicators?: Record<string, {
    score: number;
    maxScore: number;
    subIndicators: Record<string, number>
  }>;
}

export default function StateScoresPage() {
  const [stateSearch, setStateSearch] = useState("");
  const [stateYear, setStateYear] = useState(2025);
  const [selectedState, setSelectedState] = useState<StateRankingData | null>(null);

  const stateData = useQuery(api.public_scores.getPublicStateRankings, { year: stateYear });

  const filteredStates = useMemo(() => {
    if (!stateData?.states) return [];
    return (stateData.states as StateRankingData[]).filter((state) =>
      state.state.toLowerCase().includes(stateSearch.toLowerCase())
    );
  }, [stateData, stateSearch]);

  const downloadStatesPDF = () => {
    const content = `
PEBEC State Business Climate Rankings (${stateYear})

Generated on: ${new Date().toLocaleDateString()}

${filteredStates.map((state, index) => `
${index + 1}. ${state.state}
   Score: ${state.totalScore.toFixed(1)}/${state.maxScore}
`).join("\n")}

Total States: ${filteredStates.length}
Average Score: ${Math.round((filteredStates.reduce((sum, s) => sum + s.totalScore, 0) / filteredStates.length) || 0)}
Assessment Year: ${stateYear}
    `;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `state-rankings-${stateYear}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadStatesExcel = () => {
    const headers = "Rank,State,Total Score,Year\n";
    const csvContent = headers + filteredStates.map((state, index) =>
      `${index + 1},"${state.state}",${state.totalScore.toFixed(1)},${stateYear}`
    ).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `state-rankings-${stateYear}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-100 pt-52 pb-12">
        <div className="container mx-auto px-4">
          <Link href="/scores" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Tracker
          </Link>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">State Rankings</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Nigerian state performance in business climate indicators
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-6 h-6 text-yellow-600" />
              <CardTitle>State Rankings</CardTitle>
            </div>
            <CardDescription>
              Click a state to view a detailed indicator breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-700">Assessment Year:</span>
              </div>
              <Select value={stateYear.toString()} onValueChange={(value) => setStateYear(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search states..."
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={downloadStatesPDF} className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadStatesExcel} className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Download as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{filteredStates.length}</div>
                <div className="text-sm text-blue-600">Total States</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stateYear}</div>
                <div className="text-sm text-green-600">Assessment Year</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round((filteredStates.reduce((sum, s) => sum + s.totalScore, 0) / filteredStates.length) || 0)}
                </div>
                <div className="text-sm text-purple-600">Average Score</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 font-semibold">Rank</th>
                    <th className="text-left p-4 font-semibold">State</th>
                    <th className="text-left p-4 font-semibold">Total Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStates.map((state) => (
                    <tr
                      key={state.state}
                      className="border-b hover:bg-gray-50 cursor-pointer group"
                      onClick={() => setSelectedState(state)}
                    >
                      <td className="p-4">
                        <span className="font-semibold text-lg">#{state.rank}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{state.state}</div>
                          <Eye className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-sm">{state.totalScore.toFixed(1)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredStates.length === 0 && (
              <div className="text-center py-12 text-gray-500 space-y-2">
                <div className="text-lg font-medium">
                  {stateSearch ? "No states found matching your search." : `No state data available for ${stateYear}.`}
                </div>
                {!stateSearch && (
                  <div className="text-sm">
                    Try selecting a different year above. Data may be available for {stateYear === 2025 ? "2024 or earlier years" : "2025"}.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedState} onOpenChange={() => setSelectedState(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader className="pb-4">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-blue-500" />
                {selectedState?.state} - Score Breakdown
              </DialogTitle>
              <DialogDescription>
                Detailed breakdown of business climate indicators
              </DialogDescription>
            </DialogHeader>

            {selectedState && (
              <div className="overflow-y-auto max-h-[70vh] pr-2">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg mb-6">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-800">Overall Performance</span>
                    <div className="text-right">
                      <div className="font-mono text-xl font-bold text-blue-900">
                        {selectedState.totalScore.toFixed(1)} / {selectedState.maxScore}
                      </div>
                      <div className="text-sm text-blue-600 font-medium">
                        Rank #{selectedState.rank} of {stateData?.totalStates || 0}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedState.indicators && Object.entries(selectedState.indicators).map(([indicatorKey, indicatorData], index) => {
                    const percentage = indicatorData.maxScore > 0 ? (indicatorData.score / indicatorData.maxScore) * 100 : 0;
                    const colors = [
                      { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", accent: "bg-emerald-500" },
                      { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", accent: "bg-blue-500" },
                      { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", accent: "bg-purple-500" },
                      { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", accent: "bg-orange-500" },
                      { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-800", accent: "bg-teal-500" },
                    ];
                    const colorScheme = colors[index % colors.length]!;

                    return (
                      <div key={indicatorKey} className={`${colorScheme.bg} ${colorScheme.border} border-l-4 rounded-lg p-4`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className={`font-semibold text-base ${colorScheme.text} capitalize mb-1`}>
                              {indicatorKey.replace(/_/g, " ")}
                            </h4>
                            <div className="w-full bg-white rounded-full h-2 mb-2">
                              <div
                                className={`${colorScheme.accent} h-2 rounded-full transition-all duration-300`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className={`font-mono text-lg font-bold ${colorScheme.text}`}>
                              {indicatorData.score.toFixed(1)}
                            </div>
                            <div className={`text-xs ${colorScheme.text} opacity-75`}>
                              / {indicatorData.maxScore}
                            </div>
                          </div>
                        </div>

                        {Object.keys(indicatorData.subIndicators).length > 0 && (
                          <div className="grid gap-2 mt-4">
                            {Object.entries(indicatorData.subIndicators).map(([subKey, subScore]) => (
                              <div key={subKey} className="bg-white bg-opacity-60 rounded-md p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-700 capitalize text-sm font-medium">
                                    {subKey.replace(/_/g, " ")}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-semibold">
                                      {subScore.toFixed(1)}
                                    </span>
                                    <div
                                      className={`w-2 h-2 rounded-full ${
                                        subScore >= 2.5 ? "bg-green-500" :
                                        subScore >= 1.5 ? "bg-yellow-500" : "bg-red-500"
                                      }`}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(!selectedState.indicators || Object.keys(selectedState.indicators).length === 0) && (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">No detailed indicator breakdown available</p>
                      <p className="text-sm text-gray-500 mt-1">This state may not have been scored yet or data is being updated.</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-4 border-t border-gray-200 bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Assessment Year: {stateYear}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Last Updated: {new Date(selectedState.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
