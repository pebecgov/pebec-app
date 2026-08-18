"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, TrendingUp, MapPin, Building2, Calendar, Trophy, Download, FileText, FileSpreadsheet, Eye } from "lucide-react";
import { useSearchParams } from "next/navigation";

// Type definitions for the data structures
interface StateRankingData {
  state: string;
  totalScore: number;
  percentage: number;
  maxScore: number;
  lastUpdated: number;
  rank: number;
}

interface MdaScoreData {
  mdaName: string;
  finalScore: number;
  maxPossibleScore: number;
  percentage: number;
  grade: string;
  scoringPeriod: string;
}

export default function PublicScoresPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "states";
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [stateSearch, setStateSearch] = useState("");
  const [mdaSearch, setMdaSearch] = useState("");
  const [stateYear, setStateYear] = useState(2025); // Default to 2025 where data exists
  const [mdaYear, setMdaYear] = useState(new Date().getFullYear());
  const [selectedState, setSelectedState] = useState<any>(null);
  const [selectedMda, setSelectedMda] = useState<any>(null);

  // Fetch data
  const indicators = useQuery(api.public_scores.getPublicStateIndicators);
  const stateData = useQuery(api.public_scores.getPublicStateRankings, { year: stateYear });
  const mdaData = useQuery(api.public_scores.getPublicMdaScores, { year: mdaYear });

  // Update tab based on URL parameter
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && (tab === "states" || tab === "mdas")) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Filter data
  const filteredStates = useMemo(() => {
    if (!stateData?.states) return [];
    return (stateData.states as StateRankingData[]).filter(state =>
      state.state.toLowerCase().includes(stateSearch.toLowerCase())
    );
  }, [stateData, stateSearch]);

  const filteredMdas = useMemo(() => {
    if (!mdaData?.mdas) return [];
    return (mdaData.mdas as MdaScoreData[]).filter(mda =>
      mda.mdaName.toLowerCase().includes(mdaSearch.toLowerCase())
    );
  }, [mdaData, mdaSearch]);

  const getGradeBadgeColor = (grade: string) => {
    switch (grade) {
      case "A+":
      case "A":
        return "bg-green-100 text-green-800";
      case "B+":
      case "B":
        return "bg-blue-100 text-blue-800";
      case "C+":
      case "C":
        return "bg-yellow-100 text-yellow-800";
      case "D+":
      case "D":
        return "bg-orange-100 text-orange-800";
      case "F":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Download functions
  const downloadStatesPDF = () => {
    const content = `
PEBEC State Business Climate Rankings (${stateYear})

Generated on: ${new Date().toLocaleDateString()}
Assessment Year: ${stateYear}

${filteredStates.map((state, index) => `
${index + 1}. ${state.state}
   Score: ${state.totalScore.toFixed(1)}
   Percentage: ${state.percentage.toFixed(1)}%
`).join('\n')}

Total States: ${filteredStates.length}
Average Score: ${Math.round((filteredStates.reduce((sum, s) => sum + s.percentage, 0) / filteredStates.length) || 0)}%
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `state-rankings-${stateYear}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadStatesExcel = () => {
    const headers = 'Rank,State,Total Score,Percentage,Year\n';
    const csvContent = headers + filteredStates.map((state, index) =>
      `${index + 1},"${state.state}",${state.totalScore.toFixed(1)},${state.percentage.toFixed(1)},${stateYear}`
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `state-rankings-${stateYear}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMdaPDF = () => {
    const content = `
PEBEC BFA Scoring - Federal MDAs (${mdaYear})

Generated on: ${new Date().toLocaleDateString()}

${filteredMdas.map((mda, index) => `
${index + 1}. ${mda.mdaName}
   Score: ${mda.finalScore.toFixed(1)}/${mda.maxPossibleScore}
   Percentage: ${mda.percentage.toFixed(1)}%
   Grade: ${mda.grade}
   Period: ${mda.scoringPeriod}
`).join('\n')}

Total MDAs: ${filteredMdas.length}
Grade A MDAs: ${filteredMdas.filter(m => m.grade.startsWith("A")).length}
Assessment Year: ${mdaYear}
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mda-rankings-${mdaYear}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMdaExcel = () => {
    const headers = 'Rank,MDA,Score,Max Score,Percentage,Grade,Period,Year\n';
    const csvContent = headers + filteredMdas.map((mda, index) => 
      `${index + 1},"${mda.mdaName}",${mda.finalScore.toFixed(1)},${mda.maxPossibleScore},${mda.percentage.toFixed(1)},${mda.grade},"${mda.scoringPeriod}",${mdaYear}`
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mda-rankings-${mdaYear}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b pt-24">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Performance Tracker
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Track the performance of Nigerian states and federal MDAs in business climate reforms and service delivery
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="states" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                State Rankings
              </TabsTrigger>
              <TabsTrigger value="mdas" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                BFA Scoring
              </TabsTrigger>
            </TabsList>
          </div>

          {/* State Rankings Tab */}
          <TabsContent value="states" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  State Business Climate Rankings
                </CardTitle>
                <CardDescription>
                  Performance rankings of Nigerian states based on business climate indicators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Year Filter - Always Visible */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-700">Assessment Year:</span>
                  </div>
                  <Select value={stateYear.toString()} onValueChange={(value) => setStateYear(parseInt(value))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2026, 2025, 2024, 2023].map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search and Download */}
                <div className="flex flex-col sm:flex-row gap-4">
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

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {stateData?.totalStates || 0}
                    </div>
                    <div className="text-sm text-blue-600">Total States</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {stateYear}
                    </div>
                    <div className="text-sm text-green-600">Assessment Year</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round((filteredStates.reduce((sum, s) => sum + s.percentage, 0) / filteredStates.length) || 0)}%
                    </div>
                    <div className="text-sm text-purple-600">Average Score</div>
                  </div>
                </div>

                {/* States Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-4 font-semibold">Rank</th>
                        <th className="text-left p-4 font-semibold">State</th>
                        <th className="text-left p-4 font-semibold">Total Score</th>
                        <th className="text-left p-4 font-semibold">Percentage</th>
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
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">
                                #{state.rank}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{state.state}</div>
                              <Eye className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-sm">
                              {state.totalScore.toFixed(1)}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="font-medium">
                              {state.percentage.toFixed(1)}%
                            </span>
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
          </TabsContent>

          {/* MDA/BFA Scoring Tab */}
          <TabsContent value="mdas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  BFA Scoring - Federal MDAs
                </CardTitle>
                <CardDescription>
                  Business Facilitation Assessment scores for Federal Ministries, Departments, and Agencies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Year Filter - Always Visible */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-700">Assessment Year:</span>
                  </div>
                  <Select value={mdaYear.toString()} onValueChange={(value) => setMdaYear(parseInt(value))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2026, 2025, 2024, 2023].map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search and Download */}
                <div className="flex flex-col sm:flex-row gap-4">
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
                      <DropdownMenuItem onClick={downloadMdaPDF} className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Download as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={downloadMdaExcel} className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        Download as Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {mdaData?.totalMdas || 0}
                    </div>
                    <div className="text-sm text-blue-600">Total MDAs</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {mdaYear}
                    </div>
                    <div className="text-sm text-green-600">Assessment Year</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {filteredMdas.filter(m => m.grade.startsWith("A")).length}
                    </div>
                    <div className="text-sm text-purple-600">Grade A MDAs</div>
                  </div>
                </div>

                {/* MDAs Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-4 font-semibold">Rank</th>
                        <th className="text-left p-4 font-semibold">MDA</th>
                        <th className="text-left p-4 font-semibold">Score</th>
                        <th className="text-left p-4 font-semibold">Percentage</th>
                        <th className="text-left p-4 font-semibold">Grade</th>
                        <th className="text-left p-4 font-semibold">Period</th>
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
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">
                                #{(mda as any).rank}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="font-medium">{mda.mdaName}</div>
                              <Eye className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-mono text-sm">
                              {mda.finalScore}/{mda.maxPossibleScore}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${Math.min(mda.percentage, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {mda.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={getGradeBadgeColor(mda.grade)}>
                              {mda.grade}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-gray-600">
                              {mda.scoringPeriod}
                            </span>
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
                        Try selecting a different year above. Data may be available for {mdaYear === 2026 ? "2025 or earlier years" : "2026"}.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* State Breakdown Dialog */}
        <Dialog open={!!selectedState} onOpenChange={() => setSelectedState(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-500" />
                {selectedState?.state} - Score Breakdown
              </DialogTitle>
              <DialogDescription>
                Detailed breakdown of business climate indicators
              </DialogDescription>
            </DialogHeader>
            
            {selectedState && (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Overall Performance</span>
                    <Badge className={getGradeBadgeColor(selectedState.grade)}>
                      {selectedState.grade}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedState.totalScore.toFixed(1)}
                    </div>
                    <div className="flex-1 bg-blue-200 rounded-full h-3">
                      <div
                        className="bg-blue-500 h-3 rounded-full"
                        style={{ width: `${Math.min(selectedState.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="text-sm font-medium">
                      {selectedState.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Indicator Breakdown */}
                <div>
                  <h3 className="font-semibold mb-4">Business Climate Indicators</h3>
                  <div className="space-y-3">
                    {Object.entries(selectedState.scores || {}).map(([indicator, score]) => (
                      <div key={indicator} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium capitalize">
                          {indicator.replace(/_/g, ' ')}
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-sm">{score as number}/100</div>
                          <div className="text-xs text-gray-500">
                            {((score as number / 100) * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
                  <div>Rank: #{(selectedState as any).rank} out of {stateData?.totalStates || 0}</div>
                  <div>Last updated: {new Date(selectedState.lastUpdated).toLocaleDateString()}</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* MDA Breakdown Dialog */}
        <Dialog open={!!selectedMda} onOpenChange={() => setSelectedMda(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-green-500" />
                {selectedMda?.mdaName} - BFA Scorecard
              </DialogTitle>
              <DialogDescription>
                Detailed Business Facilitation Assessment breakdown
              </DialogDescription>
            </DialogHeader>
            
            {selectedMda && (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Overall Performance</span>
                    <Badge className={getGradeBadgeColor(selectedMda.grade)}>
                      {selectedMda.grade}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedMda.finalScore.toFixed(1)}/{selectedMda.maxPossibleScore}
                    </div>
                    <div className="flex-1 bg-green-200 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full"
                        style={{ width: `${Math.min(selectedMda.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="text-sm font-medium">
                      {selectedMda.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* BFA Categories Note */}
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="text-sm text-yellow-800">
                    <strong>Note:</strong> This scorecard represents the overall BFA performance. 
                    Detailed metric breakdowns (SLA, Mystery Shopping, Timeliness, etc.) are available 
                    in the admin dashboard for authorized users.
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h3 className="font-semibold mb-4">Assessment Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Scoring Period</div>
                      <div className="font-medium">{selectedMda.scoringPeriod}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Performance Grade</div>
                      <div className="font-medium">{selectedMda.grade}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Score Range</div>
                      <div className="font-medium">0 - {selectedMda.maxPossibleScore}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600">Achievement</div>
                      <div className="font-medium">{selectedMda.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="pt-4 border-t border-gray-200 text-sm text-gray-500">
                  <div>Rank: #{(selectedMda as any).rank} out of {mdaData?.totalMdas || 0}</div>
                  <div>Last updated: {new Date(selectedMda.lastUpdated).toLocaleDateString()}</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}