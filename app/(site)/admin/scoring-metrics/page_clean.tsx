"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useUserRole } from "@/lib/useUserRole";
import { useRouter } from "next/navigation";
import { mdasList } from "@/components/mdaList";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { toast } from "sonner";
import ScoringMetricsDashboard from "@/components/Admin/ScoringMetricsDashboard";
import { generateMdaScoringPDF } from "@/lib/pdfGenerator";
import { generateDashboardPDF } from "@/lib/dashboardPdfGenerator";
import { indicators } from "@/convex/config/indicators";
import { generateRegionalAveragesPDF, RegionalAverageRow } from "@/lib/regionalAveragesPdf";
import { geopoliticalRegions, stateRegions } from "@/lib/stateRegions";
import { analyzeMinistryImpact, generateMinistryImpactPDF, isMinistry } from "@/lib/ministryAnalysis";
import { generateRankingPDF } from "@/lib/rankingPdfGenerator";
import { DocumentArrowDownIcon } from "@heroicons/react/24/outline";
import DashboardTab from "@/components/Admin/DashboardTab";
import RankingsTable from "@/components/Admin/RankingsTable";
import AnalysisTab from "@/components/Admin/AnalysisTab";

const stateIndicatorMaxScores: Record<string, number> = Object.fromEntries(
  Object.entries(indicators).map(([indicatorKey, indicatorConfig]) => {
    const maxScoreForIndicator = Object.values(indicatorConfig.subIndicators).reduce(
      (sum, subIndicator: any) => {
        const options = (subIndicator.options as Array<{ score: number }>) || [];
        const maxOptionScore = options.reduce(
          (max, option) => Math.max(max, option.score ?? 0),
          0
        );
        return sum + maxOptionScore;
      },
      0
    );
    return [indicatorKey, maxScoreForIndicator];
  })
);

const STATE_OVERALL_MAX_SCORE = Object.values(stateIndicatorMaxScores).reduce(
  (sum, value) => sum + value,
  0
);

const STATE_ALIAS_OVERRIDES: Record<string, string> = {
  FCT: "Federal Capital Territory",
  "FEDERAL CAPITAL TERRITORY": "Federal Capital Territory",
  ABUJA: "Federal Capital Territory",
  "F.C.T": "Federal Capital Territory",
};

const STATE_ALIAS_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = { ...STATE_ALIAS_OVERRIDES };
  Object.keys(stateRegions).forEach((state) => {
    const upper = state.toUpperCase();
    map[upper] = state;
    map[`${upper} STATE`] = state;
    map[upper.replace(/\s+/g, "")] = state;
    map[upper.replace(/\s+/g, "-")] = state;
  });
  return map;
})();

const INVALID_STATE_LABELS = new Set([
  "DATA SOURCES",
  "DATA SOURCE",
  "SOURCES",
  "SOURCE",
  "N/A",
  "NOT APPLICABLE",
]);

const normalizeStateLabel = (raw?: string): string | null => {
  if (!raw) return null;
  const trimmed = raw.replace(/[–—]/g, "-").trim();
  if (!trimmed) return null;

  const normalizedWhitespace = trimmed
    .replace(/\bstate of\s+/i, "")
    .replace(/\bthe state of\s+/i, "")
    .replace(/\bstate\b$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const upper = normalizedWhitespace.toUpperCase();

  if (INVALID_STATE_LABELS.has(upper)) {
    return null;
  }

  if (STATE_ALIAS_MAP[upper]) {
    return STATE_ALIAS_MAP[upper];
  }

  const lower = normalizedWhitespace.toLowerCase();
  const titleCased = lower.replace(/\b\w/g, (char) => char.toUpperCase());
  return stateRegions[titleCased] ? titleCased : null;
};

// Helper function to find matching MDA name from mdasList
const findMatchingMdaName = (inputName: string): string | null => {
  if (!inputName) return null;
  
  // Direct match
  const directMatch = mdasList.find(mda => mda.name === inputName);
  if (directMatch) return directMatch.name;
  
  // Fuzzy matching
  const normalizedInput = inputName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = mdasList.find(mda => {
    const normalizedMda = mda.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalizedMda === normalizedInput;
  });
  
  return match ? match.name : null;
};

export default function ScoringMetricsPage() {
  const { user, isLoaded } = useUser();
  const { role, isLoading } = useUserRole();
  const router = useRouter();

  // State variables
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rankings' | 'analysis'>('dashboard');
  const [dashboardYear, setDashboardYear] = useState(new Date().getFullYear());
  const [selectedMetric, setSelectedMetric] = useState<string>('totalScore');
  const [mdaFilter, setMdaFilter] = useState<'all' | 'withData'>('all');
  const [rankingView, setRankingView] = useState<'all' | 'without-ministries' | 'ministries-only'>('all');

  // MDA data state
  const [mdaData, setMdaData] = useState<any[]>([]);
  const [currentViewData, setCurrentViewData] = useState<any[]>([]);

  // Ranking modal states
  const [showSlaRanking, setShowSlaRanking] = useState(false);
  const [showReportGovRanking, setShowReportGovRanking] = useState(false);

  // Convex queries
  const liveDashboardData = useQuery(api.mda_scoring.getAllMdaSavedDataForDashboard, { year: dashboardYear });
  const stateScores = useQuery(api.saveStateScore.getStateScores, {});
  const slaRankings = useQuery(api.mda_scoring.getAllSLARankings, { scoringPeriod: `1st Half ${dashboardYear}` });
  const reportGovRankings = useQuery(api.mda_scoring.getAllReportGovRankings, { scoringPeriod: `1st Half ${dashboardYear}` });

  // Regional averages using useState and useEffect
  const [regionalAverages, setRegionalAverages] = useState<RegionalAverageRow[] | null>(null);

  useEffect(() => {
    if (stateScores === undefined) {
      setRegionalAverages(null);
      return;
    }

    const stateTotals: Record<string, number> = {};
    if (Array.isArray(stateScores)) {
      for (let i = 0; i < stateScores.length; i++) {
        const entry = stateScores[i];
        const normalizedState = normalizeStateLabel(entry?.state);
        if (!normalizedState) continue;
        stateTotals[normalizedState] = (stateTotals[normalizedState] ?? 0) + (entry.score || 0);
      }
    }

    const regionBuckets: Record<string, { statesDetailed: RegionalAverageRow["statesDetailed"] }> = {};
    
    // Initialize region buckets
    for (let i = 0; i < geopoliticalRegions.length; i++) {
      const region = geopoliticalRegions[i];
      regionBuckets[region] = { statesDetailed: [] };
    }

    // Process state regions
    const stateRegionEntries = Object.entries(stateRegions);
    for (let i = 0; i < stateRegionEntries.length; i++) {
      const [state, region] = stateRegionEntries[i];
      if (!regionBuckets[region]) {
        regionBuckets[region] = { statesDetailed: [] };
      }
      const hasRecord = Object.prototype.hasOwnProperty.call(stateTotals, state);
      const stateScore = hasRecord ? stateTotals[state] : 0;
      const statePercentage = STATE_OVERALL_MAX_SCORE > 0 ? (stateScore / STATE_OVERALL_MAX_SCORE) * 100 : 0;
      regionBuckets[region].statesDetailed.push({
        state,
        score: stateScore,
        percentage: statePercentage,
        hasData: hasRecord,
      });
    }

    const results: RegionalAverageRow[] = [];
    for (let i = 0; i < geopoliticalRegions.length; i++) {
      const region = geopoliticalRegions[i];
      const bucket = regionBuckets[region];
      if (!bucket) continue;
      
      const totalStates = bucket.statesDetailed.length;
      let totalScore = 0;
      for (let j = 0; j < bucket.statesDetailed.length; j++) {
        totalScore += bucket.statesDetailed[j].score;
      }
      
      const averageScore = totalStates > 0 ? totalScore / totalStates : 0;
      const averagePercentage = STATE_OVERALL_MAX_SCORE > 0 ? (averageScore / STATE_OVERALL_MAX_SCORE) * 100 : 0;

      results.push({
        region,
        averageScore,
        averagePercentage,
        totalScore,
        statesDetailed: bucket.statesDetailed,
      });
    }

    setRegionalAverages(results);
  }, [stateScores]);

  // Helper function to process and filter MDA data for dashboard
  const processDashboardMdaData = (filter: 'all' | 'withData' = 'all', rankingFilter: 'all' | 'without-ministries' | 'ministries-only' = 'all') => {
    // Initialize all MDAs from mdasList with null data
    const allMdasMap = new Map<string, any>();
    mdasList.forEach(mda => {
      allMdasMap.set(mda.name, {
        mdaName: mda.name,
        sla: null,
        mysteryShopping: null,
        controversial: null,
        toutingRentseeking: null,
        innovation: null,
        stakeholder: null,
        transparency: null,
        reportGovResolution: null,
        monthlyReport: null,
        timeliness: null
      });
    });

    // Merge with saved data from backend
    if (liveDashboardData && Array.isArray(liveDashboardData)) {
      liveDashboardData.forEach((mda: any) => {
        // Find matching MDA name from mdasList
        const matchingMdaName = findMatchingMdaName(mda.mdaName);

        // Only include MDAs that are in mdasList
        if (matchingMdaName && allMdasMap.has(matchingMdaName)) {
          const existing = allMdasMap.get(matchingMdaName);
          allMdasMap.set(matchingMdaName, {
            ...existing,
            ...mda,
            mdaName: matchingMdaName // Use the standardized name from mdasList
          });
        }
      });
    }

    let allMdasArray = Array.from(allMdasMap.values()).map((mda: any) => {
      // Recalculate SLA score based on 10 months instead of 12
      let slaScore = mda.sla?.score || 0;
      if (mda.sla && mda.sla.monthsWithData) {
        const pointsPerMonth10 = 30 / 10; // 3 points per month for 10 months
        const pointsPerMonth12 = 30 / 12; // 2.5 points per month for 12 months (backend calculation)
        slaScore = mda.sla.score * (pointsPerMonth10 / pointsPerMonth12);
      }

      // Recalculate Monthly Report score based on 10 months instead of 12
      let monthlyReportScore = mda.monthlyReport?.score || 0;
      if (mda.monthlyReport && mda.monthlyReport.monthsWithData) {
        const pointsPerMonth10 = 3 / 10; // 0.3 points per month
        const pointsPerMonth12 = 3 / 12; // 0.25 points per month (backend calculation)
        monthlyReportScore = mda.monthlyReport.score * (pointsPerMonth10 / pointsPerMonth12);
      }

      // Recalculate Timeliness score based on 10 months instead of 12
      let timelinessScore = mda.timeliness?.score || 0;
      if (mda.timeliness && mda.timeliness.monthsWithData) {
        const pointsPerMonth10 = 2 / 10; // 0.2 points per month
        const pointsPerMonth12 = 2 / 12; // 0.167 points per month (backend calculation)
        timelinessScore = mda.timeliness.score * (pointsPerMonth10 / pointsPerMonth12);
      }

      const mysteryScore = mda.mysteryShopping?.score || 0;
      const innovationScore = mda.innovation?.score || 0;
      const stakeholderScore = mda.stakeholder?.score || 0;
      const transparencyScore = mda.transparency?.score || 0;
      const reportGovResScore = mda.reportGovResolution?.score || 0;

      // Calculate base total score (all metrics except controversial and touting & rentseeking)
      const baseTotalScore = slaScore + mysteryScore + innovationScore + stakeholderScore +
        transparencyScore + reportGovResScore + monthlyReportScore + timelinessScore;

      // Controversial: Handle both old and new data formats
      let controversialScore = mda.controversial?.score || 0;
      if (mda.controversial) {
        const isOldFormat = controversialScore >= 0 && controversialScore <= 5;
        if (isOldFormat) {
          if (mda.controversial.isControversial) {
            controversialScore = -5;
          } else {
            controversialScore = 0;
          }
        }
      }

      // Touting & Rentseeking: If Yes (true), score is -10. If No (false), score is 0.
      let toutingRentseekingScore = mda.toutingRentseeking?.score || 0;

      // Calculate penalties (convert negative scores to positive penalty values)
      const controversialPenalty = controversialScore < 0 ? Math.abs(controversialScore) : 0;
      const toutingRentseekingPenalty = toutingRentseekingScore < 0 ? Math.abs(toutingRentseekingScore) : 0;
      const totalScore = baseTotalScore - controversialPenalty - toutingRentseekingPenalty;

      // Check if optional metrics are skipped
      const isReportGovSkipped = mda.reportGovResolution?.isSkipped || false;
      const isTransparencySkipped = mda.transparency?.isSkipped || false;
      let maxPossiblePoints = 90;
      if (isTransparencySkipped) {
        maxPossiblePoints -= 5;
      }
      if (isReportGovSkipped) {
        maxPossiblePoints -= 15;
      }

      const totalPercentage = maxPossiblePoints > 0
        ? (totalScore / maxPossiblePoints) * 100
        : 0;

      return {
        ...mda,
        sla: mda.sla ? { ...mda.sla, score: slaScore } : mda.sla,
        monthlyReport: mda.monthlyReport ? { ...mda.monthlyReport, score: monthlyReportScore } : mda.monthlyReport,
        timeliness: mda.timeliness ? { ...mda.timeliness, score: timelinessScore } : mda.timeliness,
        baseTotalScore,
        totalScore,
        totalPercentage,
        isReportGovSkipped,
        isTransparencySkipped,
        maxPossiblePoints
      };
    });

    // Filter based on selected filter
    if (filter === 'withData') {
      allMdasArray = allMdasArray.filter((mda: any) => {
        // Check if MDA has at least one metric with data
        return mda.sla || mda.mysteryShopping || mda.controversial || mda.toutingRentseeking ||
          mda.innovation || mda.stakeholder || mda.transparency || mda.reportGovResolution ||
          mda.monthlyReport || mda.timeliness || mda.totalScore > 0;
      });
    }

    // Apply ranking view filter
    if (rankingFilter === 'without-ministries') {
      allMdasArray = allMdasArray.filter((mda: any) => !isMinistry(mda.mdaName));
    } else if (rankingFilter === 'ministries-only') {
      allMdasArray = allMdasArray.filter((mda: any) => isMinistry(mda.mdaName));
    }

    return allMdasArray;
  };

  // Handle dashboard PDF generation
  const handleGenerateDashboardPDF = async () => {
    if (!liveDashboardData || !Array.isArray(liveDashboardData)) {
      return;
    }

    // Use the same data that's displayed in the table
    let tableData = processDashboardMdaData(mdaFilter, 'all'); // Get all data first

    // Apply ministry filter to match the current ranking view
    if (rankingView === 'without-ministries') {
      tableData = tableData.filter((mda: any) => !isMinistry(mda.mdaName));
    } else if (rankingView === 'ministries-only') {
      tableData = tableData.filter((mda: any) => isMinistry(mda.mdaName));
    }

    // Map to the format expected by the PDF generator
    const pdfData = tableData.map((mda: any) => ({
      mdaName: mda.mdaName,
      sla: mda.sla?.score || 0,
      mysteryShopping: mda.mysteryShopping?.score || 0,
      controversial: mda.controversial?.score || 0,
      toutingRentseeking: mda.toutingRentseeking?.score || 0,
      innovation: mda.innovation?.score || 0,
      stakeholder: mda.stakeholder?.score || 0,
      transparency: mda.transparency?.score || 0,
      reportGovResolution: mda.reportGovResolution?.score || 0,
      monthlyReport: mda.monthlyReport?.score || 0,
      timeliness: mda.timeliness?.score || 0,
      baseTotalScore: mda.baseTotalScore || 0,
      totalScore: mda.totalScore || 0,
      totalPercentage: mda.totalPercentage || 0,
      isReportGovSkipped: mda.isReportGovSkipped || false,
      isTransparencySkipped: mda.isTransparencySkipped || false,
      maxPossiblePoints: mda.maxPossiblePoints || 90
    }));

    await generateDashboardPDF({
      data: pdfData,
      year: dashboardYear,
      filter: mdaFilter,
      ministryFilter: rankingView
    });
  };

  const handleGenerateRegionalAveragesPDF = async () => {
    if (!regionalAverages) {
      toast.error("Regional data is still loading");
      return;
    }

    await generateRegionalAveragesPDF({
      data: regionalAverages,
      year: dashboardYear,
      overallMaxScore: 90
    });
  };

  // Computed MDA data using useState and useEffect for production stability
  useEffect(() => {
    if (!liveDashboardData || !Array.isArray(liveDashboardData)) {
      setMdaData([]);
      return;
    }

    const processedData = processDashboardMdaData(mdaFilter, rankingView);
    setMdaData(processedData);
  }, [liveDashboardData, mdaFilter, rankingView]);

  // Current view data based on ranking view
  useEffect(() => {
    setCurrentViewData(mdaData);
  }, [mdaData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="sm:flex sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  MDA Scoring Metrics Dashboard
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Comprehensive scoring metrics for all MDAs
                </p>
              </div>
            </div>

            {/* Year and Filter Controls */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                  Year
                </label>
                <select
                  id="year"
                  value={dashboardYear}
                  onChange={(e) => setDashboardYear(parseInt(e.target.value))}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value={2024}>2024</option>
                  <option value={2023}>2023</option>
                </select>
              </div>

              <div>
                <label htmlFor="filter" className="block text-sm font-medium text-gray-700">
                  Data Filter
                </label>
                <select
                  id="filter"
                  value={mdaFilter}
                  onChange={(e) => setMdaFilter(e.target.value as 'all' | 'withData')}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">All MDAs</option>
                  <option value="withData">MDAs with Data Only</option>
                </select>
              </div>

              <div>
                <label htmlFor="rankingView" className="block text-sm font-medium text-gray-700">
                  Ranking View
                </label>
                <select
                  id="rankingView"
                  value={rankingView}
                  onChange={(e) => setRankingView(e.target.value as 'all' | 'without-ministries' | 'ministries-only')}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">All MDAs</option>
                  <option value="without-ministries">Without Ministries</option>
                  <option value="ministries-only">Ministries Only</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-4">
              <button
                onClick={handleGenerateDashboardPDF}
                disabled={!currentViewData || currentViewData.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Download {rankingView === 'all' ? 'All MDAs' : rankingView === 'without-ministries' ? 'Without Ministries' : 'Ministries Only'} PDF
              </button>

              <button
                onClick={handleGenerateRegionalAveragesPDF}
                disabled={!regionalAverages || regionalAverages.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                Download Regional Averages PDF
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-8">
              <div className="sm:hidden">
                <label htmlFor="tabs" className="sr-only">
                  Select a tab
                </label>
                <select
                  id="tabs"
                  name="tabs"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value as 'dashboard' | 'rankings' | 'analysis')}
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="rankings">Rankings</option>
                  <option value="analysis">Analysis</option>
                </select>
              </div>
              <div className="hidden sm:block">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {[
                      { key: 'dashboard', name: 'Dashboard' },
                      { key: 'rankings', name: 'Rankings' },
                      { key: 'analysis', name: 'Analysis' }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as 'dashboard' | 'rankings' | 'analysis')}
                        className={`${activeTab === tab.key
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                      >
                        {tab.name}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === 'dashboard' && (
                <DashboardTab
                  data={currentViewData}
                  year={dashboardYear}
                  filter={mdaFilter}
                  onMetricClick={(metric) => {
                    setSelectedMetric(metric);
                    setActiveTab('rankings');
                  }}
                />
              )}

              {activeTab === 'rankings' && (
                <RankingsTable
                  data={currentViewData}
                  selectedMetric={selectedMetric}
                  onMetricChange={setSelectedMetric}
                  year={dashboardYear}
                />
              )}

              {activeTab === 'analysis' && (
                <AnalysisTab
                  stateScores={stateScores}
                  year={dashboardYear}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SLA Ranking Modal */}
      {showSlaRanking && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl max-h-screen overflow-y-auto bg-white rounded-lg shadow-xl">
            <button
              onClick={() => setShowSlaRanking(false)}
              className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
            >
              &times;
            </button>

            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">SLA Rankings - {dashboardYear}</h2>

              {slaRankings && slaRankings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          MDA Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Percentage
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Months with Data
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(slaRankings || []).map((item: any, index: number) => (
                        <tr key={item.mdaName} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.mdaName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="font-semibold">{item.totalScore.toFixed(1)}/30</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`font-semibold ${item.percentage >= 90 ? 'text-green-600' :
                              item.percentage >= 80 ? 'text-blue-600' :
                                item.percentage >= 70 ? 'text-yellow-600' :
                                  'text-red-600'
                              }`}>
                              {item.percentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.monthsWithData}/{item.totalMonths}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No SLA rankings available for this period.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Gov Ranking Modal */}
      {showReportGovRanking && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-5xl max-h-screen overflow-y-auto bg-white rounded-lg shadow-xl">
            <button
              onClick={() => setShowReportGovRanking(false)}
              className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
            >
              &times;
            </button>

            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Report Gov Rankings - {dashboardYear}</h2>

              {reportGovRankings && reportGovRankings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          MDA Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Percentage
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Has Data
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(reportGovRankings || []).map((item: any, index: number) => (
                        <tr key={item.mdaName} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.mdaName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="font-semibold">{item.totalScore.toFixed(1)}/15</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`font-semibold ${item.percentage >= 90 ? 'text-green-600' :
                              item.percentage >= 80 ? 'text-blue-600' :
                                item.percentage >= 70 ? 'text-yellow-600' :
                                  'text-red-600'
                              }`}>
                              {item.percentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.hasData ? 'Yes' : 'No'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No Report Gov rankings available for this period.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
