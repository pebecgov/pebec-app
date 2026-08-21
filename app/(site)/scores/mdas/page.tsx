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
import { Search, Calendar, Download, FileText, FileSpreadsheet, Eye, Building2, ArrowLeft } from "lucide-react";

interface MdaScoreData {
  mdaName: string;
  finalScore: number;
  maxPossibleScore: number;
  slaScore: number;
  slaMax: number;
  mysteryShoppingScore: number;
  mysteryShoppingMax: number;
  transparencyScore: number;
  transparencyMax: number;
  stakeholderEngagementScore: number;
  stakeholderEngagementMax: number;
  innovationScore: number;
  innovationMax: number;
  reportGovScore: number;
  reportGovMax: number;
  timelinessScore: number;
  timelinessMax: number;
  monthlyReportScore: number;
  monthlyReportMax: number;
  rank: number;
  lastUpdated: number;
}

export default function MdaScoresPage() {
  const [mdaSearch, setMdaSearch] = useState("");
  const [mdaYear, setMdaYear] = useState(2025);
  const [selectedMda, setSelectedMda] = useState<MdaScoreData | null>(null);

  const mdaData = useQuery(api.public_scores.getPublicMdaScores, { year: mdaYear });

  const filteredMdas = useMemo(() => {
    if (!mdaData?.mdas) return [];
    return (mdaData.mdas as MdaScoreData[]).filter((mda) =>
      mda.mdaName.toLowerCase().includes(mdaSearch.toLowerCase())
    );
  }, [mdaData, mdaSearch]);

  const downloadMdasPDF = () => {
    const content = `
Federal MDA Performance Rankings (${mdaYear})

Generated on: ${new Date().toLocaleDateString()}

${filteredMdas.map((mda, index) => `
${index + 1}. ${mda.mdaName}
   Final Score: ${mda.finalScore.toFixed(1)}/${mda.maxPossibleScore}
`).join("\n")}

Total MDAs: ${filteredMdas.length}
Average Score: ${Math.round((filteredMdas.reduce((sum, m) => sum + m.finalScore, 0) / filteredMdas.length) || 0)}
Assessment Year: ${mdaYear}
    `;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mda-rankings-${mdaYear}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMdasExcel = () => {
    const headers = "Rank,MDA Name,Final Score,Year\n";
    const csvContent = headers + filteredMdas.map((mda, index) =>
      `${index + 1},"${mda.mdaName}",${mda.finalScore.toFixed(1)},${mdaYear}`
    ).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mda-rankings-${mdaYear}-${new Date().toISOString().split("T")[0]}.csv`;
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">MDA Performance</h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Ministry, Department and Agency performance in service delivery and efficiency
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              <CardTitle>Federal MDA Performance</CardTitle>
            </div>
            <CardDescription>
              Click an MDA to view a detailed metric breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-700">Assessment Year:</span>
              </div>
              <Select value={mdaYear.toString()} onValueChange={(value) => setMdaYear(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search MDAs..."
                  value={mdaSearch}
                  onChange={(e) => setMdaSearch(e.target.value)}
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
                  <DropdownMenuItem onClick={downloadMdasPDF} className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Download as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadMdasExcel} className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    Download as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{filteredMdas.length}</div>
                <div className="text-sm text-blue-600">Total MDAs</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{mdaYear}</div>
                <div className="text-sm text-green-600">Assessment Year</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round((filteredMdas.reduce((sum, m) => sum + m.finalScore, 0) / filteredMdas.length) || 0)}
                </div>
                <div className="text-sm text-purple-600">Average Score</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 font-semibold">Rank</th>
                    <th className="text-left p-4 font-semibold">MDA Name</th>
                    <th className="text-left p-4 font-semibold">Total Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMdas.map((mda) => (
                    <tr
                      key={mda.mdaName}
                      className="border-b hover:bg-gray-50 cursor-pointer group"
                      onClick={() => setSelectedMda(mda)}
                    >
                      <td className="p-4">
                        <span className="font-semibold text-lg">#{mda.rank}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{mda.mdaName}</div>
                          <Eye className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-sm">{mda.finalScore.toFixed(1)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredMdas.length === 0 && (
              <div className="text-center py-12 text-gray-500 space-y-2">
                <div className="text-lg font-medium">
                  {mdaSearch ? "No MDAs found matching your search." : `No MDA data available for ${mdaYear}.`}
                </div>
                {!mdaSearch && (
                  <div className="text-sm">
                    Try selecting a different year above. Data may be available for {mdaYear === 2025 ? "2026" : "2025"}.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedMda} onOpenChange={() => setSelectedMda(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader className="pb-4">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5 text-blue-500" />
                {selectedMda?.mdaName} - Performance Breakdown
              </DialogTitle>
              <DialogDescription>
                Detailed breakdown of service delivery and efficiency metrics
              </DialogDescription>
            </DialogHeader>

            {selectedMda && (
              <div className="overflow-y-auto max-h-[70vh] pr-2">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg mb-6">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-800">Overall Performance</span>
                    <div className="text-right">
                      <div className="font-mono text-xl font-bold text-blue-900">
                        {selectedMda.finalScore.toFixed(1)} / {selectedMda.maxPossibleScore}
                      </div>
                      <div className="text-sm text-blue-600 font-medium">
                        Rank #{selectedMda.rank} of {mdaData?.totalMdas || 0}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "SLA Compliance", score: selectedMda.slaScore, max: selectedMda.slaMax, color: "emerald" },
                    { label: "Mystery Shopping", score: selectedMda.mysteryShoppingScore, max: selectedMda.mysteryShoppingMax, color: "blue" },
                    { label: "Report Gov Resolution", score: selectedMda.reportGovScore, max: selectedMda.reportGovMax, color: "purple" },
                    { label: "Timeliness in Submission", score: selectedMda.timelinessScore, max: selectedMda.timelinessMax, color: "orange" },
                    { label: "Monthly Report Submission", score: selectedMda.monthlyReportScore, max: selectedMda.monthlyReportMax, color: "teal" },
                    { label: "Transparency", score: selectedMda.transparencyScore, max: selectedMda.transparencyMax, color: "indigo" },
                    { label: "Stakeholder Engagement", score: selectedMda.stakeholderEngagementScore, max: selectedMda.stakeholderEngagementMax, color: "pink" },
                    { label: "Innovation", score: selectedMda.innovationScore, max: selectedMda.innovationMax, color: "amber" },
                  ].map((metric) => {
                    const colorSchemes = {
                      emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", accent: "bg-emerald-500" },
                      blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", accent: "bg-blue-500" },
                      purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", accent: "bg-purple-500" },
                      orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", accent: "bg-orange-500" },
                      teal: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-800", accent: "bg-teal-500" },
                      indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-800", accent: "bg-indigo-500" },
                      pink: { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-800", accent: "bg-pink-500" },
                      amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", accent: "bg-amber-500" },
                    };
                    const colorScheme = colorSchemes[metric.color as keyof typeof colorSchemes];
                    const maxScore = metric.max || 0;
                    const percentage = maxScore > 0 ? (metric.score / maxScore) * 100 : 0;

                    if (metric.score <= 0 && maxScore <= 0) return null;

                    return (
                      <div key={metric.label} className={`${colorScheme.bg} ${colorScheme.border} border-l-4 rounded-lg p-4`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className={`font-semibold text-base ${colorScheme.text} mb-2`}>
                              {metric.label}
                            </h4>
                            <div className="w-full bg-white rounded-full h-2">
                              <div
                                className={`${colorScheme.accent} h-2 rounded-full transition-all duration-300`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <div className={`font-mono text-lg font-bold ${colorScheme.text}`}>
                              {metric.score.toFixed(1)}
                            </div>
                            <div className={`text-xs ${colorScheme.text} opacity-75`}>
                              / {maxScore}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 pt-4 border-t border-gray-200 bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Assessment Year: {mdaYear}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Last Updated: {new Date(selectedMda.lastUpdated).toLocaleDateString()}</span>
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
