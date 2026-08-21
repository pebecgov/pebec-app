"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useUserRole } from "@/lib/useUserRole";
import { useRouter } from "next/navigation";
import { mdasList } from "@/components/mdaList";
import { MenuItem, Select } from "@mui/material";
import { toast } from "sonner";

import { generateRegionalAveragesPDF, RegionalAverageRow } from "@/lib/regionalAveragesPdf";
import { geopoliticalRegions, stateRegions } from "@/lib/stateRegions";

import ScoringTab from "./components/scoring/ScoringTab";
import { BulkPdfDownloader } from "@/components/Admin/BulkPdfDownloader";

// Import utility files
import { generateDashboardPDF } from "@/lib/dashboardPdfGenerator";
import {
  STATE_OVERALL_MAX_SCORE,
} from "./utils/constants";

import {
  normalizeStateLabel,
  findMatchingMdaName,
} from "./utils/helpers";

import LiveDashboardTab from "./components/tabs/LiveDashboardTab";
import ConfigurationTab from "./components/tabs/ConfigurationTab";



export default function ScoringMetricsPage() {
  const { isLoaded } = useUser();
  const { role, isLoading } = useUserRole();

  // State variables
  const [activeTab, setActiveTab] = useState('live-dashboard');
  const currentYear = new Date().getFullYear();
  const [scoringYear, setScoringYear] = useState(currentYear);
  const [scoringHalf, setScoringHalf] = useState<'1st Half' | '2nd Half'>('1st Half');
  // For 2025, use half-year periods. For 2026+, use full year.
  const scoringPeriod = scoringYear === 2025 ? `${scoringHalf} ${scoringYear}` : String(scoringYear);
  // Live Dashboard state
  const [dashboardYear, setDashboardYear] = useState(new Date().getFullYear());
  const [sortColumn, setSortColumn] = useState<string>('totalScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedMetric, setSelectedMetric] = useState<string>('totalScore');
  const [mdaFilter, setMdaFilter] = useState<'all' | 'withData'>('all');
  const [ministryFilter, setMinistryFilter] = useState<'all' | 'ministries-only' | 'without-ministries'>('all');


  // View Details Modal state
  const [viewDetailsMda, setViewDetailsMda] = useState<string | null>(null);
  const [viewDetailsRow, setViewDetailsRow] = useState<any>(null);
  const [viewDetailsData, setViewDetailsData] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const convex = useConvex();


  // Convex queries
  const mdasWithScores = useQuery(api.mda_scoring.getMDAsWithScores, {});
  const mdaLeaderboard = useQuery(api.mda_scoring.getMDALeaderboard, { limit: 20 });
  // Live Dashboard query
  const liveDashboardData = useQuery(api.mda_scoring.getAllMdaSavedDataForDashboard, { year: dashboardYear });

  // State scores (used for regional average PDF)
  const stateScores = useQuery(api.saveStateScore.getStateScores, {});
  // Fetch all configurations for the selected year
  const allConfigs = useQuery(api.scoring_config.getAllConfigurationsForYear, { year: dashboardYear });

  // Extract specific configs from allConfigs for clarity
  const efficiencyConfig = allConfigs?.efficiencyPeriod;
  const penaltyConfig = allConfigs?.penaltyItems;
  const mysteryConfig = allConfigs?.mysteryShoppingTypes;
  const transparencyItems = allConfigs?.othersItems;
  const innovationItems = allConfigs?.innovationItems;
  const stakeholderItems = allConfigs?.stakeholderItems;

  // Combine others items for dashboard table (columns)
  const othersConfig = useMemo(() => {
    if (!allConfigs) return undefined;
    return [
      ...(transparencyItems || []),
      ...(innovationItems || []),
      ...(stakeholderItems || [])
    ].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [allConfigs, transparencyItems, innovationItems, stakeholderItems]);

  // Detailed data query for view modal
  const detailedScoringData = useQuery(
    api.mda_scoring.getMdaDetailedScoringData,
    viewDetailsMda ? { mdaName: viewDetailsMda, year: dashboardYear } : "skip"
  );

  // Update loading state when data arrives
  useEffect(() => {
    if (viewDetailsMda) {
      if (detailedScoringData === undefined) {
        setIsLoadingDetails(true);
      } else {
        setIsLoadingDetails(false);
        setViewDetailsData(detailedScoringData);
      }
    } else {
      setViewDetailsData(null);
      setViewDetailsRow(null);
      setIsLoadingDetails(false);
    }
  }, [detailedScoringData, viewDetailsMda]);

  const regionalAverages = useMemo<RegionalAverageRow[] | null>(() => {
    if (stateScores === undefined) {
      return null;
    }

    const stateTotals: Record<string, number> = {};
    if (Array.isArray(stateScores)) {
      stateScores.forEach((entry: any) => {
        const normalizedState = normalizeStateLabel(entry?.state);
        if (!normalizedState) return;
        stateTotals[normalizedState] = (stateTotals[normalizedState] ?? 0) + (entry.score || 0);
      });
    }

    const regionBuckets: Record<string, { statesDetailed: RegionalAverageRow["statesDetailed"] }> =
      {};
    geopoliticalRegions.forEach((region) => {
      regionBuckets[region] = { statesDetailed: [] };
    });

    Object.entries(stateRegions).forEach(([state, region]) => {
      if (!regionBuckets[region]) {
        regionBuckets[region] = { statesDetailed: [] };
      }
      const hasRecord = Object.prototype.hasOwnProperty.call(stateTotals, state);
      const stateScore = hasRecord ? stateTotals[state] : 0;
      const statePercentage =
        STATE_OVERALL_MAX_SCORE > 0 ? (stateScore / STATE_OVERALL_MAX_SCORE) * 100 : 0;
      regionBuckets[region].statesDetailed.push({
        state,
        score: stateScore,
        percentage: statePercentage,
        hasData: hasRecord,
      });
    });

    const results: RegionalAverageRow[] = geopoliticalRegions
      .map((region) => {
        const bucket = regionBuckets[region];
        if (!bucket) return null;
        const totalStates = bucket.statesDetailed.length;
        const totalScore = bucket.statesDetailed.reduce((sum, state) => sum + state.score, 0);
        const averageScore = totalStates > 0 ? totalScore / totalStates : 0;
        const averagePercentage =
          STATE_OVERALL_MAX_SCORE > 0 ? (averageScore / STATE_OVERALL_MAX_SCORE) * 100 : 0;

        return {
          region,
          averageScore,
          averagePercentage,
          totalScore,
          statesDetailed: bucket.statesDetailed,
        };
      })
      .filter((row): row is RegionalAverageRow => Boolean(row));

    // Capture any states present in data but not mapped (should be none, but keeps the report complete)
    return results;
  }, [stateScores]);

  // Helper function to check if an MDA is a ministry
  const isMinistry = (mdaName: string): boolean => {
    if (!mdaName) return false;
    const lowerName = mdaName.toLowerCase();
    return lowerName.includes('ministry') || lowerName.includes('minister');
  };

  // Helper function to process and filter MDA data for dashboard
  const processDashboardMdaData = (filter: 'all' | 'withData' = 'all', ministryFilterType: 'all' | 'ministries-only' | 'without-ministries' = 'all') => {
    const normalizeMdaKey = (name: string) =>
      String(name || "")
        .toLowerCase()
        .replace(/[–—]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

    const splitMdaNameForMatch = (name: string) => {
      const normalized = normalizeMdaKey(name);
      const parts = normalized.split(" - ").map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return { abbr: parts[0], fullName: parts.slice(1).join(" - ") };
      }
      return { fullName: normalized };
    };

    const yearExclusionLookup = (() => {
      const map = new Map<string, Set<string>>();
      const rows = (allConfigs?.metricExclusions || []) as Array<{ mdaName: string; excludedMetrics: string[] }>;
      rows.forEach((row) => {
        const set = new Set(row.excludedMetrics || []);
        const normalized = normalizeMdaKey(row.mdaName);
        const parts = splitMdaNameForMatch(row.mdaName);
        map.set(normalized, set);
        if (parts.fullName) map.set(parts.fullName, set);
        if (parts.abbr) map.set(parts.abbr, set);
      });
      return map;
    })();

    const getExcludedMetricsForMda = (mdaName: string): string[] => {
      const normalized = normalizeMdaKey(mdaName);
      const parts = splitMdaNameForMatch(mdaName);
      const set =
        yearExclusionLookup.get(normalized) ||
        (parts.fullName ? yearExclusionLookup.get(parts.fullName) : undefined) ||
        (parts.abbr ? yearExclusionLookup.get(parts.abbr) : undefined);
      return Array.from(set || []);
    };

    const baseMaxPoints = (() => {
      if (dashboardYear < 2026) return 80;
      const efficiencyTotal = (efficiencyConfig?.slaPoints || 30) +
        (efficiencyConfig?.reportSubmissionPoints || 3) +
        (efficiencyConfig?.reportGovPoints || 15) +
        (efficiencyConfig?.timelinessPoints || 2);
      const mysteryTotal = 20;
      const othersTotal = (othersConfig || []).reduce((sum: number, item: any) => sum + (item.weight || 0), 0) || 25;
      return efficiencyTotal + mysteryTotal + othersTotal;
    })();

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
        timeliness: null,
        others: null,
        penalties: null,
        totalScore: 0,
        totalPercentage: 0,
        maxPossiblePoints: baseMaxPoints,
        excludedMetrics: getExcludedMetricsForMda(mda.name)
      });
    });

    // Merge with saved data from backend
    const dashboardItems = liveDashboardData?.data || [];
    if (dashboardItems && Array.isArray(dashboardItems)) {
      dashboardItems.forEach((mda: any) => {
        // Find matching MDA name from mdasList
        const matchingMdaName = findMatchingMdaName(mda.mdaName);

        // Only include MDAs that are in mdasList
        if (matchingMdaName && allMdasMap.has(matchingMdaName)) {
          const existing = allMdasMap.get(matchingMdaName);

          // Merge metric data intelligently - prefer non-null values, new data takes precedence if both exist
          const merged = {
            ...existing,
            mdaName: matchingMdaName, // Use the canonical name from mdasList
            sla: mda.sla != null ? mda.sla : existing.sla,
            mysteryShopping: mda.mysteryShopping != null ? mda.mysteryShopping : existing.mysteryShopping,
            controversial: mda.controversial != null ? mda.controversial : existing.controversial,
            toutingRentseeking: mda.toutingRentseeking != null ? mda.toutingRentseeking : existing.toutingRentseeking,
            innovation: mda.innovation != null ? mda.innovation : existing.innovation,
            stakeholder: mda.stakeholder != null ? mda.stakeholder : existing.stakeholder,
            transparency: mda.transparency != null ? mda.transparency : existing.transparency,
            others: mda.others != null ? mda.others : existing.others,
            penalties: mda.penalties != null ? mda.penalties : existing.penalties,
            reportGovResolution: mda.reportGovResolution != null ? {
              ...mda.reportGovResolution,
              // Preserve all fields including hasFirstHalf, hasSecondHalf, firstHalfScore, secondHalfScore
            } : existing.reportGovResolution,
            monthlyReport: mda.monthlyReport != null ? mda.monthlyReport : existing.monthlyReport,
            timeliness: mda.timeliness != null ? mda.timeliness : existing.timeliness,
            totalGrossScore: mda.totalGrossScore != null ? mda.totalGrossScore : existing.totalGrossScore,
            totalScore: mda.totalScore != null ? mda.totalScore : existing.totalScore,
            totalPercentage: mda.totalPercentage != null ? mda.totalPercentage : existing.totalPercentage,
            maxPossiblePoints: mda.maxPossiblePoints != null ? mda.maxPossiblePoints : existing.maxPossiblePoints,
            excludedMetrics: (() => {
              // Prefer local year exclusion config as source of truth.
              const local = getExcludedMetricsForMda(matchingMdaName);
              if (local.length > 0) return local;
              return Array.isArray(mda.excludedMetrics) ? mda.excludedMetrics : (existing.excludedMetrics || []);
            })()
          };

          allMdasMap.set(matchingMdaName, merged);
        }
      });
    }

    // Convert to array and calculate total scores
    let allMdasArray = Array.from(allMdasMap.values()).map((mda: any) => {
      const excludedMetricSet = new Set<string>(mda.excludedMetrics || []);
      const isExcluded = (metricKey: string) => excludedMetricSet.has(metricKey);
      const isOthersItemExcluded = (itemId: string) =>
        excludedMetricSet.has("others") || excludedMetricSet.has(`others:${itemId}`);
      // Recalculate SLA score based on 10 months instead of 12
      let slaScore = isExcluded("sla") ? 0 : (mda.sla?.score || 0);
      if (mda.sla && mda.sla.monthsWithData) {
        // Recalculate: if backend calculated based on 12 months, we need to adjust to 10 months
        // Backend: score = (monthsWithData * (30/12)) * percentage = monthsWithData * 2.5 * percentage
        // Frontend (10 months): score = (monthsWithData * (30/10)) * percentage = monthsWithData * 3 * percentage
        // Adjustment factor: (30/10) / (30/12) = 3 / 2.5 = 1.2
        // But we need to recalculate from raw data if available
        if (mda.sla.monthsWithData > 0) {
          // If we have the raw totalScore and monthsWithData, recalculate
          const pointsPerMonth10 = 30 / 10; // 3 points per month
          const pointsPerMonth12 = 30 / 12; // 2.5 points per month (backend calculation)
          // Backend score was calculated as: (monthsWithData * pointsPerMonth12) * percentage
          // We need: (monthsWithData * pointsPerMonth10) * percentage
          // So: newScore = oldScore * (pointsPerMonth10 / pointsPerMonth12)
          slaScore = mda.sla.score * (pointsPerMonth10 / pointsPerMonth12);
        }
      } else if (dashboardYear >= 2026 && efficiencyConfig) {
        // For 2026+, specific recalculation if needed, otherwise rely on backend score
        // Currently assuming backend/ScoringTab saves correct score based on dynamic config
      }

      // Recalculate Monthly Report score based on 10 months instead of 12
      let monthlyReportScore = isExcluded("reportSubmission") ? 0 : (mda.monthlyReport?.score || 0);
      if (mda.monthlyReport && mda.monthlyReport.monthsWithData) {
        const pointsPerMonth10 = 3 / 10; // 0.3 points per month
        const pointsPerMonth12 = 3 / 12; // 0.25 points per month (backend calculation)
        monthlyReportScore = mda.monthlyReport.score * (pointsPerMonth10 / pointsPerMonth12);
      }

      // Recalculate Timeliness score based on 10 months instead of 12
      let timelinessScore = isExcluded("timeliness") ? 0 : (mda.timeliness?.score || 0);
      if (mda.timeliness && mda.timeliness.monthsWithData) {
        const pointsPerMonth10 = 2 / 10; // 0.2 points per month
        const pointsPerMonth12 = 2 / 12; // 0.167 points per month (backend calculation)
        timelinessScore = mda.timeliness.score * (pointsPerMonth10 / pointsPerMonth12);
      }

      const mysteryScore = isExcluded("mystery") ? 0 : (mda.mysteryShopping?.score || 0);
      const innovationScore = isExcluded("innovation") ? 0 : (mda.innovation?.score || 0);
      const stakeholderScore = isExcluded("stakeholder") ? 0 : (mda.stakeholder?.score || 0);
      const transparencyScore = isExcluded("transparency") ? 0 : (mda.transparency?.score || 0);
      const reportGovResScore = isExcluded("reportGov") ? 0 : (mda.reportGovResolution?.score || 0);
      let othersScore = isExcluded("others") ? 0 : (mda.others?.score || 0);
      if (!isExcluded("others") && othersConfig && mda.others?.scores) {
        const excludedOthersScore = (othersConfig || []).reduce((sum: number, item: any) => {
          if (!isOthersItemExcluded(item.itemId)) return sum;
          return sum + (mda.others?.scores?.[item.itemId] || 0);
        }, 0);
        othersScore = Math.max(0, othersScore - excludedOthersScore);
      }

      // Calculate base total score (all metrics except controversial and touting & rentseeking/penalties)
      let baseTotalScore = 0;
      if (dashboardYear < 2026) {
        baseTotalScore = slaScore + mysteryScore + innovationScore + stakeholderScore +
          transparencyScore + reportGovResScore + monthlyReportScore + timelinessScore;
      } else {
        // Dynamic Calculation 2026+: othersScore replaces legacy metrics
        baseTotalScore = slaScore + mysteryScore + othersScore + reportGovResScore + monthlyReportScore + timelinessScore;
      }

      // Controversial: Handle both old and new data formats
      // OLD FORMAT: isControversial=false â†’ score=5, isControversial=true â†’ score=0
      // NEW FORMAT: isControversial=false â†’ score=0, isControversial=true â†’ score=-5
      let controversialScore = isExcluded("controversial") ? 0 : (mda.controversial?.score || 0);

      // Detect old format: if score is positive (5) or zero with isControversial flag
      if (mda.controversial) {
        const isOldFormat = controversialScore >= 0 && controversialScore <= 5;

        if (isOldFormat) {
          // Convert old format to new format
          if (mda.controversial.isControversial) {
            // Old: true â†’ 0, New: true â†’ -5
            controversialScore = -5;
          } else {
            // Old: false â†’ 5, New: false â†’ 0
            controversialScore = 0;
          }
        }
      }

      // Touting & Rentseeking: If Yes (true), score is -10. If No (false), score is 0.
      let toutingRentseekingScore = isExcluded("toutingRentseeking") ? 0 : (mda.toutingRentseeking?.score || 0);

      // Calculate penalties
      let penaltyValue = 0;
      if (dashboardYear < 2026) {
        const controversialPenalty = controversialScore < 0 ? Math.abs(controversialScore) : 0;
        const toutingRentseekingPenalty = toutingRentseekingScore < 0 ? Math.abs(toutingRentseekingScore) : 0;
        penaltyValue = controversialPenalty + toutingRentseekingPenalty;
      } else {
        // penalties.score is already negative or raw points to subtract
        penaltyValue = isExcluded("penalties") ? 0 : Math.abs(mda.penalties?.score || 0);
      }

      const totalScore = baseTotalScore - penaltyValue;

      // Check if optional metrics are skipped
      const isReportGovSkipped = mda.reportGovResolution?.isSkipped || false;
      const isTransparencySkipped = mda.transparency?.isSkipped || false;

      // Recompute max points from active yearly metric totals and per-MDA exclusions.
      // This guarantees denominator reflects exclusions even for empty/no-data rows.
      let maxPossiblePoints = baseMaxPoints;
      if (isTransparencySkipped) maxPossiblePoints -= 5;
      if (isReportGovSkipped) maxPossiblePoints -= (dashboardYear < 2026 ? 15 : (efficiencyConfig?.reportGovPoints || 15));
      if (isExcluded("sla")) maxPossiblePoints -= 30;
      if (isExcluded("mystery")) maxPossiblePoints -= 20;
      if (isExcluded("innovation")) maxPossiblePoints -= 5;
      if (isExcluded("transparency")) maxPossiblePoints -= 5;
      if (isExcluded("reportGov")) maxPossiblePoints -= (dashboardYear < 2026 ? 15 : (efficiencyConfig?.reportGovPoints || 15));
      if (isExcluded("reportSubmission")) maxPossiblePoints -= (dashboardYear < 2026 ? 3 : (efficiencyConfig?.reportSubmissionPoints || 3));
      if (isExcluded("timeliness")) maxPossiblePoints -= (dashboardYear < 2026 ? 2 : (efficiencyConfig?.timelinessPoints || 2));
      if (dashboardYear >= 2026 && isExcluded("others")) {
        const othersTotal = (othersConfig || []).reduce((sum: number, item: any) => sum + (item.weight || 0), 0) || 25;
        maxPossiblePoints -= othersTotal;
      } else if (dashboardYear >= 2026 && othersConfig) {
        const excludedOthersWeight = (othersConfig || []).reduce((sum: number, item: any) => {
          if (isOthersItemExcluded(item.itemId)) return sum + (item.weight || 0);
          return sum;
        }, 0);
        maxPossiblePoints -= excludedOthersWeight;
      }
      maxPossiblePoints = Math.max(0, maxPossiblePoints);

      const totalPercentage = maxPossiblePoints > 0
        ? (totalScore / maxPossiblePoints) * 100
        : 0;

      return {
        ...mda,
        sla: mda.sla ? { ...mda.sla, score: slaScore } : mda.sla,
        monthlyReport: mda.monthlyReport ? { ...mda.monthlyReport, score: monthlyReportScore } : mda.monthlyReport,
        timeliness: mda.timeliness ? { ...mda.timeliness, score: timelinessScore } : mda.timeliness,
        totalGrossScore: baseTotalScore,
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

    // Filter based on ministry filter
    if (ministryFilterType === 'ministries-only') {
      allMdasArray = allMdasArray.filter((mda: any) => isMinistry(mda.mdaName));
    } else if (ministryFilterType === 'without-ministries') {
      allMdasArray = allMdasArray.filter((mda: any) => !isMinistry(mda.mdaName));
    }

    return allMdasArray;
  };

  // Handle dashboard PDF generation
  const handleGenerateDashboardPDF = async () => {
    if (!liveDashboardData?.data || !Array.isArray(liveDashboardData.data)) {
      return;
    }

    // Process and filter data based on current filter
    const processedData = processDashboardMdaData(mdaFilter, ministryFilter);

    // Convert back to the format expected by PDF generator
    const filteredLiveData = processedData.map((mda: any) => ({
      mdaName: mda.mdaName,
      sla: mda.sla,
      mysteryShopping: mda.mysteryShopping,
      controversial: mda.controversial,
      toutingRentseeking: mda.toutingRentseeking,
      innovation: mda.innovation,
      stakeholder: mda.stakeholder,
      transparency: mda.transparency,
      reportGovResolution: mda.reportGovResolution,
      monthlyReport: mda.monthlyReport,
      timeliness: mda.timeliness
    }));

    await generateDashboardPDF({
      liveDashboardData: filteredLiveData,
      selectedMetric,
      dashboardYear,
      mdasList,
      filterType: mdaFilter === 'withData' || ministryFilter !== 'all' ? 'withData' : 'all'
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
      overallMaxScore: STATE_OVERALL_MAX_SCORE
    });
  };

  // Helper functions now imported from utils/helpers.ts




  if (isLoading || !isLoaded) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (role !== "admin" && role !== "staff") {
    return <div className="text-red-500 text-center mt-10">Unauthorized access</div>;
  }





  return (
    <div className="flex flex-col items-center text-black p-4 w-full min-h-screen bg-gray-100">
      <div className="w-full flex flex-col items-center bg-white rounded-lg p-6">
        {/* Header */}
        <div className="w-full flex items-center justify-between px-4 py-2 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">MDA Scoring Metrics</h1>
          <div className="flex gap-4">
            <Select
              value={scoringYear}
              onChange={(e) => setScoringYear(Number(e.target.value))}
              className="min-w-[120px]"
            >
              {[2025, 2026].map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
            {/* Only show half-year selector for 2025 (legacy system) */}
            {scoringYear === 2025 && (
              <Select
                value={scoringHalf}
                onChange={(e) => setScoringHalf(e.target.value as '1st Half' | '2nd Half')}
                className="min-w-[130px]"
              >
                <MenuItem value="1st Half">1st Half</MenuItem>
                <MenuItem value="2nd Half">2nd Half</MenuItem>
              </Select>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="w-full mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {/* <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Dashboard
              </button> */}
              <button
                onClick={() => setActiveTab('live-dashboard')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'live-dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Live Dashboard
              </button>
              <button
                onClick={() => setActiveTab('scoring')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'scoring'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Score MDAs
              </button>
              <button
                onClick={() => setActiveTab('configuration')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'configuration'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Configuration
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {/* {activeTab === 'dashboard' ? (
          <div className="w-full space-y-6">
            <ScoringMetricsDashboard />
            
            MDA Leaderboard
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">MDA Performance Leaderboard</h2>
              
              {mdaLeaderboard && mdaLeaderboard.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MDA Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Scored</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {mdaLeaderboard.map((mda, index) => (
                        <tr key={mda.mdaName} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              {mda.mdaName}
                              {mda.isActiveOnPlatform ? (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Active
                                </span>
                              ) : (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              mda.status === 'Compliant' 
                                ? 'bg-green-100 text-green-800' 
                                : mda.status === 'Non-Compliant'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {mda.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    mda.currentScore >= 90 ? 'bg-green-500' :
                                    mda.currentScore >= 80 ? 'bg-blue-500' :
                                    mda.currentScore >= 70 ? 'bg-yellow-500' :
                                    mda.currentScore >= 60 ? 'bg-orange-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(mda.currentScore, 100)}%` }}
                                ></div>
                              </div>
                              <span className="font-medium">{mda.currentScore.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              mda.grade === 'A' ? 'bg-green-100 text-green-800' :
                              mda.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                              mda.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                              mda.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                              mda.grade === 'F' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {mda.grade}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {mda.lastScoredAt ? new Date(mda.lastScoredAt).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {mda.scoringPeriod}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No MDA scores available yet. Start scoring MDAs to see the leaderboard!</p>
                </div>
              )}
            </div>
          </div>
        ) : */}
        {activeTab === 'live-dashboard' ? (
          <LiveDashboardTab
            liveDashboardData={liveDashboardData}
            efficiencyConfig={efficiencyConfig}
            othersConfig={othersConfig}
            penaltyConfig={penaltyConfig}
            mysteryConfig={mysteryConfig}
            selectedMetric={selectedMetric}
            setSelectedMetric={setSelectedMetric}
            mdaFilter={mdaFilter}
            setMdaFilter={setMdaFilter}
            ministryFilter={ministryFilter}
            setMinistryFilter={setMinistryFilter}
            dashboardYear={dashboardYear}
            setDashboardYear={setDashboardYear}
            currentYear={currentYear}
            viewDetailsMda={viewDetailsMda}
            setViewDetailsMda={setViewDetailsMda}
            viewDetailsRow={viewDetailsRow}
            setViewDetailsRow={setViewDetailsRow}
            viewDetailsData={viewDetailsData}
            setViewDetailsData={setViewDetailsData}
            isLoadingDetails={isLoadingDetails}
            setIsLoadingDetails={setIsLoadingDetails}
            processDashboardMdaData={processDashboardMdaData}
            handleGenerateDashboardPDF={handleGenerateDashboardPDF}
            convex={convex}
          />
        ) : activeTab === 'configuration' ? (
          <ConfigurationTab
            currentYear={scoringYear}
            onYearChange={(year) => setScoringYear(year)}
          />
        ) : (
          <ScoringTab
            mdasList={mdasList}
            mdasWithScores={mdasWithScores || []}
            scoringPeriod={scoringPeriod}
            currentYear={currentYear}
            userRole={role ?? undefined}
          />
        )}
      </div>
    </div>
  );
}
