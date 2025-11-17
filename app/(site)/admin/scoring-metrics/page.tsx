"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useUserRole } from "@/lib/useUserRole";
import { useRouter } from "next/navigation";
import { mdasList } from "@/components/mdaList";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import ScoringMetricsDashboard from "@/components/Admin/ScoringMetricsDashboard";
import { generateMdaScoringPDF } from "@/lib/pdfGenerator";
import { generateDashboardPDF } from "@/lib/dashboardPdfGenerator";

// Result Table Component
const ResultTable = ({ results, overallPercentage }: { results: any[], overallPercentage: number | null }) => {
  if (!results || results.length === 0) return null;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex items-center justify-end mb-4">
          {overallPercentage !== null && (
            <div className="bg-blue-100 px-4 py-2 rounded-lg mr-4">
              <span className="font-bold">Overall Performance: </span>
              <span className="text-blue-800 font-bold text-lg">
                {overallPercentage.toFixed(2)}%
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {Object.keys(results[0]).map((key) => (
                  <th
                    key={key}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  {Object.entries(row).map(([key, value], j) => (
                    <td
                      key={j}
                      className={`px-6 py-4 whitespace-nowrap text-sm ${
                        key === "STATUS"
                          ? value === "Delayed"
                            ? "text-red-600 font-bold"
                            : "text-green-600 font-bold"
                          : key === "PERFORMANCE %"
                          ? String(value).includes("N/A")
                            ? "text-gray-500"
                            : parseFloat(String(value)) >= 90
                            ? "text-green-600 font-bold"
                            : parseFloat(String(value)) >= 80
                            ? "text-yellow-600 font-bold"
                            : "text-red-600 font-bold"
                          : "text-gray-700"
                      }`}
                    >
                      {value === null ? "N/A" : String(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function ScoringMetricsPage() {
  const { user, isLoaded } = useUser();
  const { role, isLoading } = useUserRole();
  const router = useRouter();

  // State variables
  const [activeTab, setActiveTab] = useState('live-dashboard');
  const [selectedMda, setSelectedMda] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [overallPercentage, setOverallPercentage] = useState<number | null>(null);
  const [showModel, setShowModel] = useState(false);
  const [showSlaModal, setShowSlaModal] = useState(false);
  const [mysteryRate, setMysteryRate] = useState(0);
  const [isControversial, setIsControversial] = useState(false);
  const [isInnovative, setIsInnovative] = useState(false);
  const [stakeholderRate, setStakeholderRate] = useState(0);
  const [slaRate, setSlaRate] = useState(0);
  const [slaMethod, setSlaMethod] = useState<'file' | 'rating'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Mystery Shopping Modal States
  const [showMysteryModal, setShowMysteryModal] = useState(false);
  const [mysteryType, setMysteryType] = useState<'hasReportGov' | 'noReportGov'>('hasReportGov');
  const [mysteryRatings, setMysteryRatings] = useState<{[key: string]: number}>({});

  // Mystery Shopping Rating Options
  const ratingOptions = [
    { value: 0, label: 'No Response' },
    { value: 1, label: 'POOR' },
    { value: 2, label: 'FAIR' },
    { value: 3, label: 'AVERAGE' },
    { value: 4, label: 'GOOD' },
    { value: 5, label: 'EXCELLENT' }
  ];

  const yesNoOptions = [
    { value: 0, label: 'No' },
    { value: 1, label: 'Yes' }
  ];

  // Questions for different mystery shopping types
  const hasReportGovQuestions = [
    { key: 'callResponse', label: 'CALL RESPOND RATING', type: 'rating' },
    { key: 'emailResponse', label: 'EMAIL RESPOND RATING', type: 'rating' },
    { key: 'functionalWebsite', label: 'FUNCTIONAL WEBSITE', type: 'yesno' },
    { key: 'csEmails', label: 'CUSTOMER SERVICES (CS) EMAILS LISTED', type: 'yesno' },
    { key: 'csPhone', label: 'CUSTOMER SERVICES (CS) PHONE NUMBER LISTED', type: 'yesno' },
    { key: 'faqAvailable', label: 'FAQ AVAILABLE', type: 'yesno' },
    { key: 'requirementsClear', label: 'REQUIREMENTS/ELIGIBILITY FOR SERVICES CLEARLY OUTLINED', type: 'yesno' },
    { key: 'timelinesClear', label: 'TIMELINES FOR SERVICE DELIVERY CLEARLY INDICATED FOR EACH SERVICE', type: 'yesno' },
    { key: 'costsClear', label: 'COSTS FOR EACH SERVICE CLEARLY INDICATED WITH NO HIDDEN CHARGES', type: 'yesno' },
    { key: 'reportGovDesktop', label: 'REPORTGOV DESKTOP AGENT ONBOARD', type: 'yesno' },
    { key: 'onlineApplication', label: 'AVAILABILITY OF ONLINE APPLICATION/PROCESS', type: 'yesno' },
    { key: 'onlineApproval', label: 'APPROVAL/FACILITY GRANTED ONLINE', type: 'yesno' },
    { key: 'reportGovLink', label: 'REPORTGOV LINK INTEGRATED ON MDA WEBSITE', type: 'yesno' },
    { key: 'satisfaction', label: 'SATISFACTION OF SERVICE THAT IS BEEN TESTED', type: 'rating' }
  ];

  const noReportGovQuestions = [
    { key: 'callResponse', label: 'CALL RESPOND RATING', type: 'rating' },
    { key: 'emailResponse', label: 'EMAIL RESPOND RATING', type: 'rating' },
    { key: 'functionalWebsite', label: 'FUNCTIONAL WEBSITE', type: 'yesno' },
    { key: 'csEmails', label: 'CUSTOMER SERVICES (CS) EMAILS LISTED', type: 'yesno' },
    { key: 'csPhone', label: 'CUSTOMER SERVICES (CS) PHONE NUMBER LISTED', type: 'yesno' },
    { key: 'faqAvailable', label: 'FAQ AVAILABLE', type: 'yesno' },
    { key: 'onlineApplication', label: 'AVAILABILITY OF ONLINE APPLICATION/PROCESS', type: 'yesno' },
    { key: 'onlineApproval', label: 'APPROVAL/FACILITY GRANTED ONLINE', type: 'yesno' },
    { key: 'reportGovLink', label: 'REPORTGOV LINK INTEGRATED ON MDA WEBSITE', type: 'yesno' }
  ];

  const transparencyQuestions: Array<{ key: keyof TransparencyItemsState; label: string }> = [
    { key: 'proactiveDisclosure', label: 'PROACTIVE DISCLOSURE OF SERVICE INFORMATION' },
    { key: 'serviceLevelPublishing', label: 'SERVICE LEVEL STANDARDS PUBLISHED' },
  ];

  // Calculate mystery shopping score
  const calculateMysteryScore = () => {
    const questions = mysteryType === 'hasReportGov' ? hasReportGovQuestions : noReportGovQuestions;
    
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    questions.forEach(question => {
      const rating = mysteryRatings[question.key] || 0;
      
      if (question.type === 'rating') {
        // Rating questions: scale 0-5 to 0-1 point each
        totalScore += (rating / 5) * 1;
        maxPossibleScore += 1;
      } else {
        // Yes/No questions: 1 point for Yes, 0 for No
        totalScore += rating;
        maxPossibleScore += 1;
      }
    });
    
    // Scale to 20 points total
    const scaledScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 20 : 0;
    return Math.min(scaledScore, 20); // Cap at 20
  };

  // Handle mystery rating change
  const handleMysteryRatingChange = (questionKey: string, rating: number) => {
    setMysteryRatings(prev => ({
      ...prev,
      [questionKey]: rating
    }));
  };

  // Reset mystery ratings when type changes
  const handleMysteryTypeChange = (type: 'hasReportGov' | 'noReportGov') => {
    setMysteryType(type);
    setMysteryRatings({});
  };
  
  // Monthly SLA data
  const [monthlySlaData, setMonthlySlaData] = useState<{[key: string]: {
    method: 'file' | 'rating';
    file: File | null;
    rating: number;
    score: number;
    results: any[];
    overallPercentage: number | null;
  }}>({});
  type TransparencyItemsState = {
    proactiveDisclosure: boolean;
    serviceLevelPublishing: boolean;
  };
  const [transparencyItems, setTransparencyItems] = useState<TransparencyItemsState>({
    proactiveDisclosure: false,
    serviceLevelPublishing: false,
  });
  const [reportgovRate, setReportgovRate] = useState(0);
  const [manualReportGovRate, setManualReportGovRate] = useState(0);
  const [useManualReportGov, setUseManualReportGov] = useState(false);
  const [skipReportGov, setSkipReportGov] = useState(false);
  const [skipTransparency, setSkipTransparency] = useState(false);
  
  // Manual Report Gov Resolution inputs
  const [manualTotalTickets, setManualTotalTickets] = useState(0);
  const [manualResolvedTickets, setManualResolvedTickets] = useState(0);
  const [manualAverageResponseTime, setManualAverageResponseTime] = useState(0);
  const [manualAverageResolutionTime, setManualAverageResolutionTime] = useState(0);
  const [showFinalScore, setShowFinalScore] = useState(false);
  const [scoringPeriod, setScoringPeriod] = useState(`1st Half ${new Date().getFullYear()}`);
  const currentYear = new Date().getFullYear();
  const [notes, setNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [processingMonthlyFiles, setProcessingMonthlyFiles] = useState<{[key: string]: boolean}>({});
  
  // Ranking modal states
  const [showMysteryRanking, setShowMysteryRanking] = useState(false);
  const [showSLARanking, setShowSLARanking] = useState(false);
  const [showReportGovRanking, setShowReportGovRanking] = useState(false);
  
  // Live Dashboard state
  const [dashboardYear, setDashboardYear] = useState(new Date().getFullYear());
  const [sortColumn, setSortColumn] = useState<string>('totalScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedMetric, setSelectedMetric] = useState<string>('totalScore');
  const [mdaFilter, setMdaFilter] = useState<'all' | 'withData'>('all');
  
  // View Details Modal state
  const [viewDetailsMda, setViewDetailsMda] = useState<string | null>(null);
  const [viewDetailsData, setViewDetailsData] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  const convex = useConvex();
  
  // Manual monthly report overrides
  const [manualMonthlyReports, setManualMonthlyReports] = useState<{[key: string]: boolean}>({});
  const [useManualMonthlyReports, setUseManualMonthlyReports] = useState(false);
  
  // Manual timeliness overrides
  const [manualTimeliness, setManualTimeliness] = useState<{[key: string]: boolean}>({});
  const [useManualTimeliness, setUseManualTimeliness] = useState(false);

  // Convex queries and mutations
  const mdasWithScores = useQuery(api.mda_scoring.getMDAsWithScores, {});
  const scoringAnalytics = useQuery(api.mda_scoring.getScoringAnalytics, {});
  const calculateScore = useMutation(api.mda_scoring.calculateAndSaveMDAScore);
  const mdaLeaderboard = useQuery(api.mda_scoring.getMDALeaderboard, { limit: 20 });
  const matchHeaders = useAction(api.ai_helper_scoring.matchHeaders);
  const processSlaData = useAction(api.ai_helper_scoring.processSlaData);
  const mdaScoringStatus = useQuery(
    api.mda_scoring.checkMdaScoringStatus, 
    selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
  );
  const allMdaScoringStatuses = useQuery(
    api.mda_scoring.getAllMdaScoringStatuses, 
    { scoringPeriod }
  );
  
  // New queries for saved data
  const savedSLAData = useQuery(
    api.mda_scoring.getSLAData,
    selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
  );
  const savedReportGovData = useQuery(
    api.mda_scoring.getReportGovData,
    selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
  );
  const savedMysteryShoppingData = useQuery(
    api.mda_scoring.getMysteryShoppingData,
    selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
  );
  const savedControversialData = useQuery(
    api.mda_scoring.getControversialData,
    selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
  );
  const savedInnovationData = useQuery(
    api.mda_scoring.getInnovationData,
    selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
  );
  const savedStakeholderData = useQuery(
    api.mda_scoring.getStakeholderData,
    selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
  );
  type ExtendedMdaScoringApi = typeof api.mda_scoring & {
    getTransparencyData: any;
    saveTransparencyData: any;
  };
  const mdaScoringApi = api.mda_scoring as ExtendedMdaScoringApi;
  const savedTransparencyData = useQuery(
    mdaScoringApi.getTransparencyData,
    selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
  );
  const savedMonthlyReportData = useQuery(
    api.mda_scoring.getMonthlyReportData,
    selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
  );
  const savedTimelinessData = useQuery(
    api.mda_scoring.getTimelinessData,
    selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
  );
  
  // Loading states for saved data
  const isLoadingSLAData = selectedMda && savedSLAData === undefined;
  const isLoadingReportGovData = selectedMda && savedReportGovData === undefined;
  const isLoadingMysteryShoppingData = selectedMda && savedMysteryShoppingData === undefined;
  const isLoadingControversialData = selectedMda && savedControversialData === undefined;
  const isLoadingInnovationData = selectedMda && savedInnovationData === undefined;
  const isLoadingStakeholderData = selectedMda && savedStakeholderData === undefined;
  const isLoadingTransparencyData = selectedMda && savedTransparencyData === undefined;
  const isLoadingMonthlyReportData = selectedMda && savedMonthlyReportData === undefined;
  const isLoadingTimelinessData = selectedMda && savedTimelinessData === undefined;
  
  // New mutations for saving data
  const saveSLAData = useMutation(api.mda_scoring.saveSLAData);
  const saveReportGovData = useMutation(api.mda_scoring.saveReportGovData);
  const saveMysteryShoppingData = useMutation(api.mda_scoring.saveMysteryShoppingData);
  const saveControversialData = useMutation(api.mda_scoring.saveControversialData);
  const saveInnovationData = useMutation(api.mda_scoring.saveInnovationData);
  const saveStakeholderData = useMutation(api.mda_scoring.saveStakeholderData);
  const saveTransparencyData = useMutation(mdaScoringApi.saveTransparencyData);
  const saveMonthlyReportData = useMutation(api.mda_scoring.saveMonthlyReportData);
  const saveTimelinessData = useMutation(api.mda_scoring.saveTimelinessData);
  
  // Ranking queries
  const mysteryRankings = useQuery(api.mda_scoring.getAllMysteryShoppingRankings, { scoringPeriod });
  const slaRankings = useQuery(api.mda_scoring.getAllSLARankings, { scoringPeriod });
  const reportGovRankings = useQuery(api.mda_scoring.getAllReportGovRankings, { scoringPeriod });
  
  // Live Dashboard query
  const liveDashboardData = useQuery(api.mda_scoring.getAllMdaSavedDataForDashboard, { year: dashboardYear });
  
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
      setIsLoadingDetails(false);
    }
  }, [detailedScoringData, viewDetailsMda]);

  // Helper function to process and filter MDA data for dashboard
  const processDashboardMdaData = (filter: 'all' | 'withData' = 'all') => {
    // Initialize all MDAs from mdasList with null data
    const allMdasMap = new Map<string, any>();
    mdasList.forEach(mda => {
      allMdasMap.set(mda.name, {
        mdaName: mda.name,
        sla: null,
        mysteryShopping: null,
        controversial: null,
        innovation: null,
        stakeholder: null,
        transparency: null,
        reportGovResolution: null,
        monthlyReport: null,
        timeliness: null,
        totalScore: 0,
        totalPercentage: 0
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
          
          // Merge metric data intelligently - prefer non-null values, new data takes precedence if both exist
          const merged = {
            ...existing,
            mdaName: matchingMdaName, // Use the canonical name from mdasList
            sla: mda.sla != null ? mda.sla : existing.sla,
            mysteryShopping: mda.mysteryShopping != null ? mda.mysteryShopping : existing.mysteryShopping,
            controversial: mda.controversial != null ? mda.controversial : existing.controversial,
            innovation: mda.innovation != null ? mda.innovation : existing.innovation,
            stakeholder: mda.stakeholder != null ? mda.stakeholder : existing.stakeholder,
            transparency: mda.transparency != null ? mda.transparency : existing.transparency,
            reportGovResolution: mda.reportGovResolution != null ? {
              ...mda.reportGovResolution,
              // Preserve all fields including hasFirstHalf, hasSecondHalf, firstHalfScore, secondHalfScore
            } : existing.reportGovResolution,
            monthlyReport: mda.monthlyReport != null ? mda.monthlyReport : existing.monthlyReport,
            timeliness: mda.timeliness != null ? mda.timeliness : existing.timeliness,
          };
          
          allMdasMap.set(matchingMdaName, merged);
        }
      });
    }

    // Convert to array and calculate total scores
    let allMdasArray = Array.from(allMdasMap.values()).map((mda: any) => {
      // Recalculate SLA score based on 10 months instead of 12
      let slaScore = mda.sla?.score || 0;
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
      const controversialScore = mda.controversial?.score || 0;
      const innovationScore = mda.innovation?.score || 0;
      const stakeholderScore = mda.stakeholder?.score || 0;
      const transparencyScore = mda.transparency?.score || 0;
      const reportGovResScore = mda.reportGovResolution?.score || 0;
      
      const totalScore = slaScore + mysteryScore + controversialScore + innovationScore + stakeholderScore + 
                        transparencyScore + reportGovResScore + monthlyReportScore + timelinessScore;
      
      // Check if optional metrics are skipped
      const isReportGovSkipped = mda.reportGovResolution?.isSkipped || false;
      const isTransparencySkipped = mda.transparency?.isSkipped || false;
      let maxPossiblePoints = 100;
      if (isTransparencySkipped) {
        maxPossiblePoints -= 10;
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
        return mda.sla || mda.mysteryShopping || mda.controversial || 
               mda.innovation || mda.stakeholder || mda.transparency || mda.reportGovResolution || 
               mda.monthlyReport || mda.timeliness || mda.totalScore > 0;
      });
    }

    return allMdasArray;
  };

  // Handle dashboard PDF generation
  const handleGenerateDashboardPDF = async () => {
    if (!liveDashboardData || !Array.isArray(liveDashboardData)) {
      return;
    }
    
    // Process and filter data based on current filter
    const processedData = processDashboardMdaData(mdaFilter);
    
    // Convert back to the format expected by PDF generator
    const filteredLiveData = processedData.map((mda: any) => ({
      mdaName: mda.mdaName,
      sla: mda.sla,
      mysteryShopping: mda.mysteryShopping,
      controversial: mda.controversial,
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
      filterType: mdaFilter
    });
  };

  // Helper function to sanitize MDA names (same as backend)
  const sanitizeMdaName = (mdaName: string): string => {
    return mdaName
      .replace(/[–—]/g, '-') // Replace em dash and en dash with regular dash
      .replace(/[^\w\s-]/g, '') // Remove all non-word characters except spaces and dashes
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/-+/g, '_') // Replace multiple dashes with underscores
      .toLowerCase();
  };

  // Helper function to strip abbreviation prefix from MDA names (e.g., "FME - Federal Ministry" -> "Federal Ministry")
  const stripAbbreviation = (mdaName: string): string => {
    if (!mdaName) return mdaName;
    // Remove pattern like "ABC - " or "ABC -" from the start
    const match = mdaName.match(/^[A-Z]+ - (.+)$/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return mdaName.trim();
  };

  // Helper function to normalize MDA names for comparison (removes extra spaces, handles variations)
  const normalizeMdaName = (mdaName: string): string => {
    if (!mdaName) return '';
    return mdaName
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[–—]/g, '-') // Replace em dash and en dash with regular dash
      .toLowerCase();
  };

  // Helper function to find matching MDA from mdasList given a backend MDA name
  const findMatchingMdaName = (backendMdaName: string): string | null => {
    if (!backendMdaName) return null;
    
    const normalizedBackend = normalizeMdaName(backendMdaName);
    const strippedBackend = normalizeMdaName(stripAbbreviation(backendMdaName));
    
    // Try to find exact match first
    for (const mda of mdasList) {
      const normalizedList = normalizeMdaName(mda.name);
      const strippedList = normalizeMdaName(stripAbbreviation(mda.name));
      
      // Exact match (case-insensitive, normalized)
      if (normalizedList === normalizedBackend) {
        return mda.name;
      }
      
      // Match after stripping abbreviations from both
      if (strippedList === strippedBackend && strippedList.length > 0) {
        return mda.name;
      }
      
      // Match backend stripped against list full name
      // This handles: backend "Special Control Unit..." matches list "EFCC - Special Control Unit..."
      if (strippedBackend === normalizedList && strippedBackend.length > 0) {
        return mda.name;
      }
      
      // Match backend full name against list stripped
      // This handles: backend "EFCC - Special Control Unit..." matches list "Special Control Unit..."
      if (normalizedBackend === strippedList && strippedList.length > 0) {
        return mda.name;
      }
    }
    
    return null;
  };
  // Header matching functions (implemented locally for now)
  const performHeaderMatching = (headers: string[]) => {
    const mapping: { [key: string]: string | null } = {
      DATE_OF_SUBMISSION: null,
      DATE_OF_COMPLETION: null,
      EXPECTED_TIMELINE: null
    };
    
    headers.forEach(header => {
      const upperHeader = header.toUpperCase();
      
      // Match submission date
      if (!mapping.DATE_OF_SUBMISSION && 
          (upperHeader.includes('SUBMISSION') || upperHeader.includes('START') || 
           upperHeader.includes('SUBMITTED') || upperHeader.includes('DATE'))) {
        mapping.DATE_OF_SUBMISSION = header;
      }
      
      // Match completion date
      if (!mapping.DATE_OF_COMPLETION && 
          (upperHeader.includes('COMPLETION') || upperHeader.includes('END') || 
           upperHeader.includes('COMPLETED') || upperHeader.includes('FINISH'))) {
        mapping.DATE_OF_COMPLETION = header;
      }
      
      // Match timeline
      if (!mapping.EXPECTED_TIMELINE && 
          (upperHeader.includes('TIMELINE') || upperHeader.includes('EXPECTED') || 
           upperHeader.includes('DAYS') || upperHeader.includes('DEADLINE') || 
           upperHeader.includes('TARGET') || upperHeader.includes('SLA'))) {
        mapping.EXPECTED_TIMELINE = header;
      }
    });
    
    return {
      headerMapping: mapping,
      confidence: Object.fromEntries(
        Object.entries(mapping).map(([key, value]) => [key, value ? 0.8 : 0])
      ),
      suggestions: ["Using intelligent header matching. AI features coming soon!"],
      success: true
    };
  };


  // Helper functions
  const calculateWorkingDays = (startDate: any, endDate: any): number | null => {
    if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
      return null;
    }

    try {
      let start: Date;
      let end: Date;
      
      if (startDate.includes('/') && startDate.split('/').length === 3) {
        const [startDay, startMonth, startYear] = startDate.split('/').map(Number);
        const [endDay, endMonth, endYear] = endDate.split('/').map(Number);
        
        start = new Date(startYear, startMonth - 1, startDay);
        end = new Date(endYear, endMonth - 1, endDay);
      } else {
        start = new Date(startDate);
        end = new Date(endDate);
      }
      
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        return null;
      }

      let count = 0;
      const current = new Date(start);
      current.setDate(current.getDate() + 1);

      while (current <= end) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }

      return count;
    } catch (error) {
      console.error("Date calculation error:", error);
      return null;
    }
  };

  const parseTimeline = (timelineStr: any): number | null => {
    if (!timelineStr) return null;
    
    try {
      const match = String(timelineStr).match(/\d+/);
      return match ? parseInt(match[0], 10) : null;
    } catch (error) {
      console.error("Timeline parsing error:", error);
      return null;
    }
  };

  const calculatePerformance = (actualDays: number | null, expectedDays: number | null): number | null => {
    if (actualDays === null || expectedDays === null) return null;

    if (actualDays <= expectedDays) {
      return 100;
    } else {
      const daysOver = actualDays - expectedDays;
      const percentage = 100 - (daysOver * 0.5);
      return Math.max(0, percentage);
    }
  };

  // Calculate monthly SLA score
  const calculateMonthlySlaScore = () => {
    const periodMonths = getMonthsForPeriod(scoringPeriod);
    let totalScore = 0;
    let monthsWithData = 0;

    periodMonths.forEach(periodMonth => {
      const monthKey = `${periodMonth.year}-${periodMonth.month}`;
      const monthData = monthlySlaData[monthKey];
      
      if (monthData) {
        if (monthData.method === 'file' && monthData.overallPercentage !== null) {
          totalScore += (monthData.overallPercentage / 100) * 5; // 5 points per month
        } else if (monthData.method === 'rating') {
          totalScore += (monthData.rating / 10) * 5; // 5 points per month
        }
        monthsWithData++;
      }
    });

    return {
      totalScore,
      monthsWithData,
      totalMonths: periodMonths.length,
      percentage: monthsWithData > 0 ? (totalScore / (monthsWithData * 5)) * 100 : 0
    };
  };
  const realMonthlyReports = useQuery(api.mda_scoring.getRealMonthlyReports, 
    selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
  ) as any[] | undefined;
  const pastScoringData = useQuery(api.mda_scoring.getPastScoringData, 
    selectedMda ? { mdaName: selectedMda, currentPeriod: scoringPeriod } : "skip"
  );
  const periodTicketData = useQuery(api.mda_scoring.getPeriodTicketData, 
    selectedMda ? { mdaName: selectedMda, scoringPeriod } : "skip"
  );

  // Check authorization
  useEffect(() => {
    if (!isLoading && role !== "admin" && role !== "staff") {
      router.replace("/");
    }
  }, [role, isLoading, router]);

  // Reset selected MDA when scoring period changes to avoid stale data
  useEffect(() => {
    setSelectedMda('');
    // Also reset mystery shopping data when period changes
    setMysteryType('hasReportGov');
    setMysteryRatings({});
    setMysteryRate(0);
  }, [scoringPeriod]);

  // Reset state when MDA changes
  useEffect(() => {
    if (selectedMda) {
      // Reset SLA data
      setMonthlySlaData({});
      
      // Reset Report Gov data
      setUseManualReportGov(false);
      setManualTotalTickets(0);
      setManualResolvedTickets(0);
      setManualAverageResponseTime(0);
      setManualAverageResolutionTime(0);
      setManualReportGovRate(0);
      setReportgovRate(0);
      
      // Reset Mystery Shopping data
      setMysteryType('hasReportGov');
      setMysteryRatings({});
      setMysteryRate(0);
    }
  }, [selectedMda]);

  // Ensure resolved tickets never exceed total tickets
  useEffect(() => {
    if (manualResolvedTickets > manualTotalTickets) {
      setManualResolvedTickets(manualTotalTickets);
    }
  }, [manualTotalTickets, manualResolvedTickets]);

  // Load saved SLA data when available
  useEffect(() => {
    if (!isLoadingSLAData && savedSLAData && selectedMda) {
      setMonthlySlaData(savedSLAData.monthlySlaData || {});
      toast.success(`📊 Loaded saved SLA data for ${selectedMda} - ${scoringPeriod}`);
    }
  }, [savedSLAData, selectedMda, scoringPeriod, isLoadingSLAData]);

  // Load saved Report Gov data when available
  useEffect(() => {
    if (!isLoadingReportGovData && savedReportGovData && selectedMda) {
      if (savedReportGovData.isSkipped) {
        setSkipReportGov(true);
        setUseManualReportGov(false);
      } else if (savedReportGovData.isManual) {
        setUseManualReportGov(true);
        setSkipReportGov(false);
        setManualTotalTickets(savedReportGovData.totalTickets);
        setManualResolvedTickets(savedReportGovData.resolvedTickets);
        setManualAverageResponseTime(savedReportGovData.averageResponseTime);
        setManualAverageResolutionTime(savedReportGovData.averageResolutionTime);
        setManualReportGovRate(savedReportGovData.score);
      } else {
        setUseManualReportGov(false);
        setSkipReportGov(false);
        setReportgovRate(savedReportGovData.score);
      }
      toast.success(`📊 Loaded saved Report Gov data for ${selectedMda} - ${scoringPeriod}`);
    }
  }, [savedReportGovData, selectedMda, scoringPeriod, isLoadingReportGovData]);

  // Load saved Mystery Shopping data when available
  useEffect(() => {
    if (!isLoadingMysteryShoppingData && savedMysteryShoppingData && selectedMda) {
      setMysteryType(savedMysteryShoppingData.mysteryType as 'hasReportGov' | 'noReportGov');
      setMysteryRatings(savedMysteryShoppingData.ratings || {});
      setMysteryRate(savedMysteryShoppingData.totalScore);
      toast.success(`🛍️ Loaded saved Mystery Shopping data for ${selectedMda} - ${scoringPeriod}`);
    }
  }, [savedMysteryShoppingData, selectedMda, scoringPeriod, isLoadingMysteryShoppingData]);

  // Load saved Controversial data when available
  useEffect(() => {
    if (!isLoadingControversialData && savedControversialData && selectedMda) {
      setIsControversial(savedControversialData.isControversial || false);
      toast.success(`⚠️ Loaded saved Controversial data for ${selectedMda} - ${scoringPeriod}`);
    }
  }, [savedControversialData, selectedMda, scoringPeriod, isLoadingControversialData]);

  // Load saved Innovation data when available
  useEffect(() => {
    if (!isLoadingInnovationData && savedInnovationData && selectedMda) {
      setIsInnovative(savedInnovationData.isInnovative || false);
      toast.success(`💡 Loaded saved Innovation data for ${selectedMda} - ${scoringPeriod}`);
    }
  }, [savedInnovationData, selectedMda, scoringPeriod, isLoadingInnovationData]);

  // Load saved Stakeholder Engagement data when available
  useEffect(() => {
    if (!isLoadingStakeholderData && savedStakeholderData && selectedMda) {
      setStakeholderRate(savedStakeholderData.rate || 0);
      toast.success(`👥 Loaded saved Stakeholder Engagement data for ${selectedMda} - ${scoringPeriod}`);
    }
  }, [savedStakeholderData, selectedMda, scoringPeriod, isLoadingStakeholderData]);

  // Load saved Transparency data when available
  useEffect(() => {
    if (!selectedMda) {
      setSkipTransparency(false);
      setTransparencyItems({
        proactiveDisclosure: false,
        serviceLevelPublishing: false,
      });
      return;
    }

    if (!isLoadingTransparencyData && savedTransparencyData) {
      setSkipTransparency(savedTransparencyData.isSkipped || false);
      setTransparencyItems({
        proactiveDisclosure: savedTransparencyData.responses?.proactiveDisclosure || false,
        serviceLevelPublishing: savedTransparencyData.responses?.serviceLevelPublishing || false,
      });
      toast.success(`🔍 Loaded saved Transparency data for ${selectedMda} - ${scoringPeriod}`);
    }
  }, [savedTransparencyData, selectedMda, scoringPeriod, isLoadingTransparencyData]);

  // Load saved Monthly Report Submission data when available
  useEffect(() => {
    if (!isLoadingMonthlyReportData && savedMonthlyReportData && selectedMda) {
      setUseManualMonthlyReports(savedMonthlyReportData.useManual || false);
      setManualMonthlyReports(savedMonthlyReportData.manualMonthlyReports || {});
      toast.success(`📅 Loaded saved Monthly Report Submission data for ${selectedMda} - ${scoringPeriod}`);
    }
  }, [savedMonthlyReportData, selectedMda, scoringPeriod, isLoadingMonthlyReportData]);

  // Load saved Timeliness data when available
  useEffect(() => {
    if (!isLoadingTimelinessData && savedTimelinessData && selectedMda) {
      setUseManualTimeliness(savedTimelinessData.useManual || false);
      setManualTimeliness(savedTimelinessData.manualTimeliness || {});
      toast.success(`⏰ Loaded saved Timeliness data for ${selectedMda} - ${scoringPeriod}`);
    }
  }, [savedTimelinessData, selectedMda, scoringPeriod, isLoadingTimelinessData]);

  if (isLoading || !isLoaded) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (role !== "admin" && role !== "staff") {
    return <div className="text-red-500 text-center mt-10">Unauthorized access</div>;
  }

  // Calculate ticket resolution performance score
  const calculateTicketResolutionScore = () => {
    if (!selectedMda) return {
      percentage: 0,
      score: 0,
      totalTickets: 0,
      resolvedTickets: 0,
      averageResponseTime: 0,
      averageResolutionTime: 0,
      resolutionRate: 0,
      responseTimeScore: 0,
      resolutionTimeScore: 0
    };

    // Find MDA in live data (might not exist if not active on platform)
    const selectedMdaFromList = mdasList.find(m => m.name === selectedMda);
    const mda = mdasWithScores?.find(m => 
      m.name === selectedMda || 
      (selectedMdaFromList && m.name === `${selectedMdaFromList.abbreviation} - ${selectedMda}`) ||
      m.name.includes(selectedMda) ||
      (selectedMdaFromList && selectedMda.includes(m.name.replace(/^[^-]+ - /, '')))
    );

    // Get the months for the selected scoring period
    const periodMonths = getMonthsForPeriod(scoringPeriod);
    
    // Use ONLY period-specific ticket data - if no period data, show 0
    const totalTickets = periodTicketData?.totalTickets || 0;
    const resolvedTickets = periodTicketData?.resolvedTickets || 0;
    const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
    const averageResponseTime = periodTicketData?.averageResponseTime || 0;
    const averageResolutionTime = periodTicketData?.averageResolutionTime || 0;

    // NEW SCORING LOGIC: Resolution rate (7 points), Response time (3 points), Resolution time (5 points)
    let resolutionRateScore = 0;
    if (totalTickets === 0) {
      resolutionRateScore = 0; // If no tickets, resolution score is 0
    } else {
      resolutionRateScore = (resolutionRate / 100) * 7; // 7 points for resolution rate
    }
    
    let responseTimeScore = 0;
    if (averageResponseTime === 0) {
      responseTimeScore = 0; // No points if response time is 0
    } else if (averageResponseTime > 24) {
      const penalty = (averageResponseTime - 24) * 0.06;
      responseTimeScore = Math.max(0, 3 - penalty);
    } else {
      responseTimeScore = 3; // Full points if > 0 and <= 24
    }
    
    let resolutionTimeScore = 0;
    if (averageResolutionTime === 0) {
      resolutionTimeScore = 0; // No points if resolution time is 0
    } else if (averageResolutionTime > 72) {
      const penalty = (averageResolutionTime - 72) * 0.05; // Adjusted penalty for 5 points
      resolutionTimeScore = Math.max(0, 5 - penalty);
    } else {
      resolutionTimeScore = 5; // Full points if > 0 and <= 72
    }

    const totalScore = resolutionRateScore + responseTimeScore + resolutionTimeScore;
    const percentage = (totalScore / 15) * 100;

    return {
      percentage,
      score: totalScore,
      totalTickets,
      resolvedTickets,
      averageResponseTime,
      averageResolutionTime,
      resolutionRate,
      responseTimeScore,
      resolutionTimeScore
    };
  };

  // Helper function to get months for a scoring period
  const getMonthsForPeriod = (period: string): Array<{ month: number; year: number }> => {
    const currentYear = new Date().getFullYear();
    
    // Extract year from scoring period (e.g., "1st Half 2024" -> 2024)
    const yearMatch = period.match(/\d{4}/);
    const targetYear = yearMatch ? parseInt(yearMatch[0]) : currentYear;
    
    if (period.includes("1st Half")) {
      return [
        { month: 0, year: targetYear },   // January
        { month: 1, year: targetYear },   // February
        { month: 2, year: targetYear },   // March
        { month: 3, year: targetYear },   // April
        { month: 4, year: targetYear },   // May
        { month: 5, year: targetYear }    // June
      ];
    } else if (period.includes("2nd Half")) {
      return [
        { month: 6, year: targetYear },   // July
        { month: 7, year: targetYear },   // August
        { month: 8, year: targetYear },   // September
        { month: 9, year: targetYear },   // October
        { month: 10, year: targetYear },  // November
        { month: 11, year: targetYear }   // December
      ];
    } else {
      // Default: From January to current month of target year
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const months: Array<{ month: number; year: number }> = [];
      for (let month = 0; month <= currentMonth; month++) {
        months.push({ month, year: targetYear });
      }
      return months;
    }
  };

  const ticketResolutionData = calculateTicketResolutionScore();

  // Calculate manual report gov resolution score
  const calculateManualReportGovScore = () => {
    if (manualTotalTickets === 0) return 0;
    
    const resolutionRate = (manualResolvedTickets / manualTotalTickets) * 100;
    
    // NEW SCORING LOGIC: Resolution rate (7 points), Response time (3 points), Resolution time (5 points)
    let resolutionRateScore = (resolutionRate / 100) * 7; // 7 points for resolution rate
    let responseTimeScore = 0;
    if (manualAverageResponseTime === 0) {
      responseTimeScore = 0; // No points if response time is 0
    } else if (manualAverageResponseTime > 24) {
      const penalty = (manualAverageResponseTime - 24) * 0.06;
      responseTimeScore = Math.max(0, 3 - penalty);
    } else {
      responseTimeScore = 3; // Full points if > 0 and <= 24
    }
    let resolutionTimeScore = 0;
    if (manualAverageResolutionTime === 0) {
      resolutionTimeScore = 0; // No points if resolution time is 0
    } else if (manualAverageResolutionTime > 72) {
      const penalty = (manualAverageResolutionTime - 72) * 0.05; // Adjusted penalty for 5 points
      resolutionTimeScore = Math.max(0, 5 - penalty);
    } else {
      resolutionTimeScore = 5; // Full points if > 0 and <= 72
    }

    return resolutionRateScore + responseTimeScore + resolutionTimeScore;
  };

  // Calculate monthly report submission score (3 points)
  const calculateMonthlyReportScore = () => {
    if (!realMonthlyReports || !selectedMda) {
      return {
        percentage: 0,
        score: 0,
        submitted: 0,
        total: getMonthsForPeriod(scoringPeriod).length
      };
    }

    // Get the expected months for the selected period
    const expectedMonths = getMonthsForPeriod(scoringPeriod);
    const totalExpectedMonths = expectedMonths.length;
    
    // Filter reports to only include months within the selected period
    const periodReports = realMonthlyReports.filter(report => {
      const reportDate = new Date(report.deadline);
      return expectedMonths.some(periodMonth => 
        reportDate.getMonth() === periodMonth.month && 
        reportDate.getFullYear() === periodMonth.year
      );
    });
    
    const totalMonths = periodReports.length;
    const submittedReports = periodReports.filter(report => report.submitted).length;
    
    // If no reports exist for this period, return 0 score
    if (totalMonths === 0) {
      return {
        percentage: 0,
        score: 0,
        submitted: 0,
        total: totalExpectedMonths
      };
    }
    
    const submissionPercentage = (submittedReports / totalExpectedMonths) * 100;
    const score = (submissionPercentage / 100) * 3; // 3 points max
    
    return {
      percentage: submissionPercentage,
      score: score,
      submitted: submittedReports,
      total: totalExpectedMonths
    };
  };


  const calculateTransparencyScore = () => {
    if (skipTransparency) return 0;
    const answeredYes = Object.values(transparencyItems).filter(Boolean).length;
    return answeredYes * 5;
  };


  // Function to calculate average with past data
  const calculateAverageWithPastData = (currentScore: number, metricName: string) => {
    if (!pastScoringData) return currentScore;
    
    const pastAverage = pastScoringData.averages[metricName as keyof typeof pastScoringData.averages];
    if (typeof pastAverage !== 'number') return currentScore;
    
    // Weight: 70% current score, 30% past average
    return (currentScore * 0.7) + (pastAverage * 0.3);
  };

  // Calculate deadline compliance score (2 points)
  const calculateDeadlineScore = () => {
    if (!realMonthlyReports || !selectedMda) {
      return {
        percentage: 0,
        score: 0,
        penalty: 0
      };
    }

    // Get the expected months for the selected period
    const expectedMonths = getMonthsForPeriod(scoringPeriod);
    
    // Filter reports to only include months within the selected period
    const periodReports = realMonthlyReports.filter(report => {
      const reportDate = new Date(report.deadline);
      return expectedMonths.some(periodMonth => 
        reportDate.getMonth() === periodMonth.month && 
        reportDate.getFullYear() === periodMonth.year
      );
    });

    const submittedReports = periodReports.filter(report => report.submitted);
    
    // If no reports were submitted for this period, return 0 score
    if (submittedReports.length === 0) {
      return {
        percentage: 0,
        score: 0,
        penalty: 0
      };
    }
    
    let totalPenalty = 0;
    
    submittedReports.forEach(report => {
      if (!report.onTime && report.submittedDate) {
        // Calculate days late using timestamps
        const deadlineDate = new Date(report.deadline);
        const submitDate = new Date(report.submittedDate);
        
        const daysLate = Math.ceil((submitDate.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysLate > 0) {
          totalPenalty += daysLate * 0.5; // 0.5% penalty per day
        }
      }
    });
    
    const basePercentage = 100;
    const finalPercentage = Math.max(0, basePercentage - totalPenalty);
    
    // FIXED: Scale the score based on number of reports submitted vs total expected
    const totalExpectedReports = expectedMonths.length;
    const submittedCount = submittedReports.length;
    const scaleFactor = submittedCount / totalExpectedReports;
    
    const score = (finalPercentage / 100) * 2 * scaleFactor; // Scale the 2 points based on report count
    
    return {
      percentage: finalPercentage,
      score: score,
      penalty: totalPenalty,
      scaleFactor: scaleFactor,
      submittedCount: submittedCount,
      totalExpected: totalExpectedReports
    };
  };

  const monthlyReportData = calculateMonthlyReportScore();
  const deadlineData = calculateDeadlineScore();

  // Calculate total score
  const calculateTotalScore = () => {
    // Use manual overrides if enabled, otherwise use automatic calculations
    const reportGovScore = skipReportGov ? 0 : (useManualReportGov ? manualReportGovRate : reportgovRate);
    const monthlyReportScore = useManualMonthlyReports ? 
      (Object.values(manualMonthlyReports).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 3 : 
      monthlyReportData.score;
    
    // Fix timeliness calculation to scale properly
    const timelinessScore = useManualTimeliness ? 
      (Object.values(manualTimeliness).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 2 : 
      deadlineData.score;

    // Use monthly SLA data
    const monthlySlaScore = calculateMonthlySlaScore();
    
    // Use saved Mystery Shopping data for current period, or fall back to calculated score
    // Mystery Shopping is saved for both halves, but we only want the current period's data
    const mysteryShoppingScore = savedMysteryShoppingData?.totalScore ?? calculateMysteryScore();
    
    // Use saved Controversial data for current period, or fall back to state
    const controversialScore = savedControversialData?.score ?? (isControversial ? 0 : 5);
    
    // Use saved Innovation data for current period, or fall back to state
    const innovationScore = savedInnovationData?.score ?? (isInnovative ? 5 : 0);
    
    // Use saved Stakeholder data for current period, or fall back to state
    const stakeholderScore = savedStakeholderData?.score ?? ((stakeholderRate / 10) * 10);
    
    // Use saved Transparency data for current period, or fall back to calculated
    const transparencyScore = savedTransparencyData?.score ?? calculateTransparencyScore();
    
    const baseScores = {
      serviceLevelAgreement: monthlySlaScore.totalScore,
      mysteryShopping: mysteryShoppingScore,
      controversial: controversialScore,
      innovation: innovationScore,
      stakeholderEngagement: stakeholderScore,
      transparency: transparencyScore,
      reportGovernanceResolution: reportGovScore,
      monthlyReportSubmission: monthlyReportScore,
      timelinessInSubmitting: timelinessScore
    };

    // Apply averaging with past data if available
    const scores = {
      serviceLevelAgreement: calculateAverageWithPastData(baseScores.serviceLevelAgreement, 'serviceLevelAgreement'),
      mysteryShopping: calculateAverageWithPastData(baseScores.mysteryShopping, 'mysteryShopping'),
      controversial: calculateAverageWithPastData(baseScores.controversial, 'controversial'),
      innovation: calculateAverageWithPastData(baseScores.innovation, 'innovation'),
      stakeholderEngagement: calculateAverageWithPastData(baseScores.stakeholderEngagement, 'stakeholderEngagement'),
      transparency: calculateAverageWithPastData(baseScores.transparency, 'transparency'),
      reportGovernanceResolution: skipReportGov ? 0 : calculateAverageWithPastData(baseScores.reportGovernanceResolution, 'reportGovernanceResolution'),
      monthlyReportSubmission: calculateAverageWithPastData(baseScores.monthlyReportSubmission, 'monthlyReportSubmission'),
      timelinessInSubmitting: calculateAverageWithPastData(baseScores.timelinessInSubmitting, 'timelinessInSubmitting')
    };

    // Calculate total possible points (excluding skipped metrics)
    const maxPossiblePoints = 100 - (skipReportGov ? 15 : 0) - (skipTransparency ? 10 : 0);
    
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    // Normalize percentage: if skipped, 85 points = 100% for fair ranking
    const totalPercentage = maxPossiblePoints > 0
      ? (totalScore / maxPossiblePoints) * 100
      : 0;

    return { scores, totalScore, totalPercentage, baseScores, maxPossiblePoints };
  };

  const finalScoreData = calculateTotalScore();

  // Handle file upload for SLA scoring with AI helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          toast.error("No data found in the Excel file");
          return;
        }

        // Get headers from the first row
        const headers = Object.keys(jsonData[0] as Record<string, any>);
        
        // Use AI helper for header matching
        toast.info("🤖 Analyzing your file headers with AI...");
        
        const headerResult = await matchHeaders({
          headers: headers,
          data: jsonData
        });

        if (!headerResult.success) {
          toast.warning("⚠️ AI header matching failed, using fallback method");
        }

        // Check if we have the required headers
        const requiredHeaders = ['DATE_OF_SUBMISSION', 'DATE_OF_COMPLETION', 'EXPECTED_TIMELINE'];
        const missingHeaders = requiredHeaders.filter(header => 
          !headerResult.headerMapping[header] || headerResult.confidence[header] < 0.5
        );

        if (missingHeaders.length > 0) {
          toast.error(`Missing or unclear headers: ${missingHeaders.join(', ')}. Please check your file format.`);
          return;
        }

        // Process the data with matched headers using AI helper
        toast.info("📊 Processing data with AI-matched headers...");
        
        const processResult = await processSlaData({
          data: jsonData,
          headerMapping: headerResult.headerMapping as {
            DATE_OF_SUBMISSION: string | null;
            DATE_OF_COMPLETION: string | null;
            EXPECTED_TIMELINE: string | null;
          }
        });

        if (!processResult.success) {
          toast.error("Failed to process data: " + processResult.error);
          return;
        }

        // Set results
        setOverallPercentage(processResult.overallPercentage);
        setResults(processResult.processedData);
        
        // Show success message with insights
        toast.success(`✅ Successfully processed ${processResult.validRows}/${processResult.totalRows} rows`);
        
        if (headerResult.suggestions && headerResult.suggestions.length > 0) {
          toast.info(`💡 ${headerResult.suggestions.join(', ')}`);
        }

      } catch (error) {
        console.error("File upload error:", error);
        toast.error("Failed to process file: " + (error as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Save SLA data
  const handleSaveSLAData = async () => {
    if (!selectedMda) {
      toast.error("Please select an MDA first");
      return;
    }

    try {
      const monthlySlaScore = calculateMonthlySlaScore();
      await saveSLAData({
        mdaName: selectedMda,
        scoringPeriod: scoringPeriod,
        monthlySlaData: monthlySlaData,
        totalScore: monthlySlaScore.totalScore,
        monthsWithData: monthlySlaScore.monthsWithData,
        totalMonths: monthlySlaScore.totalMonths,
        percentage: monthlySlaScore.percentage
      });
      toast.success("✅ SLA data saved successfully!");
    } catch (error) {
      toast.error("Failed to save SLA data");
      console.error(error);
    }
  };

  // Save Report Gov Resolution data
  const handleSaveReportGovData = async () => {
    if (!selectedMda) {
      toast.error("Please select an MDA first");
      return;
    }

    try {
      const isManual = useManualReportGov && !skipReportGov;
      const score = skipReportGov ? 0 : (isManual ? manualReportGovRate : reportgovRate);
      
      await saveReportGovData({
        mdaName: selectedMda,
        scoringPeriod: scoringPeriod,
        totalTickets: skipReportGov ? 0 : (isManual ? manualTotalTickets : ticketResolutionData.totalTickets),
        resolvedTickets: skipReportGov ? 0 : (isManual ? manualResolvedTickets : ticketResolutionData.resolvedTickets),
        averageResponseTime: skipReportGov ? 0 : (isManual ? manualAverageResponseTime : ticketResolutionData.averageResponseTime),
        averageResolutionTime: skipReportGov ? 0 : (isManual ? manualAverageResolutionTime : ticketResolutionData.averageResolutionTime),
        resolutionRate: skipReportGov ? 0 : (isManual ? (manualTotalTickets > 0 ? (manualResolvedTickets / manualTotalTickets) * 100 : 0) : ticketResolutionData.resolutionRate),
        score: score,
        isManual: isManual,
        isSkipped: skipReportGov
      });
      toast.success("✅ Report Gov Resolution data saved successfully!");
    } catch (error) {
      toast.error("Failed to save Report Gov Resolution data");
      console.error(error);
    }
  };

  // Save Mystery Shopping data for both halves
  const handleSaveMysteryShoppingData = async () => {
    if (!selectedMda) {
      toast.error("Please select an MDA first");
      return;
    }

    try {
      const questions = mysteryType === 'hasReportGov' ? hasReportGovQuestions : noReportGovQuestions;
      const totalScore = calculateMysteryScore();
      const maxPossibleScore = 20; // Mystery Shopping is always out of 20 points
      const percentage = (totalScore / 20) * 100;

      // Extract year from current scoring period
      const yearMatch = scoringPeriod.match(/\d{4}/);
      const targetYear = yearMatch ? parseInt(yearMatch[0]) : currentYear;
      const firstHalfPeriod = `1st Half ${targetYear}`;
      const secondHalfPeriod = `2nd Half ${targetYear}`;

      // Save for both halves
      await Promise.all([
        saveMysteryShoppingData({
          mdaName: selectedMda,
          scoringPeriod: firstHalfPeriod,
          mysteryType: mysteryType,
          ratings: mysteryRatings,
          totalScore: totalScore,
          maxPossibleScore: maxPossibleScore,
          percentage: percentage
        }),
        saveMysteryShoppingData({
          mdaName: selectedMda,
          scoringPeriod: secondHalfPeriod,
          mysteryType: mysteryType,
          ratings: mysteryRatings,
          totalScore: totalScore,
          maxPossibleScore: maxPossibleScore,
          percentage: percentage
        })
      ]);
      toast.success("✅ Mystery Shopping data saved for both halves successfully!");
    } catch (error) {
      toast.error("Failed to save Mystery Shopping data");
      console.error(error);
    }
  };

  // Save Controversial data for both halves
  const handleSaveControversialData = async () => {
    if (!selectedMda) {
      toast.error("Please select an MDA first");
      return;
    }

    try {
      // Controversial: Yes = 0 points, No = 10 points
      const score = isControversial ? 0 : 5;
      
      // Extract year from current scoring period
      const yearMatch = scoringPeriod.match(/\d{4}/);
      const targetYear = yearMatch ? parseInt(yearMatch[0]) : currentYear;
      const firstHalfPeriod = `1st Half ${targetYear}`;
      const secondHalfPeriod = `2nd Half ${targetYear}`;

      // Save for both halves
      await Promise.all([
        saveControversialData({
          mdaName: selectedMda,
          scoringPeriod: firstHalfPeriod,
          isControversial: isControversial,
          score: score
        }),
        saveControversialData({
          mdaName: selectedMda,
          scoringPeriod: secondHalfPeriod,
          isControversial: isControversial,
          score: score
        })
      ]);
      toast.success("✅ Controversial data saved for both halves successfully!");
    } catch (error) {
      toast.error("Failed to save Controversial data");
      console.error(error);
    }
  };

  // Save Innovation data for both halves
  const handleSaveInnovationData = async () => {
    if (!selectedMda) {
      toast.error("Please select an MDA first");
      return;
    }

    try {
      // Innovation: Yes = 10 points, No = 0 points
      const score = isInnovative ? 5 : 0;
      
      // Extract year from current scoring period
      const yearMatch = scoringPeriod.match(/\d{4}/);
      const targetYear = yearMatch ? parseInt(yearMatch[0]) : currentYear;
      const firstHalfPeriod = `1st Half ${targetYear}`;
      const secondHalfPeriod = `2nd Half ${targetYear}`;

      // Save for both halves
      await Promise.all([
        saveInnovationData({
          mdaName: selectedMda,
          scoringPeriod: firstHalfPeriod,
          isInnovative: isInnovative,
          score: score
        }),
        saveInnovationData({
          mdaName: selectedMda,
          scoringPeriod: secondHalfPeriod,
          isInnovative: isInnovative,
          score: score
        })
      ]);
      toast.success("✅ Innovation data saved for both halves successfully!");
    } catch (error) {
      toast.error("Failed to save Innovation data");
      console.error(error);
    }
  };

  // Save Stakeholder Engagement data for both halves
  const handleSaveStakeholderData = async () => {
    if (!selectedMda) {
      toast.error("Please select an MDA first");
      return;
    }

    try {
      const score = (stakeholderRate / 10) * 10;
      
      // Extract year from current scoring period
      const yearMatch = scoringPeriod.match(/\d{4}/);
      const targetYear = yearMatch ? parseInt(yearMatch[0]) : currentYear;
      const firstHalfPeriod = `1st Half ${targetYear}`;
      const secondHalfPeriod = `2nd Half ${targetYear}`;

      // Save for both halves
      await Promise.all([
        saveStakeholderData({
          mdaName: selectedMda,
          scoringPeriod: firstHalfPeriod,
          rate: stakeholderRate,
          score: score
        }),
        saveStakeholderData({
          mdaName: selectedMda,
          scoringPeriod: secondHalfPeriod,
          rate: stakeholderRate,
          score: score
        })
      ]);
      toast.success("✅ Stakeholder Engagement data saved for both halves successfully!");
    } catch (error) {
      toast.error("Failed to save Stakeholder Engagement data");
      console.error(error);
    }
  };

  // Save Transparency data
  const handleSaveTransparencyData = async () => {
    if (!selectedMda) {
      toast.error("Please select an MDA first");
      return;
    }

    try {
      const score = skipTransparency ? 0 : calculateTransparencyScore();
      const yearMatch = scoringPeriod.match(/\d{4}/);
      const targetYear = yearMatch ? parseInt(yearMatch[0]) : currentYear;
      const firstHalfPeriod = `1st Half ${targetYear}`;
      const secondHalfPeriod = `2nd Half ${targetYear}`;

      const baseResponses = {
        proactiveDisclosure: transparencyItems.proactiveDisclosure,
        serviceLevelPublishing: transparencyItems.serviceLevelPublishing,
      };

      await saveTransparencyData({
        mdaName: selectedMda,
        scoringPeriod,
        responses: baseResponses,
        score,
        isSkipped: skipTransparency
      });

      if (scoringPeriod.includes("1st Half")) {
        const copiedResponses = {
          ...baseResponses,
          __copiedFrom: scoringPeriod,
        };

        await saveTransparencyData({
          mdaName: selectedMda,
          scoringPeriod: secondHalfPeriod,
          responses: copiedResponses,
          score,
          isSkipped: skipTransparency
        });
      }

      toast.success("✅ Transparency data saved successfully!");
    } catch (error) {
      toast.error("Failed to save Transparency data");
      console.error(error);
    }
  };

  // Save Monthly Report Submission data
  const handleSaveMonthlyReportData = async () => {
    if (!selectedMda) {
      toast.error("Please select an MDA first");
      return;
    }

    try {
      const score = useManualMonthlyReports ? 
        ((Object.values(manualMonthlyReports).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 3) :
        monthlyReportData.score;

      await saveMonthlyReportData({
        mdaName: selectedMda,
        scoringPeriod: scoringPeriod,
        manualMonthlyReports: manualMonthlyReports,
        useManual: useManualMonthlyReports,
        score: score
      });
      toast.success("✅ Monthly Report Submission data saved successfully!");
    } catch (error) {
      toast.error("Failed to save Monthly Report Submission data");
      console.error(error);
    }
  };

  // Save Timeliness data
  const handleSaveTimelinessData = async () => {
    if (!selectedMda) {
      toast.error("Please select an MDA first");
      return;
    }

    try {
      const score = useManualTimeliness ? 
        ((Object.values(manualTimeliness).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 2) :
        deadlineData.score;

      await saveTimelinessData({
        mdaName: selectedMda,
        scoringPeriod: scoringPeriod,
        manualTimeliness: manualTimeliness,
        useManual: useManualTimeliness,
        score: score
      });
      toast.success("✅ Timeliness data saved successfully!");
    } catch (error) {
      toast.error("Failed to save Timeliness data");
      console.error(error);
    }
  };

  // Save the final score
  const handleSaveScore = async () => {
    if (!selectedMda) {
      toast.error("Please select an MDA first");
      return;
    }

    try {
      // Find MDA in live data, or use selected MDA name if not found
      const selectedMdaFromList = mdasList.find(m => m.name === selectedMda);
      const mda = mdasWithScores?.find(m => 
        m.name === selectedMda || 
        (selectedMdaFromList && m.name === `${selectedMdaFromList.abbreviation} - ${selectedMda}`) ||
        m.name.includes(selectedMda) ||
        (selectedMdaFromList && selectedMda.includes(m.name.replace(/^[^-]+ - /, '')))
      );
      const mdaId = mda?._id as any; // Will be undefined if MDA doesn't exist in database yet
      const mdaName = selectedMda;

      const result = await calculateScore({
        mdaId: mdaId,
        mdaName: mdaName,
        scoringPeriod: scoringPeriod,
        serviceLevelAgreementScore: finalScoreData.scores.serviceLevelAgreement,
        mysteryShoppingScore: finalScoreData.scores.mysteryShopping,
        controversialScore: finalScoreData.scores.controversial,
        innovationScore: finalScoreData.scores.innovation,
        stakeholderEngagementScore: finalScoreData.scores.stakeholderEngagement,
        transparencyScore: finalScoreData.scores.transparency,
        reportGovernanceResolutionScore: finalScoreData.scores.reportGovernanceResolution,
        monthlyReportSubmissionScore: finalScoreData.scores.monthlyReportSubmission,
        timelinessInSubmittingScore: finalScoreData.scores.timelinessInSubmitting,
        totalTickets: mda?.totalTickets || 0,
        resolvedTickets: mda?.resolvedTickets || 0,
        averageResponseTime: mda?.averageResponseTime || 0,
        averageResolutionTime: mda?.averageResolutionTime || 0,
        resolutionRate: mda?.resolutionRate || 0,
        notes: notes,
        recommendations: recommendations,
        maxPossiblePoints: finalScoreData.maxPossiblePoints || 100,
        scoringMethod: skipReportGov
          ? (skipTransparency ? "skip_both" : "skip_reportgov")
          : (skipTransparency ? "skip_transparency" : "standard")
      } as any);

      if (result.success) {
        toast.success(`Score saved successfully! Grade: ${result.grade}, Status: ${result.status}`);
        setShowFinalScore(false);
      }
    } catch (error) {
      toast.error("Failed to save score");
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col items-center text-black p-4 w-full min-h-screen bg-gray-100">
      <div className="w-full flex flex-col items-center bg-white rounded-lg p-6">
        {/* Header */}
        <div className="w-full flex items-center justify-between px-4 py-2 mb-6">
          <h1 className="text-2xl font-bold text-gray-800">MDA Scoring Metrics</h1>
          <div className="flex gap-4">
            <Select
              value={scoringPeriod}
              onChange={(e) => setScoringPeriod(e.target.value)}
              className="min-w-[150px]"
            >
              <MenuItem value={`1st Half ${currentYear}`}>1st Half {currentYear}</MenuItem>
              <MenuItem value={`2nd Half ${currentYear}`}>2nd Half {currentYear}</MenuItem>
            </Select>
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
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'live-dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Live Dashboard
              </button>
              <button
                onClick={() => setActiveTab('scoring')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'scoring'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Score MDAs
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
          <div className="w-full space-y-6">
            {/* Live Dashboard Header */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Live Scoring Dashboard</h2>
                <div className="flex items-center gap-4">
                  <FormControl sx={{ minWidth: 200 }} variant="outlined">
                    <InputLabel id="metric-label">Select Metric</InputLabel>
                    <Select
                      labelId="metric-label"
                      id="metric-select"
                      value={selectedMetric}
                      onChange={(e) => setSelectedMetric(e.target.value)}
                      label="Select Metric"
                    >
                      <MenuItem value="totalScore">Total Score (All Metrics)</MenuItem>
                      <MenuItem value="mysteryShopping">Mystery Shopping</MenuItem>
                      <MenuItem value="sla">Service Level Agreement</MenuItem>
                      <MenuItem value="controversial">Controversial</MenuItem>
                      <MenuItem value="innovation">Innovation</MenuItem>
                      <MenuItem value="stakeholder">Stakeholder Engagement</MenuItem>
                      <MenuItem value="transparency">Transparency</MenuItem>
                      <MenuItem value="reportGovResolution">Report Gov Resolution</MenuItem>
                      <MenuItem value="monthlyReport">Monthly Report Submission</MenuItem>
                      <MenuItem value="timeliness">Timeliness</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl sx={{ minWidth: 180 }} variant="outlined">
                    <InputLabel id="filter-label">Filter MDAs</InputLabel>
                    <Select
                      labelId="filter-label"
                      id="filter-select"
                      value={mdaFilter}
                      onChange={(e) => setMdaFilter(e.target.value as 'all' | 'withData')}
                      label="Filter MDAs"
                    >
                      <MenuItem value="all">All MDAs</MenuItem>
                      <MenuItem value="withData">MDAs with Data</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl sx={{ minWidth: 150 }} variant="outlined">
                    <InputLabel id="year-label">Year</InputLabel>
                    <Select
                      labelId="year-label"
                      id="year-select"
                      value={dashboardYear}
                      onChange={(e) => setDashboardYear(Number(e.target.value))}
                      label="Year"
                    >
                      {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                        <MenuItem key={year} value={year}>{year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <button
                    onClick={handleGenerateDashboardPDF}
                    disabled={liveDashboardData === undefined || !Array.isArray(liveDashboardData) || liveDashboardData.length === 0}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    📥 Download PDF
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                View {mdaFilter === 'all' ? 'all' : 'MDAs with data'} with their saved metric scores. Data is averaged across both halves (1st Half & 2nd Half) for the selected year.
              </p>
            </div>

            {/* Live Dashboard Table */}
            {liveDashboardData === undefined ? (
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <p className="text-gray-500">Loading dashboard data...</p>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          MDA Name
                        </th>
                        {selectedMetric === 'totalScore' ? (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SLA</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mystery Shopping</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Controversial</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Innovation</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stakeholder</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transparency</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Gov Resolution</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Report</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timeliness</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Score</th>
                          </>
                        ) : (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {selectedMetric === 'mysteryShopping' ? 'Mystery Shopping' :
                             selectedMetric === 'sla' ? 'Service Level Agreement' :
                             selectedMetric === 'controversial' ? 'Controversial' :
                             selectedMetric === 'innovation' ? 'Innovation' :
                             selectedMetric === 'stakeholder' ? 'Stakeholder Engagement' :
                             selectedMetric === 'transparency' ? 'Transparency' :
                             selectedMetric === 'reportGovResolution' ? 'Report Gov Resolution' :
                             selectedMetric === 'monthlyReport' ? 'Monthly Report Submission' :
                             selectedMetric === 'timeliness' ? 'Timeliness' : 'Score'} (Overall %)
                          </th>
                        )}
                          {selectedMetric === 'totalScore' && (
                          <>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        // Get processed and filtered MDA data
                        const allMdasArray = processDashboardMdaData(mdaFilter);

                        // Sort data by selected metric
                        const sortedData = Array.isArray(allMdasArray) ? [...allMdasArray].sort((a: any, b: any) => {
                            let aValue: any = 0;
                            let bValue: any = 0;
                            
                            if (selectedMetric === 'totalScore') {
                              aValue = a.totalPercentage || 0; // Use normalized percentage for fair ranking
                              bValue = b.totalPercentage || 0;
                            } else if (selectedMetric === 'mysteryShopping') {
                              aValue = a.mysteryShopping?.score || 0;
                              bValue = b.mysteryShopping?.score || 0;
                            } else if (selectedMetric === 'sla') {
                              aValue = a.sla?.score || 0;
                              bValue = b.sla?.score || 0;
                            } else if (selectedMetric === 'controversial') {
                              aValue = a.controversial?.score || 0;
                              bValue = b.controversial?.score || 0;
                            } else if (selectedMetric === 'innovation') {
                              aValue = a.innovation?.score || 0;
                              bValue = b.innovation?.score || 0;
                            } else if (selectedMetric === 'stakeholder') {
                              aValue = a.stakeholder?.score || 0;
                              bValue = b.stakeholder?.score || 0;
                            } else if (selectedMetric === 'transparency') {
                              aValue = a.transparency?.score || 0;
                              bValue = b.transparency?.score || 0;
                            } else if (selectedMetric === 'reportGovResolution') {
                              aValue = a.reportGovResolution?.score || 0;
                              bValue = b.reportGovResolution?.score || 0;
                            } else if (selectedMetric === 'monthlyReport') {
                              aValue = a.monthlyReport?.score || 0;
                              bValue = b.monthlyReport?.score || 0;
                            } else if (selectedMetric === 'timeliness') {
                              aValue = a.timeliness?.score || 0;
                              bValue = b.timeliness?.score || 0;
                            }
                            
                            return bValue - aValue; // Always sort descending by default
                          }) : [];
                          
                        // Recalculate ranks based on selected metric
                        const rankedByMetric = [...allMdasArray].sort((a: any, b: any) => {
                          let aValue: any = 0;
                          let bValue: any = 0;
                          
                          if (selectedMetric === 'totalScore') {
                            aValue = a.totalPercentage || 0; // Use normalized percentage for fair ranking
                            bValue = b.totalPercentage || 0;
                          } else if (selectedMetric === 'mysteryShopping') {
                            aValue = a.mysteryShopping?.score || 0;
                            bValue = b.mysteryShopping?.score || 0;
                          } else if (selectedMetric === 'sla') {
                            aValue = a.sla?.score || 0;
                            bValue = b.sla?.score || 0;
                          } else if (selectedMetric === 'controversial') {
                            aValue = a.controversial?.score || 0;
                            bValue = b.controversial?.score || 0;
                          } else if (selectedMetric === 'innovation') {
                            aValue = a.innovation?.score || 0;
                            bValue = b.innovation?.score || 0;
                          } else if (selectedMetric === 'stakeholder') {
                            aValue = a.stakeholder?.score || 0;
                            bValue = b.stakeholder?.score || 0;
                          } else if (selectedMetric === 'transparency') {
                            aValue = a.transparency?.score || 0;
                            bValue = b.transparency?.score || 0;
                          } else if (selectedMetric === 'reportGovResolution') {
                            aValue = a.reportGovResolution?.score || 0;
                            bValue = b.reportGovResolution?.score || 0;
                          } else if (selectedMetric === 'monthlyReport') {
                            aValue = a.monthlyReport?.score || 0;
                            bValue = b.monthlyReport?.score || 0;
                          } else if (selectedMetric === 'timeliness') {
                            aValue = a.timeliness?.score || 0;
                            bValue = b.timeliness?.score || 0;
                          }
                          
                          return bValue - aValue;
                        });
                          
                          // Calculate ranks based on selected metric
                          const rankMap = new Map<string, number>();
                          rankedByMetric.forEach((mda: any, idx: number) => {
                            rankMap.set(mda.mdaName, idx + 1);
                          });
                          
                          return sortedData.map((mda: any, index: number) => {
                            // Get rank based on selected metric
                            const rank = rankMap.get(mda.mdaName) || sortedData.length;
                            
                            // Calculate overall percentage for selected metric
                            let score = 0;
                            let maxScore = 100;
                            let overallPercentage = 0;
                            
                            if (selectedMetric === 'totalScore') {
                              score = mda.totalScore || 0;
                              maxScore = 100;
                              overallPercentage = score;
                            } else if (selectedMetric === 'mysteryShopping') {
                              score = mda.mysteryShopping?.score || 0;
                              maxScore = 20;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'sla') {
                              score = mda.sla?.score || 0;
                              maxScore = 30;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'controversial') {
                              score = mda.controversial?.score || 0;
                              maxScore = 5;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'innovation') {
                              score = mda.innovation?.score || 0;
                              maxScore = 5;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'stakeholder') {
                              score = mda.stakeholder?.score || 0;
                              maxScore = 10;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'transparency') {
                              score = mda.transparency?.score || 0;
                              maxScore = 10;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'reportGovResolution') {
                              score = mda.reportGovResolution?.score || 0;
                              maxScore = 15;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'monthlyReport') {
                              score = mda.monthlyReport?.score || 0;
                              maxScore = 3;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'timeliness') {
                              score = mda.timeliness?.score || 0;
                              maxScore = 2;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            }
                            
                            return (
                              <tr key={mda.mdaName} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  #{rank}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {mda.mdaName}
                                </td>
                                {selectedMetric === 'totalScore' ? (
                                  <>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {mda.sla ? (
                                        <div>
                                          <div className="font-semibold">{mda.sla.score.toFixed(1)}/30</div>
                                          <div className="text-xs text-gray-400">{mda.sla.monthsWithData}/10 months</div>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {mda.mysteryShopping ? (
                                        <span className="font-semibold">{mda.mysteryShopping.score.toFixed(1)}/20</span>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {mda.controversial ? (
                                        <span className="font-semibold">{mda.controversial.score.toFixed(1)}/5</span>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {mda.innovation ? (
                                        <span className="font-semibold">{mda.innovation.score.toFixed(1)}/5</span>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {mda.stakeholder ? (
                                        <span className="font-semibold">{mda.stakeholder.score.toFixed(1)}/10</span>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {mda.transparency ? (
                                        <span className="font-semibold">{mda.transparency.score.toFixed(1)}/10</span>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {mda.reportGovResolution ? (
                                        <div>
                                          {mda.reportGovResolution.isSkipped ? (
                                            <div>
                                              <div className="font-semibold text-gray-400 line-through">0/15</div>
                                              <div className="text-xs text-yellow-600 mt-1">⚠️ Skipped</div>
                                            </div>
                                          ) : (
                                            <>
                                              <div className="font-semibold">{mda.reportGovResolution.score.toFixed(1)}/15</div>
                                              {mda.reportGovResolution.hasFirstHalf !== undefined && (
                                                <div className="text-xs text-gray-400 mt-1">
                                                  {mda.reportGovResolution.hasFirstHalf && mda.reportGovResolution.hasSecondHalf ? (
                                                    <span>1st: {mda.reportGovResolution.firstHalfScore?.toFixed(1) || 'N/A'}, 2nd: {mda.reportGovResolution.secondHalfScore?.toFixed(1) || 'N/A'}</span>
                                                  ) : mda.reportGovResolution.hasFirstHalf ? (
                                                    <span className="text-yellow-600">1st Half only: {mda.reportGovResolution.firstHalfScore?.toFixed(1) || 'N/A'}</span>
                                                  ) : mda.reportGovResolution.hasSecondHalf ? (
                                                    <span className="text-yellow-600">2nd Half only: {mda.reportGovResolution.secondHalfScore?.toFixed(1) || 'N/A'}</span>
                                                  ) : null}
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {mda.monthlyReport ? (
                                        <div>
                                          <div className="font-semibold">{mda.monthlyReport.score.toFixed(1)}/3</div>
                                          <div className="text-xs text-gray-400">{mda.monthlyReport.monthsWithData}/10 months</div>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {mda.timeliness ? (
                                        <div>
                                          <div className="font-semibold">{mda.timeliness.score.toFixed(1)}/2</div>
                                          <div className="text-xs text-gray-400">{mda.timeliness.monthsWithData}/10 months</div>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                                      <div className="flex items-center gap-2">
                                        <span className={`font-bold ${
                                          mda.totalPercentage >= 90 ? 'text-green-600' :
                                          mda.totalPercentage >= 80 ? 'text-blue-600' :
                                          mda.totalPercentage >= 70 ? 'text-yellow-600' :
                                          mda.totalPercentage >= 60 ? 'text-orange-600' : 'text-red-600'
                                        }`}>
                                          {mda.totalScore.toFixed(1)}/100
                                        </span>
                                        {mda.isReportGovSkipped && (
                                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded" title="Report Gov Resolution skipped - using 85 points for normalization">
                                            ⚠️ Using 85
                                          </span>
                                        )}
                                      </div>
                                      <div className={`text-xs mt-1 ${
                                        mda.totalPercentage >= 90 ? 'text-green-600' :
                                        mda.totalPercentage >= 80 ? 'text-blue-600' :
                                        mda.totalPercentage >= 70 ? 'text-yellow-600' :
                                        mda.totalPercentage >= 60 ? 'text-orange-600' : 'text-red-600'
                                      }`}>
                                        {mda.isReportGovSkipped ? (
                                          <span>{mda.totalPercentage.toFixed(1)}/100</span>
                                        ) : (
                                          <span>{mda.totalPercentage.toFixed(1)}%</span>
                                        )}
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                                    {score > 0 ? (
                                      <span className={`font-bold text-lg ${
                                        overallPercentage >= 90 ? 'text-green-600' :
                                        overallPercentage >= 80 ? 'text-blue-600' :
                                        overallPercentage >= 70 ? 'text-yellow-600' :
                                        overallPercentage >= 60 ? 'text-orange-600' : 'text-red-600'
                                      }`}>
                                        {overallPercentage.toFixed(1)}%
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                )}
                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        setViewDetailsMda(mda.mdaName);
                                        setIsLoadingDetails(true);
                                      }}
                                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                                    >
                                      👁️ View
                                    </button>
                                    <button
                                      onClick={async () => {
                                        try {
                                          setIsLoadingDetails(true);
                                          // Fetch data using Convex client
                                          const detailedData = await (convex as any).query(
                                            api.mda_scoring.getMdaDetailedScoringData,
                                            { mdaName: mda.mdaName, year: dashboardYear }
                                          ) as any;
                                          if (detailedData) {
                                            await generateMdaScoringPDF(detailedData);
                                            toast.success("PDF downloaded successfully!");
                                          } else {
                                            toast.error("No data available to download");
                                          }
                                        } catch (error) {
                                          console.error("Error downloading PDF:", error);
                                          toast.error("Failed to download PDF");
                                        } finally {
                                          setIsLoadingDetails(false);
                                        }
                                      }}
                                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                                    >
                                      📥 Download
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top 10 and Bottom 10 Tables */}
            {liveDashboardData !== undefined && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top 10 Table */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">🏆 Top 10</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-green-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MDA Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {selectedMetric === 'mysteryShopping' ? 'Mystery Shopping' :
                             selectedMetric === 'sla' ? 'Service Level Agreement' :
                             selectedMetric === 'controversial' ? 'Controversial' :
                             selectedMetric === 'innovation' ? 'Innovation' :
                             selectedMetric === 'stakeholder' ? 'Stakeholder Engagement' :
                             selectedMetric === 'transparency' ? 'Transparency' :
                             selectedMetric === 'reportGovResolution' ? 'Report Gov Resolution' :
                             selectedMetric === 'monthlyReport' ? 'Monthly Report Submission' :
                             selectedMetric === 'timeliness' ? 'Timeliness' :
                             selectedMetric === 'totalScore' ? 'Total Score' : 'Score'} (%)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(() => {
                          // Use same processed and filtered data
                          const allMdasArray = processDashboardMdaData(mdaFilter);

                          // Sort by selected metric
                          const sortedData = [...allMdasArray].sort((a: any, b: any) => {
                            let aValue: any = 0;
                            let bValue: any = 0;
                            
                            if (selectedMetric === 'totalScore') {
                              aValue = a.totalPercentage || 0; // Use normalized percentage for fair ranking
                              bValue = b.totalPercentage || 0;
                            } else if (selectedMetric === 'mysteryShopping') {
                              aValue = a.mysteryShopping?.score || 0;
                              bValue = b.mysteryShopping?.score || 0;
                            } else if (selectedMetric === 'sla') {
                              aValue = a.sla?.score || 0;
                              bValue = b.sla?.score || 0;
                            } else if (selectedMetric === 'controversial') {
                              aValue = a.controversial?.score || 0;
                              bValue = b.controversial?.score || 0;
                            } else if (selectedMetric === 'innovation') {
                              aValue = a.innovation?.score || 0;
                              bValue = b.innovation?.score || 0;
                            } else if (selectedMetric === 'stakeholder') {
                              aValue = a.stakeholder?.score || 0;
                              bValue = b.stakeholder?.score || 0;
                            } else if (selectedMetric === 'transparency') {
                              aValue = a.transparency?.score || 0;
                              bValue = b.transparency?.score || 0;
                            } else if (selectedMetric === 'reportGovResolution') {
                              aValue = a.reportGovResolution?.score || 0;
                              bValue = b.reportGovResolution?.score || 0;
                            } else if (selectedMetric === 'monthlyReport') {
                              aValue = a.monthlyReport?.score || 0;
                              bValue = b.monthlyReport?.score || 0;
                            } else if (selectedMetric === 'timeliness') {
                              aValue = a.timeliness?.score || 0;
                              bValue = b.timeliness?.score || 0;
                            }
                            
                            return bValue - aValue;
                          });

                          const top10 = sortedData.slice(0, 10);

                          return top10.map((mda: any, index: number) => {
                            let score = 0;
                            let maxScore = 100;
                            let overallPercentage = 0;
                            
                            if (selectedMetric === 'totalScore') {
                              score = mda.totalScore || 0;
                              overallPercentage = mda.totalPercentage || 0; // Use normalized percentage
                            } else if (selectedMetric === 'mysteryShopping') {
                              score = mda.mysteryShopping?.score || 0;
                              maxScore = 20;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'sla') {
                              score = mda.sla?.score || 0;
                              maxScore = 30;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'controversial') {
                              score = mda.controversial?.score || 0;
                              maxScore = 5;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'innovation') {
                              score = mda.innovation?.score || 0;
                              maxScore = 5;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'stakeholder') {
                              score = mda.stakeholder?.score || 0;
                              maxScore = 10;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'transparency') {
                              score = mda.transparency?.score || 0;
                              maxScore = 10;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'reportGovResolution') {
                              score = mda.reportGovResolution?.score || 0;
                              maxScore = 15;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'monthlyReport') {
                              score = mda.monthlyReport?.score || 0;
                              maxScore = 3;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'timeliness') {
                              score = mda.timeliness?.score || 0;
                              maxScore = 2;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            }

                            return (
                              <tr key={mda.mdaName} className={index % 2 === 0 ? "bg-white" : "bg-green-50"}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  #{index + 1}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {mda.mdaName}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  {score > 0 ? (
                                    <span className={`font-bold text-lg ${
                                      overallPercentage >= 90 ? 'text-green-600' :
                                      overallPercentage >= 80 ? 'text-blue-600' :
                                      overallPercentage >= 70 ? 'text-yellow-600' :
                                      overallPercentage >= 60 ? 'text-orange-600' : 'text-red-600'
                                    }`}>
                                      {overallPercentage.toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bottom 10 Table */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">📉 Bottom 10</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MDA Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {selectedMetric === 'mysteryShopping' ? 'Mystery Shopping' :
                             selectedMetric === 'sla' ? 'Service Level Agreement' :
                             selectedMetric === 'controversial' ? 'Controversial' :
                             selectedMetric === 'innovation' ? 'Innovation' :
                             selectedMetric === 'stakeholder' ? 'Stakeholder Engagement' :
                             selectedMetric === 'transparency' ? 'Transparency' :
                             selectedMetric === 'reportGovResolution' ? 'Report Gov Resolution' :
                             selectedMetric === 'monthlyReport' ? 'Monthly Report Submission' :
                             selectedMetric === 'timeliness' ? 'Timeliness' :
                             selectedMetric === 'totalScore' ? 'Total Score' : 'Score'} (%)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(() => {
                          // Use same processed and filtered data
                          const allMdasArray = processDashboardMdaData(mdaFilter);

                          // Sort by selected metric
                          const sortedData = [...allMdasArray].sort((a: any, b: any) => {
                            let aValue: any = 0;
                            let bValue: any = 0;
                            
                            if (selectedMetric === 'totalScore') {
                              aValue = a.totalPercentage || 0; // Use normalized percentage for fair ranking
                              bValue = b.totalPercentage || 0;
                            } else if (selectedMetric === 'mysteryShopping') {
                              aValue = a.mysteryShopping?.score || 0;
                              bValue = b.mysteryShopping?.score || 0;
                            } else if (selectedMetric === 'sla') {
                              aValue = a.sla?.score || 0;
                              bValue = b.sla?.score || 0;
                            } else if (selectedMetric === 'controversial') {
                              aValue = a.controversial?.score || 0;
                              bValue = b.controversial?.score || 0;
                            } else if (selectedMetric === 'innovation') {
                              aValue = a.innovation?.score || 0;
                              bValue = b.innovation?.score || 0;
                            } else if (selectedMetric === 'stakeholder') {
                              aValue = a.stakeholder?.score || 0;
                              bValue = b.stakeholder?.score || 0;
                            } else if (selectedMetric === 'transparency') {
                              aValue = a.transparency?.score || 0;
                              bValue = b.transparency?.score || 0;
                            } else if (selectedMetric === 'reportGovResolution') {
                              aValue = a.reportGovResolution?.score || 0;
                              bValue = b.reportGovResolution?.score || 0;
                            } else if (selectedMetric === 'monthlyReport') {
                              aValue = a.monthlyReport?.score || 0;
                              bValue = b.monthlyReport?.score || 0;
                            } else if (selectedMetric === 'timeliness') {
                              aValue = a.timeliness?.score || 0;
                              bValue = b.timeliness?.score || 0;
                            }
                            
                            return bValue - aValue;
                          });

                          const bottom10 = sortedData.slice(-10).reverse(); // Get last 10 and reverse to show lowest first

                          return bottom10.map((mda: any, index: number) => {
                            let score = 0;
                            let maxScore = 100;
                            let overallPercentage = 0;
                            
                            if (selectedMetric === 'totalScore') {
                              score = mda.totalScore || 0;
                              overallPercentage = mda.totalPercentage || 0; // Use normalized percentage
                            } else if (selectedMetric === 'mysteryShopping') {
                              score = mda.mysteryShopping?.score || 0;
                              maxScore = 20;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'sla') {
                              score = mda.sla?.score || 0;
                              maxScore = 30;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'controversial') {
                              score = mda.controversial?.score || 0;
                              maxScore = 5;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'innovation') {
                              score = mda.innovation?.score || 0;
                              maxScore = 5;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'stakeholder') {
                              score = mda.stakeholder?.score || 0;
                              maxScore = 10;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'transparency') {
                              score = mda.transparency?.score || 0;
                              maxScore = 10;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'reportGovResolution') {
                              score = mda.reportGovResolution?.score || 0;
                              maxScore = 15;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'monthlyReport') {
                              score = mda.monthlyReport?.score || 0;
                              maxScore = 3;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            } else if (selectedMetric === 'timeliness') {
                              score = mda.timeliness?.score || 0;
                              maxScore = 2;
                              overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                            }

                            // Calculate rank: if total is 70, bottom 10 ranks are 70, 69, 68... 61
                            // sortedData.length gives total count, so last rank is sortedData.length
                            // Bottom 10 starts from sortedData.length and goes down
                            const bottomRank = sortedData.length - index;

                            return (
                              <tr key={mda.mdaName} className={index % 2 === 0 ? "bg-white" : "bg-red-50"}>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  #{bottomRank}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {mda.mdaName}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                  {score > 0 ? (
                                    <span className={`font-bold text-lg ${
                                      overallPercentage >= 90 ? 'text-green-600' :
                                      overallPercentage >= 80 ? 'text-blue-600' :
                                      overallPercentage >= 70 ? 'text-yellow-600' :
                                      overallPercentage >= 60 ? 'text-orange-600' : 'text-red-600'
                                    }`}>
                                      {overallPercentage.toFixed(1)}%
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* View Details Modal */}
            {viewDetailsMda && (
              <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl">
                  <button
                    onClick={() => {
                      setViewDetailsMda(null);
                      setViewDetailsData(null);
                      setIsLoadingDetails(false);
                    }}
                    className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
                  >
                    &times;
                  </button>
                  <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                      {viewDetailsMda} - Detailed Scoring Report {dashboardYear}
                    </h2>
                    
                    {isLoadingDetails ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Loading detailed data...</p>
                      </div>
                    ) : viewDetailsData ? (
                      <div className="space-y-6">
                        {/* SLA Section */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-lg font-bold mb-3">1. Service Level Agreement (30 points)</h3>
                          {(() => {
                            const monthlyData: { [key: string]: { percentage?: number; method?: string } } = {};
                            if (viewDetailsData.sla?.firstHalf?.monthlySlaData) {
                              Object.entries(viewDetailsData.sla.firstHalf.monthlySlaData).forEach(([key, value]: [string, any]) => {
                                if (value && (value.method === 'file' || value.method === 'rating')) {
                                  monthlyData[key] = {
                                    percentage: value.method === 'file' ? value.overallPercentage : (value.rating / 10) * 100,
                                    method: value.method
                                  };
                                }
                              });
                            }
                            if (viewDetailsData.sla?.secondHalf?.monthlySlaData) {
                              Object.entries(viewDetailsData.sla.secondHalf.monthlySlaData).forEach(([key, value]: [string, any]) => {
                                if (value && (value.method === 'file' || value.method === 'rating')) {
                                  monthlyData[key] = {
                                    percentage: value.method === 'file' ? value.overallPercentage : (value.rating / 10) * 100,
                                    method: value.method
                                  };
                                }
                              });
                            }
                            
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            
                            // Show all 12 months (0-indexed: 0 = Jan, 11 = Dec)
                            return (
                              <div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                  {monthNames.map((monthName, index) => {
                                    const monthIndex = index; // 0-11 (0 = Jan, 11 = Dec)
                                    const monthKey = `${dashboardYear}-${monthIndex}`;
                                    const monthData = monthlyData[monthKey];
                                    
                                    return (
                                      <div key={monthKey} className={`p-2 rounded border ${
                                        monthData ? 'bg-white' : 'bg-gray-100'
                                      }`}>
                                        <div className="font-semibold text-sm">{monthName} {dashboardYear}</div>
                                        <div className={`text-xs ${
                                          monthData ? 'text-gray-600' : 'text-gray-400'
                                        }`}>
                                          {monthData ? `${monthData.percentage?.toFixed(1)}%` : 'No data'}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Mystery Shopping Section */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-lg font-bold mb-3">2. Mystery Shopping (20 points)</h3>
                          {(() => {
                            const hasReportGovQuestions = [
                              { key: 'reportGovIntegration', label: 'REPORTGOV INTEGRATION', type: 'rating' },
                              { key: 'callResponse', label: 'CALL RESPOND RATING', type: 'rating' },
                              { key: 'emailResponse', label: 'EMAIL RESPOND RATING', type: 'rating' },
                              { key: 'functionalWebsite', label: 'FUNCTIONAL WEBSITE', type: 'yesno' },
                              { key: 'csEmails', label: 'CUSTOMER SERVICES (CS) EMAILS LISTED', type: 'yesno' },
                              { key: 'csPhone', label: 'CUSTOMER SERVICES (CS) PHONE NUMBER LISTED', type: 'yesno' },
                              { key: 'faqAvailable', label: 'FAQ AVAILABLE', type: 'yesno' },
                              { key: 'onlineApplication', label: 'AVAILABILITY OF ONLINE APPLICATION/PROCESS', type: 'yesno' },
                              { key: 'onlineApproval', label: 'APPROVAL/FACILITY GRANTED ONLINE', type: 'yesno' },
                              { key: 'reportGovLink', label: 'REPORTGOV LINK INTEGRATED ON MDA WEBSITE', type: 'yesno' },
                              { key: 'satisfaction', label: 'SATISFACTION OF SERVICE THAT IS BEEN TESTED', type: 'rating' }
                            
                            ];
                            const noReportGovQuestions = [
                              { key: 'callResponse', label: 'CALL RESPOND RATING', type: 'rating' },
                              { key: 'emailResponse', label: 'EMAIL RESPOND RATING', type: 'rating' },
                              { key: 'functionalWebsite', label: 'FUNCTIONAL WEBSITE', type: 'yesno' },
                              { key: 'csEmails', label: 'CUSTOMER SERVICES (CS) EMAILS LISTED', type: 'yesno' },
                              { key: 'csPhone', label: 'CUSTOMER SERVICES (CS) PHONE NUMBER LISTED', type: 'yesno' },
                              { key: 'faqAvailable', label: 'FAQ AVAILABLE', type: 'yesno' },
                              { key: 'onlineApplication', label: 'AVAILABILITY OF ONLINE APPLICATION/PROCESS', type: 'yesno' },
                              { key: 'onlineApproval', label: 'APPROVAL/FACILITY GRANTED ONLINE', type: 'yesno' },
                              { key: 'reportGovLink', label: 'REPORTGOV LINK INTEGRATED ON MDA WEBSITE', type: 'yesno' }
                            ];
                            
                            const ratingLabels = ['No Response', 'POOR', 'FAIR', 'AVERAGE', 'GOOD', 'EXCELLENT'];
                            
                            // Combine ratings from both halves
                            const combinedRatings: { [key: string]: { values: number[], label: string, type: string } } = {};
                            let avgTotalScore = 0;
                            let avgMaxScore = 0;
                            let avgPercentage = 0;
                            let mysteryType = '';
                            let count = 0;
                            
                            [viewDetailsData.mysteryShopping?.firstHalf, viewDetailsData.mysteryShopping?.secondHalf].forEach(half => {
                              if (half) {
                                mysteryType = half.mysteryType || mysteryType;
                                const questions = half.mysteryType === 'hasReportGov' ? hasReportGovQuestions : noReportGovQuestions;
                                
                                questions.forEach(q => {
                                  const rating = half.ratings?.[q.key];
                                  if (rating !== undefined) {
                                    if (!combinedRatings[q.key]) {
                                      combinedRatings[q.key] = { values: [], label: q.label, type: q.type };
                                    }
                                    combinedRatings[q.key].values.push(rating);
                                  }
                                });
                                
                                if (half.totalScore) avgTotalScore += half.totalScore;
                                // Mystery Shopping is always out of 20 points, regardless of question count
                                avgMaxScore = 20;
                                if (half.percentage) avgPercentage += half.percentage;
                                count++;
                              }
                            });

                            const finalMysteryScore = count > 0 ? avgTotalScore / count : 0;
                            const finalMysteryPercentage = count > 0 ? avgPercentage / count : 0;

                            return (
                              <div className="bg-white p-3 rounded border">
                                {mysteryType && (
                                  <div className="font-semibold mb-2 text-sm text-gray-600">Type: {mysteryType === 'hasReportGov' ? 'Has ReportGov' : 'No ReportGov'}</div>
                                )}
                                <div className="space-y-1 text-sm">
                                  {Object.entries(combinedRatings).map(([key, info]) => {
                                    const avgRating = info.values.reduce((sum, val) => sum + val, 0) / info.values.length;
                                    
                                    if (info.type === 'rating') {
                                      const points = (avgRating / 5) * 1;
                                      return (
                                        <div key={key} className="flex justify-between">
                                          <span>{info.label}:</span>
                                          <span className="font-semibold">{ratingLabels[Math.round(avgRating)] || avgRating.toFixed(1)} ({points.toFixed(2)} points)</span>
                                        </div>
                                      );
                                    } else {
                                      const answer = avgRating >= 0.5 ? 'Yes' : 'No';
                                      const points = avgRating >= 0.5 ? 1 : 0;
                                      return (
                                        <div key={key} className="flex justify-between">
                                          <span>{info.label}:</span>
                                          <span className="font-semibold">{answer} ({points} point{points === 1 ? '' : 's'})</span>
                                        </div>
                                      );
                                    }
                                  })}
                                </div>
                                {finalMysteryScore > 0 && (
                                  <div className="mt-2 pt-2 border-t">
                                    <span className="font-bold">Total Score: {finalMysteryScore.toFixed(1)}/20 ({finalMysteryPercentage.toFixed(1)}%)</span>
                                  </div>
                                )}
                                {Object.keys(combinedRatings).length === 0 && (
                                  <p className="text-gray-500">No data available</p>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Other Metrics Sections */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-lg font-bold mb-3">3. Controversial (10 points)</h3>
                          <div className="space-y-2">
                            {(() => {
                              const contFirst = viewDetailsData.controversial?.firstHalf || { isControversial: false, score: 0 };
                              const contSecond = viewDetailsData.controversial?.secondHalf || { isControversial: false, score: 0 };
                              const hasData = viewDetailsData.controversial?.firstHalf || viewDetailsData.controversial?.secondHalf;
                              
                              if (hasData) {
                                const avgScore = ((contFirst.score || 0) + (contSecond.score || 0)) / 2;
                                const isControversial = contFirst.isControversial || contSecond.isControversial;
                                return (
                                  <>
                                    <div>Answer: {isControversial ? 'Yes' : 'No'}</div>
                                    <div>Score: {avgScore.toFixed(1)}/5</div>
                                  </>
                                );
                              }
                              return <p className="text-gray-500">No data available</p>;
                            })()}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-lg font-bold mb-3">4. Innovation (10 points)</h3>
                          <div className="space-y-2">
                            {(() => {
                              const innovFirst = viewDetailsData.innovation?.firstHalf || { isInnovative: false, score: 0 };
                              const innovSecond = viewDetailsData.innovation?.secondHalf || { isInnovative: false, score: 0 };
                              const hasData = viewDetailsData.innovation?.firstHalf || viewDetailsData.innovation?.secondHalf;
                              
                              if (hasData) {
                                const avgScore = ((innovFirst.score || 0) + (innovSecond.score || 0)) / 2;
                                const isInnovative = innovFirst.isInnovative || innovSecond.isInnovative;
                                return (
                                  <>
                                    <div>Answer: {isInnovative ? 'Yes' : 'No'}</div>
                                    <div>Score: {avgScore.toFixed(1)}/5</div>
                                  </>
                                );
                              }
                              return <p className="text-gray-500">No data available</p>;
                            })()}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-lg font-bold mb-3">5. Stakeholder Engagement (10 points)</h3>
                          <div className="space-y-2">
                            {(() => {
                              const stakeFirst = viewDetailsData.stakeholder?.firstHalf || { rate: 0, score: 0 };
                              const stakeSecond = viewDetailsData.stakeholder?.secondHalf || { rate: 0, score: 0 };
                              const hasData = viewDetailsData.stakeholder?.firstHalf || viewDetailsData.stakeholder?.secondHalf;
                              
                              if (hasData) {
                                const avgRate = ((stakeFirst.rate || 0) + (stakeSecond.rate || 0)) / 2;
                                const avgScore = ((stakeFirst.score || 0) + (stakeSecond.score || 0)) / 2;
                                return (
                                  <>
                                    <div>Rate: {avgRate.toFixed(1)}/10</div>
                                    <div>Score: {avgScore.toFixed(1)}/5</div>
                                  </>
                                );
                              }
                              return <p className="text-gray-500">No data available</p>;
                            })()}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-lg font-bold mb-3">5. Transparency (10 points)</h3>
                          <div className="space-y-2">
                            {(() => {
                              const firstHalf = viewDetailsData.transparency?.firstHalf;
                              const secondHalf = viewDetailsData.transparency?.secondHalf;
                              const hasData = firstHalf || secondHalf;

                              if (!hasData) {
                                return <p className="text-gray-500">No data available</p>;
                              }

                              const bothSkipped = (firstHalf?.isSkipped || false) && (secondHalf?.isSkipped || false);
                              if (bothSkipped) {
                                return (
                                  <div className="bg-white p-3 rounded border">
                                    <div className="text-sm space-y-1">
                                      <div className="font-bold text-yellow-600">⚠️ Transparency Skipped</div>
                                      <div className="text-gray-500">Score: 0/10 (Skipped)</div>
                                      <div className="text-xs text-blue-600 mt-2">
                                        Note: Total score normalized when transparency is skipped
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              const activeEntries = [firstHalf, secondHalf].filter(
                                entry => entry && !entry.isSkipped
                              );
                              const combinedScore =
                                activeEntries.length > 0
                                  ? activeEntries.reduce(
                                      (sum, entry) => sum + (entry?.score || 0),
                                      0
                                    ) / activeEntries.length
                                  : 0;

                              return (
                                <>
                                  <div className="space-y-2 text-sm">
                                    {transparencyQuestions.map(question => {
                                      const firstValue = firstHalf
                                        ? firstHalf.isSkipped
                                          ? "Skipped"
                                          : firstHalf.responses?.[question.key]
                                          ? "Yes"
                                          : "No"
                                        : "No data";
                                      const secondValue = secondHalf
                                        ? secondHalf.isSkipped
                                          ? "Skipped"
                                          : secondHalf.responses?.[question.key]
                                          ? "Yes"
                                          : "No"
                                        : "No data";

                                      return (
                                        <div key={question.key} className="flex justify-between">
                                          <span>{question.label}:</span>
                                          <span className="font-semibold text-gray-700">
                                            1st Half: {firstValue} | 2nd Half: {secondValue}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="font-bold">Combined Score: {combinedScore.toFixed(1)}/10</div>
                                  {secondHalf?.responses?.__copiedFrom && (
                                    <div className="text-xs text-blue-600 mt-2">
                                      2nd Half currently mirrors {secondHalf.responses.__copiedFrom}
                                    </div>
                                  )}
                                  {firstHalf?.responses?.__copiedFrom && (
                                    <div className="text-xs text-blue-600 mt-2">
                                      1st Half currently mirrors {firstHalf.responses.__copiedFrom}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-lg font-bold mb-3">6. Report Gov Resolution (15 points)</h3>
                          <div className="space-y-3">
                            {(() => {
                              const resFirst = viewDetailsData.reportGovResolution?.firstHalf || {};
                              const resSecond = viewDetailsData.reportGovResolution?.secondHalf || {};
                              const hasFirstHalf = resFirst && (resFirst.totalTickets !== undefined || resFirst.score !== undefined);
                              const hasSecondHalf = resSecond && (resSecond.totalTickets !== undefined || resSecond.score !== undefined);
                              const isSkipped = (resFirst?.isSkipped || false) || (resSecond?.isSkipped || false);
                              const hasData = hasFirstHalf || hasSecondHalf;
                              
                              if (isSkipped) {
                                return (
                                  <div className="bg-white p-3 rounded border">
                                    <div className="text-sm space-y-1">
                                      <div className="font-bold text-yellow-600">⚠️ Report Gov Resolution Skipped</div>
                                      <div className="text-gray-500">Score: 0/15 (Skipped)</div>
                                      <div className="text-xs text-blue-600 mt-2">
                                        Note: Total score normalized to 85=100% for fair ranking
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              if (hasData) {
                                let totalTickets, resolvedTickets, resolutionRate, avgResponseTime, avgResolutionTime, avgScore, periodLabel, originalHalfScore;
                                
                                if (hasFirstHalf && hasSecondHalf) {
                                  // Both halves have data - sum tickets, average times and score
                                  totalTickets = (resFirst.totalTickets || 0) + (resSecond.totalTickets || 0);
                                  resolvedTickets = (resFirst.resolvedTickets || 0) + (resSecond.resolvedTickets || 0);
                                  resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
                                  
                                  avgResponseTime = resFirst.averageResponseTime && resSecond.averageResponseTime
                                    ? ((resFirst.averageResponseTime || 0) + (resSecond.averageResponseTime || 0)) / 2
                                    : (resFirst.averageResponseTime || resSecond.averageResponseTime || 0);
                                  
                                  avgResolutionTime = resFirst.averageResolutionTime && resSecond.averageResolutionTime
                                    ? ((resFirst.averageResolutionTime || 0) + (resSecond.averageResolutionTime || 0)) / 2
                                    : (resFirst.averageResolutionTime || resSecond.averageResolutionTime || 0);
                                  
                                  avgScore = resFirst.score && resSecond.score
                                    ? ((resFirst.score || 0) + (resSecond.score || 0)) / 2
                                    : (resFirst.score || resSecond.score || 0);
                                  
                                  periodLabel = "Both Halves (Averaged)";
                                  originalHalfScore = null;
                                } else if (hasFirstHalf) {
                                  // Only first half has data - divide score by 2 (like table)
                                  totalTickets = resFirst.totalTickets || 0;
                                  resolvedTickets = resFirst.resolvedTickets || 0;
                                  resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
                                  avgResponseTime = resFirst.averageResponseTime || 0;
                                  avgResolutionTime = resFirst.averageResolutionTime || 0;
                                  originalHalfScore = resFirst.score || 0;
                                  avgScore = originalHalfScore / 2; // Divide by 2 when only one half
                                  periodLabel = "1st Half Only";
                                } else {
                                  // Only second half has data - divide score by 2 (like table)
                                  totalTickets = resSecond.totalTickets || 0;
                                  resolvedTickets = resSecond.resolvedTickets || 0;
                                  resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
                                  avgResponseTime = resSecond.averageResponseTime || 0;
                                  avgResolutionTime = resSecond.averageResolutionTime || 0;
                                  originalHalfScore = resSecond.score || 0;
                                  avgScore = originalHalfScore / 2; // Divide by 2 when only one half
                                  periodLabel = "2nd Half Only";
                                }
                                
                                return (
                                  <div className="bg-white p-3 rounded border">
                                    {periodLabel && (
                                      <div className="text-xs text-gray-500 mb-2 font-semibold">{periodLabel}</div>
                                    )}
                                    <div className="text-sm space-y-1">
                                      <div>Total Tickets: {totalTickets.toFixed(0)}</div>
                                      <div>Resolved Tickets: {resolvedTickets.toFixed(0)}</div>
                                      <div>Resolution Rate: {resolutionRate.toFixed(1)}%</div>
                                      <div>Avg Response Time: {avgResponseTime.toFixed(1)} hours</div>
                                      <div>Avg Resolution Time: {avgResolutionTime.toFixed(1)} hours</div>
                                      <div className="font-bold">Score: {avgScore.toFixed(1)}/15</div>
                                      {originalHalfScore !== null && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          {periodLabel.includes("1st") ? "1st" : "2nd"} Half only: {originalHalfScore.toFixed(1)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return <p className="text-gray-500">No data available</p>;
                            })()}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-lg font-bold mb-3">7. Monthly Report Submission (3 points)</h3>
                          {(() => {
                            const monthlyData: { [key: string]: boolean } = {};
                            if (viewDetailsData.monthlyReport?.firstHalf?.manualMonthlyReports) {
                              Object.entries(viewDetailsData.monthlyReport.firstHalf.manualMonthlyReports).forEach(([key, value]) => {
                                if (value) monthlyData[key] = true;
                              });
                            }
                            if (viewDetailsData.monthlyReport?.secondHalf?.manualMonthlyReports) {
                              Object.entries(viewDetailsData.monthlyReport.secondHalf.manualMonthlyReports).forEach(([key, value]) => {
                                if (value) monthlyData[key] = true;
                              });
                            }
                            
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            
                            // Show all 12 months (0-indexed: 0 = Jan, 11 = Dec)
                            return (
                              <div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                  {monthNames.map((monthName, index) => {
                                    const monthIndex = index; // 0-11 (0 = Jan, 11 = Dec)
                                    const monthKey = `${dashboardYear}-${monthIndex}`;
                                    const isSubmitted = monthlyData[monthKey] === true;
                                    
                                    return (
                                      <div key={monthKey} className={`p-2 rounded border ${
                                        isSubmitted ? 'bg-white' : 'bg-gray-100'
                                      }`}>
                                        <div className="font-semibold text-sm">{monthName} {dashboardYear}</div>
                                        <div className={`text-xs ${
                                          isSubmitted ? 'text-green-600' : 'text-red-500'
                                        }`}>
                                          {isSubmitted ? 'Submitted' : 'Not submitted'}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-lg font-bold mb-3">8. Timeliness in Submitting Report (2 points)</h3>
                          {(() => {
                            const monthlyData: { [key: string]: boolean } = {};
                            if (viewDetailsData.timeliness?.firstHalf?.manualTimeliness) {
                              Object.entries(viewDetailsData.timeliness.firstHalf.manualTimeliness).forEach(([key, value]) => {
                                if (value) monthlyData[key] = true;
                              });
                            }
                            if (viewDetailsData.timeliness?.secondHalf?.manualTimeliness) {
                              Object.entries(viewDetailsData.timeliness.secondHalf.manualTimeliness).forEach(([key, value]) => {
                                if (value) monthlyData[key] = true;
                              });
                            }
                            
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            
                            // Show all 12 months (0-indexed: 0 = Jan, 11 = Dec)
                            return (
                              <div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                  {monthNames.map((monthName, index) => {
                                    const monthIndex = index; // 0-11 (0 = Jan, 11 = Dec)
                                    const monthKey = `${dashboardYear}-${monthIndex}`;
                                    const isOnTime = monthlyData[monthKey] === true;
                                    
                                    return (
                                      <div key={monthKey} className={`p-2 rounded border ${
                                        isOnTime ? 'bg-white' : 'bg-gray-100'
                                      }`}>
                                        <div className="font-semibold text-sm">{monthName} {dashboardYear}</div>
                                        <div className={`text-xs ${
                                          isOnTime ? 'text-green-600' : 'text-red-500'
                                        }`}>
                                          {isOnTime ? 'On Time' : 'Late'}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Overall Score Summary */}
                        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                          <h3 className="text-xl font-bold mb-3">OVERALL SCORE SUMMARY</h3>
                          {(() => {
                            // Calculate scores (same logic as PDF) - Exclude November (10) and December (11)
                            const allMonthKeys = new Set<string>();
                            [viewDetailsData.sla?.firstHalf, viewDetailsData.sla?.secondHalf].forEach(half => {
                              if (half?.monthlySlaData && typeof half.monthlySlaData === 'object') {
                                Object.keys(half.monthlySlaData).forEach(key => {
                                  // Extract month index from key (format: "year-month")
                                  const monthIndex = parseInt(key.split('-')[1]);
                                  // Exclude November (10) and December (11)
                                  if (monthIndex === 10 || monthIndex === 11) return;
                                  
                                  const monthData = half.monthlySlaData[key];
                                  if (monthData && ((monthData.method === 'file' && monthData.overallPercentage !== null) || (monthData.method === 'rating' && monthData.rating > 0))) {
                                    allMonthKeys.add(key);
                                  }
                                });
                              }
                            });
                            const totalMonthsWithData = allMonthKeys.size;
                            // Recalculate sumTotalScore excluding November and December
                            let sumTotalScore = 0;
                            [viewDetailsData.sla?.firstHalf, viewDetailsData.sla?.secondHalf].forEach(half => {
                              if (half?.monthlySlaData && typeof half.monthlySlaData === 'object') {
                                Object.entries(half.monthlySlaData).forEach(([key, monthData]: [string, any]) => {
                                  // Extract month index from key (format: "year-month")
                                  const monthIndex = parseInt(key.split('-')[1]);
                                  // Exclude November (10) and December (11)
                                  if (monthIndex === 10 || monthIndex === 11) return;
                                  
                                  if (monthData && ((monthData.method === 'file' && monthData.overallPercentage !== null) || (monthData.method === 'rating' && monthData.rating > 0))) {
                                    // Calculate score for this month (5 points max per month)
                                    if (monthData.method === 'file') {
                                      sumTotalScore += (monthData.overallPercentage / 100) * 5;
                                    } else if (monthData.method === 'rating') {
                                      sumTotalScore += (monthData.rating / 10) * 5;
                                    }
                                  }
                                });
                              }
                            });
                            const maxPossibleRawScore = totalMonthsWithData * 5;
                            const pointsPerMonth = 30 / 10; // Changed from 12 to 10 months
                            const maxPossibleScoreForMonths = totalMonthsWithData * pointsPerMonth;
                            const slaScore = totalMonthsWithData > 0 ? (sumTotalScore / maxPossibleRawScore) * maxPossibleScoreForMonths : 0;

                            const mysteryScore = viewDetailsData.mysteryShopping?.firstHalf || viewDetailsData.mysteryShopping?.secondHalf ?
                              ((viewDetailsData.mysteryShopping?.firstHalf?.totalScore || 0) + (viewDetailsData.mysteryShopping?.secondHalf?.totalScore || 0)) / 2 : 0;
                            const controversialScore = viewDetailsData.controversial?.firstHalf || viewDetailsData.controversial?.secondHalf ?
                              ((viewDetailsData.controversial?.firstHalf?.score || 0) + (viewDetailsData.controversial?.secondHalf?.score || 0)) / 2 : 0;
                            const innovationScore = viewDetailsData.innovation?.firstHalf || viewDetailsData.innovation?.secondHalf ?
                              ((viewDetailsData.innovation?.firstHalf?.score || 0) + (viewDetailsData.innovation?.secondHalf?.score || 0)) / 2 : 0;
                            const stakeholderScore = viewDetailsData.stakeholder?.firstHalf || viewDetailsData.stakeholder?.secondHalf ?
                              ((viewDetailsData.stakeholder?.firstHalf?.score || 0) + (viewDetailsData.stakeholder?.secondHalf?.score || 0)) / 2 : 0;
                            let transparencyScore = 0;
                            let isTransparencySkipped = false;
                            const transparencyEntries = [viewDetailsData.transparency?.firstHalf, viewDetailsData.transparency?.secondHalf]
                              .filter(Boolean);
                            if (transparencyEntries.length > 0) {
                              const activeTransparencyEntries = transparencyEntries.filter(entry => !entry?.isSkipped);
                              if (activeTransparencyEntries.length > 0) {
                                transparencyScore =
                                  activeTransparencyEntries.reduce((sum, entry) => sum + (entry?.score || 0), 0) /
                                  activeTransparencyEntries.length;
                              }
                              isTransparencySkipped = activeTransparencyEntries.length === 0;
                            }
                            // Calculate Report Gov Resolution score (divide by 2 if only one half, average if both halves)
                            let reportGovResScore = 0;
                            const isReportGovSkipped = (viewDetailsData.reportGovResolution?.firstHalf?.isSkipped || false) || 
                                                      (viewDetailsData.reportGovResolution?.secondHalf?.isSkipped || false);
                            if (viewDetailsData.reportGovResolution?.firstHalf || viewDetailsData.reportGovResolution?.secondHalf) {
                              const resFirst = viewDetailsData.reportGovResolution?.firstHalf || {};
                              const resSecond = viewDetailsData.reportGovResolution?.secondHalf || {};
                              const hasFirstHalf = resFirst && resFirst.score !== undefined && resFirst.score !== null;
                              const hasSecondHalf = resSecond && resSecond.score !== undefined && resSecond.score !== null;
                              
                              if (!isReportGovSkipped) {
                                if (hasFirstHalf && hasSecondHalf) {
                                  // Both halves have data - average
                                  reportGovResScore = ((resFirst.score || 0) + (resSecond.score || 0)) / 2;
                                } else if (hasFirstHalf) {
                                  // Only first half - divide by 2
                                  reportGovResScore = (resFirst.score || 0) / 2;
                                } else if (hasSecondHalf) {
                                  // Only second half - divide by 2
                                  reportGovResScore = (resSecond.score || 0) / 2;
                                }
                              }
                            }
                            
                            const monthlyReportMonths = new Set<string>();
                            [viewDetailsData.monthlyReport?.firstHalf, viewDetailsData.monthlyReport?.secondHalf].forEach(half => {
                              if (half?.manualMonthlyReports && typeof half.manualMonthlyReports === 'object') {
                                Object.keys(half.manualMonthlyReports).forEach(key => {
                                  // Extract month index from key (format: "year-month")
                                  const monthIndex = parseInt(key.split('-')[1]);
                                  // Exclude November (10) and December (11)
                                  if (monthIndex === 10 || monthIndex === 11) return;
                                  
                                  if (half.manualMonthlyReports[key]) monthlyReportMonths.add(key);
                                });
                              }
                            });
                            const monthlyReportScore = monthlyReportMonths.size * (3 / 10); // Changed from 12 to 10 months
                            
                            const timelinessMonths = new Set<string>();
                            [viewDetailsData.timeliness?.firstHalf, viewDetailsData.timeliness?.secondHalf].forEach(half => {
                              if (half?.manualTimeliness && typeof half.manualTimeliness === 'object') {
                                Object.keys(half.manualTimeliness).forEach(key => {
                                  // Extract month index from key (format: "year-month")
                                  const monthIndex = parseInt(key.split('-')[1]);
                                  // Exclude November (10) and December (11)
                                  if (monthIndex === 10 || monthIndex === 11) return;
                                  
                                  if (half.manualTimeliness[key]) timelinessMonths.add(key);
                                });
                              }
                            });
                            const timelinessScore = timelinessMonths.size * (2 / 10); // Changed from 12 to 10 months

                            const totalScore = slaScore + mysteryScore + controversialScore + innovationScore + stakeholderScore + 
                                              transparencyScore + reportGovResScore + monthlyReportScore + timelinessScore;
                            
                            let maxPossiblePoints = 100;
                            if (isTransparencySkipped) {
                              maxPossiblePoints -= 10;
                            }
                            if (isReportGovSkipped) {
                              maxPossiblePoints -= 15;
                            }
                            const totalPercentage = maxPossiblePoints > 0
                              ? (totalScore / maxPossiblePoints) * 100
                              : 0;

                            return (
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span>SLA:</span><span className="font-semibold">{slaScore.toFixed(1)}/30</span></div>
                                <div className="flex justify-between"><span>Mystery Shopping:</span><span className="font-semibold">{mysteryScore.toFixed(1)}/20</span></div>
                                <div className="flex justify-between"><span>Controversial:</span><span className="font-semibold">{controversialScore.toFixed(1)}/5</span></div>
                                <div className="flex justify-between"><span>Innovation:</span><span className="font-semibold">{innovationScore.toFixed(1)}/5</span></div>
                                <div className="flex justify-between"><span>Stakeholder Engagement:</span><span className="font-semibold">{stakeholderScore.toFixed(1)}/10</span></div>
                                <div className={`flex justify-between ${isTransparencySkipped ? 'text-gray-500' : ''}`}>
                                  <span>Transparency: {isTransparencySkipped && <span className="text-yellow-600">(Skipped)</span>}</span>
                                  <span className="font-semibold">{transparencyScore.toFixed(1)}/10</span>
                                </div>
                                <div className={`flex justify-between ${isReportGovSkipped ? 'text-gray-500' : ''}`}>
                                  <span>Report Gov Resolution: {isReportGovSkipped && <span className="text-yellow-600">(Skipped)</span>}</span>
                                  <span className="font-semibold">{reportGovResScore.toFixed(1)}/15</span>
                                </div>
                                <div className="flex justify-between"><span>Monthly Report Submission:</span><span className="font-semibold">{monthlyReportScore.toFixed(1)}/3</span></div>
                                <div className="flex justify-between"><span>Timeliness:</span><span className="font-semibold">{timelinessScore.toFixed(1)}/2</span></div>
                                {(isReportGovSkipped || isTransparencySkipped) && (
                                  <div className="text-xs text-blue-600 mt-2 p-2 bg-blue-50 rounded">
                                    ⚠️ Optional metrics skipped - normalized to {maxPossiblePoints}=100% for fair ranking
                                  </div>
                                )}
                                <div className="mt-4 pt-4 border-t-2 border-blue-400 flex justify-between text-lg">
                                  <span className="font-bold">OVERALL TOTAL:</span>
                                  <div className="flex flex-col items-end">
                                    <span className="font-bold">{totalScore.toFixed(1)}/{maxPossiblePoints}</span>
                                    <span className="font-bold">{totalPercentage.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No data available for this MDA</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full flex-col flex items-center justify-center">
            <div className="w-full flex flex-col gap-5">
              {/* MDA Selection */}
              <div className="flex flex-col gap-4">
                <FormControl sx={{ width: 250 }} variant="outlined">
                  <InputLabel id="mda-label">Select MDA</InputLabel>
                  <Select
                    labelId="mda-label"
                    id="mda-select"
                    value={selectedMda}
                    onChange={(e) => setSelectedMda(e.target.value)}
                    label="Select MDA"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {mdasList.map((mda) => {
                      // Check if this MDA exists in the database (with or without abbreviation prefix)
                      const isActive = mdasWithScores?.find(m => 
                        m.name === mda.name || 
                        m.name === `${mda.abbreviation} - ${mda.name}` ||
                        m.name.includes(mda.name) ||
                        mda.name.includes(m.name.replace(/^[^-]+ - /, ''))
                      );
                      
                      // Check if this MDA already has a score for the current period
                      const sanitizedKey = sanitizeMdaName(mda.name);
                      const hasScoreForPeriod = allMdaScoringStatuses?.[sanitizedKey] ? true : false;
                      const existingScore = allMdaScoringStatuses?.[sanitizedKey];
                      
                      return (
                        <MenuItem 
                          key={mda.name} 
                          value={mda.name}
                          disabled={hasScoreForPeriod}
                        >
                          {mda.name} {isActive ? '✅' : '⚠️'} {hasScoreForPeriod ? `📊 Already Scored (${existingScore?.grade || 'N/A'})` : ''}
                      </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
                
                {/* MDA Status Display */}
                {selectedMda && (() => {
                  // Find the matching MDA in the database
                  const selectedMdaFromList = mdasList.find(m => m.name === selectedMda);
                  const isActive = mdasWithScores?.find(m => 
                    m.name === selectedMda || 
                    (selectedMdaFromList && m.name === `${selectedMdaFromList.abbreviation} - ${selectedMda}`) ||
                    m.name.includes(selectedMda) ||
                    (selectedMdaFromList && selectedMda.includes(m.name.replace(/^[^-]+ - /, '')))
                  );
                  
                  // Check if this MDA already has a score for the current period
                  const hasScoreForPeriod = mdaScoringStatus?.hasScore || false;
                  const existingScore = mdaScoringStatus?.existingScore;
                  
                  return (
                    <div className={`p-4 rounded-lg border ${
                      hasScoreForPeriod
                        ? 'bg-red-50 border-red-200'
                        : isActive 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <h3 className={`text-sm font-semibold mb-2 ${
                        hasScoreForPeriod
                          ? 'text-red-800'
                          : isActive 
                          ? 'text-green-800' 
                          : 'text-yellow-800'
                      }`}>
                        {hasScoreForPeriod
                          ? '🚫 MDA Already Scored for This Period'
                          : isActive 
                          ? '✅ MDA Active on Platform' 
                          : '⚠️ MDA Not Active on Platform'
                        }
                      </h3>
                      <div className={`text-xs space-y-1 ${
                        hasScoreForPeriod
                          ? 'text-red-700'
                          : isActive 
                          ? 'text-green-700' 
                          : 'text-yellow-700'
                      }`}>
                        <p>Selected MDA: {selectedMda}</p>
                        {hasScoreForPeriod && existingScore && (
                          <>
                            <p>Existing Score: {existingScore.totalPercentage.toFixed(1)}%</p>
                            <p>Grade: {existingScore.grade}</p>
                            <p>Status: {existingScore.status}</p>
                            <p>Scored on: {new Date(existingScore.scoredAt).toLocaleDateString()}</p>
                          </>
                        )}
                        {!hasScoreForPeriod && isActive && (
                          <p>Database Name: {isActive.name}</p>
                        )}
                        {!hasScoreForPeriod && (
                          isActive 
                            ? <p>Live data available - automatic scoring enabled</p>
                            : <p>Manual scoring only - no live ticket/report data available</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
                
                {/* Past Scoring Data Display */}
                {pastScoringData && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-semibold text-blue-800 mb-2">
                      📊 Past Performance Data (Used for Averaging)
                    </h3>
                    <div className="text-xs text-blue-700 space-y-1">
                      <p>Previous scoring periods: {pastScoringData.pastScores}</p>
                      <p>Last scored: {pastScoringData.lastScored ? new Date(pastScoringData.lastScored).toLocaleDateString() : 'N/A'}</p>
                      <p>Current calculation: 70% current score + 30% past average</p>
                    </div>
                  </div>
                )}
                
                
                                 {/* Scoring Period Info */}
                 <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                   <h3 className="text-sm font-semibold text-green-800 mb-2">
                     📅 Scoring Period: {scoringPeriod}
                   </h3>
                   <div className="text-xs text-green-700 space-y-1">
                     <p>Evaluating months: {getMonthsForPeriod(scoringPeriod).map(m => 
                       new Date(m.year, m.month, 1).toLocaleString('default', { month: 'short' })
                     ).join(', ')}</p>
                     <p>Total months in period: {getMonthsForPeriod(scoringPeriod).length}</p>
                     <p>Year: {scoringPeriod.match(/\d{4}/)?.[0] || currentYear}</p>
                   </div>
                 </div>
              </div>

              {/* Scoring Metrics Grid */}
              <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Service Level Agreement */}
                <div className="bg-gray-100/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Service Level Agreement</h2>
                      {isLoadingSLAData && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          🔄 Loading...
                        </span>
                      )}
                      {!isLoadingSLAData && savedSLAData && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          💾 Saved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowSLARanking(true)}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
                        title="View all MDAs ranked by SLA score"
                      >
                        📊 Rankings
                      </button>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        30 Points
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-4">
                        📅 {scoringPeriod.includes("1st Half") ? `Jan-Jun ${scoringPeriod.match(/\d{4}/)?.[0] || currentYear}` : 
                             scoringPeriod.includes("2nd Half") ? `Jul-Dec ${scoringPeriod.match(/\d{4}/)?.[0] || currentYear}` : "All Periods"}
                      </p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mb-4">
                        {getMonthsForPeriod(scoringPeriod).map((periodMonth, index) => {
                          const monthName = new Date(periodMonth.year, periodMonth.month, 1)
                            .toLocaleString('default', { month: 'short' });
                          const monthKey = `${periodMonth.year}-${periodMonth.month}`;
                          const monthData = monthlySlaData[monthKey];
                          const hasData = monthData && (monthData.method === 'file' ? monthData.overallPercentage !== null : monthData.rating > 0);
                          
                          return (
                            <div key={index} className={`p-2 rounded-md text-center border ${
                              hasData 
                                ? 'bg-green-100 text-green-800 border-green-300' 
                                : 'bg-gray-100 text-gray-600 border-gray-300'
                            }`}>
                              <div className="font-medium">{monthName}</div>
                              <div className="text-xs">
                                {hasData ? '✓ 5pts' : '0pts'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="text-center space-y-2">
                        <div className="text-lg font-semibold">
                          Score: {calculateMonthlySlaScore().totalScore.toFixed(1)}/30
                        </div>
                        <div className="text-sm text-gray-600">
                          {calculateMonthlySlaScore().monthsWithData}/{calculateMonthlySlaScore().totalMonths} months completed
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setShowSlaModal(true)} 
                            className="bg-blue-500 px-4 py-2 rounded-md text-white hover:bg-blue-600 transition-colors duration-300 text-sm font-medium"
                          >
                            Configure Monthly SLA
                          </button>
                          <button 
                            onClick={handleSaveSLAData}
                            disabled={!selectedMda}
                            className={`px-4 py-2 rounded-md text-white text-sm font-medium transition-colors duration-300 ${
                              !selectedMda 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-green-500 hover:bg-green-600'
                            }`}
                          >
                            💾 Save SLA Data
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mystery Shopping */}
                <div className="bg-gray-100/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Mystery Shopping</h2>
                      {isLoadingMysteryShoppingData && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          🔄 Loading...
                        </span>
                      )}
                      {!isLoadingMysteryShoppingData && savedMysteryShoppingData && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          💾 Saved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowMysteryRanking(true)}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
                        title="View all MDAs ranked by Mystery Shopping score"
                      >
                        📊 Rankings
                      </button>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        20 Points
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowMysteryModal(true)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Open Mystery Shopping Assessment
                    </button>

                    <div className="text-center">
                      Score: {calculateMysteryScore().toFixed(1)}/20
                    </div>

                    <button
                      onClick={handleSaveMysteryShoppingData}
                      disabled={!selectedMda || Object.keys(mysteryRatings).length === 0}
                      className={`w-full py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors ${
                        !selectedMda || Object.keys(mysteryRatings).length === 0
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                    >
                      💾 Save 
                    </button>
                  </div>
                </div>

                {/* Controversial */}
                <div className="bg-gray-100/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Controversial</h2>
                      {isLoadingControversialData && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          🔄 Loading...
                        </span>
                      )}
                      {!isLoadingControversialData && savedControversialData && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          💾 Saved
                        </span>
                      )}
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      10 Points
                    </span>
                  </div>
                  
                  <Select
                    value={isControversial ? 'yes' : 'no'}
                    onChange={(e) => setIsControversial(e.target.value === 'yes')}
                    className="w-full mb-3"
                  >
                    <MenuItem value="no">No</MenuItem>
                    <MenuItem value="yes">Yes</MenuItem>
                  </Select>

                  <div className="text-center mb-3">
                    Score: {(isControversial ? 0 : 5).toFixed(1)}/5
                  </div>

                  <button
                    onClick={handleSaveControversialData}
                    disabled={!selectedMda}
                    className={`w-full py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors ${
                      !selectedMda
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    💾 Save 
                  </button>
                </div>

                {/* Innovation */}
                <div className="bg-gray-100/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Innovation</h2>
                      {isLoadingInnovationData && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          🔄 Loading...
                        </span>
                      )}
                      {!isLoadingInnovationData && savedInnovationData && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          💾 Saved
                        </span>
                      )}
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      5 Points
                    </span>
                  </div>
                  
                  <Select
                    value={isInnovative ? 'yes' : 'no'}
                    onChange={(e) => setIsInnovative(e.target.value === 'yes')}
                    className="w-full mb-3"
                  >
                    <MenuItem value="no">No</MenuItem>
                    <MenuItem value="yes">Yes</MenuItem>
                  </Select>

                  <div className="text-center mb-3">
                    Score: {(isInnovative ? 5 : 0).toFixed(1)}/5
                  </div>

                  <button
                    onClick={handleSaveInnovationData}
                    disabled={!selectedMda}
                    className={`w-full py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors ${
                      !selectedMda
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    💾 Save 
                  </button>
                </div>

                {/* Stakeholder Engagement */}
                <div className="bg-gray-100/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Stakeholder Engagement</h2>
                      {isLoadingStakeholderData && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          🔄 Loading...
                        </span>
                      )}
                      {!isLoadingStakeholderData && savedStakeholderData && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          💾 Saved
                        </span>
                      )}
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      10 Points
                    </span>
                  </div>
                  
                  <Select
                    value={stakeholderRate || 0}
                    onChange={(e) => setStakeholderRate(Number(e.target.value))}
                    className="w-full mb-3"
                  >
                    {[...Array(11)].map((_, i) => (
                      <MenuItem key={i} value={i}>{i}</MenuItem>
                    ))}
                  </Select>

                  <div className="text-center mb-3">
                    Score: {((stakeholderRate / 10) * 10).toFixed(1)}/10
                  </div>

                  <button
                    onClick={handleSaveStakeholderData}
                    disabled={!selectedMda}
                    className={`w-full py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors ${
                      !selectedMda
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    💾 Save 
                  </button>
                </div>

                {/* Transparency */}
                <div className="bg-gray-100/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Transparency</h2>
                      {isLoadingTransparencyData && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          🔄 Loading...
                        </span>
                      )}
                      {!isLoadingTransparencyData && savedTransparencyData && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          💾 Saved
                        </span>
                      )}
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      10 Points
                    </span>
                  </div>
                  
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="transparency-mode"
                        checked={!skipTransparency}
                        onChange={() => setSkipTransparency(false)}
                        className="mr-2"
                      />
                      Evaluate
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="transparency-mode"
                        checked={skipTransparency}
                        onChange={() => setSkipTransparency(true)}
                        className="mr-2"
                      />
                      Skip (0 points)
                    </label>
                  </div>

                  <div className={`space-y-2 mb-3 ${skipTransparency ? 'opacity-50 pointer-events-none' : ''}`}>
                    {transparencyQuestions.map((question) => (
                      <label key={question.key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={transparencyItems[question.key]}
                          onChange={(e) =>
                            setTransparencyItems((prev) => ({
                              ...prev,
                              [question.key]: e.target.checked,
                            }))
                          }
                          className="mr-2"
                        />
                        {question.label}
                      </label>
                    ))}
                  </div>

                  <div className="text-center mb-3">
                    Score: {calculateTransparencyScore().toFixed(1)}/10
                  </div>

                  <button
                    onClick={handleSaveTransparencyData}
                    disabled={!selectedMda}
                    className={`w-full py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors ${
                      !selectedMda
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    💾 Save 
                  </button>
                </div>

                {/* Report Governance Resolution */}
                <div className="bg-gray-100/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">Report Gov Resolution</h2>
                      {isLoadingReportGovData && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          🔄 Loading...
                        </span>
                      )}
                      {!isLoadingReportGovData && savedReportGovData && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          💾 Saved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowReportGovRanking(true)}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
                        title="View all MDAs ranked by Report Gov Resolution score"
                      >
                        📊 Rankings
                      </button>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        15 Points
                      </span>
                    </div>
                  </div>
                  
                  {/* Toggle between automatic, manual, and skip */}
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="reportgov-mode"
                        checked={!useManualReportGov && !skipReportGov}
                        onChange={() => {
                          setUseManualReportGov(false);
                          setSkipReportGov(false);
                        }}
                        className="mr-2"
                      />
                      Automatic
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="reportgov-mode"
                        checked={useManualReportGov && !skipReportGov}
                        onChange={() => {
                          setUseManualReportGov(true);
                          setSkipReportGov(false);
                        }}
                        className="mr-2"
                      />
                      Manual
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="reportgov-mode"
                        checked={skipReportGov}
                        onChange={() => {
                          setSkipReportGov(true);
                          setUseManualReportGov(false);
                        }}
                        className="mr-2"
                      />
                      Skip (0 points)
                    </label>
                  </div>

                  {!useManualReportGov ? (
                    <>
                      <div className="text-sm mb-3">
                        <p className="text-xs text-blue-600 mb-2">
                          📅 Evaluating: {scoringPeriod.includes("1st Half") ? `Jan-Jun ${scoringPeriod.match(/\d{4}/)?.[0] || currentYear}` : 
                                         scoringPeriod.includes("2nd Half") ? `Jul-Dec ${scoringPeriod.match(/\d{4}/)?.[0] || currentYear}` : "All Periods"}
                        </p>
                        <p>Total Tickets: {ticketResolutionData.totalTickets}</p>
                        <p>Resolved: {ticketResolutionData.resolvedTickets}</p>
                        <p>Resolution Rate: {ticketResolutionData.resolutionRate.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">
                          Data Source: {(() => {
                            const selectedMdaFromList = mdasList.find(m => m.name === selectedMda);
                            const isActive = mdasWithScores?.find(m => 
                              m.name === selectedMda || 
                              (selectedMdaFromList && m.name === `${selectedMdaFromList.abbreviation} - ${selectedMda}`) ||
                              m.name.includes(selectedMda) ||
                              (selectedMdaFromList && selectedMda.includes(m.name.replace(/^[^-]+ - /, '')))
                            );
                            return isActive 
                              ? (periodTicketData ? 'Period-specific' : 'Overall MDA data')
                              : 'MDA not active on platform';
                          })()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Period Data: {(() => {
                            const selectedMdaFromList = mdasList.find(m => m.name === selectedMda);
                            const isActive = mdasWithScores?.find(m => 
                              m.name === selectedMda || 
                              (selectedMdaFromList && m.name === `${selectedMdaFromList.abbreviation} - ${selectedMda}`) ||
                              m.name.includes(selectedMda) ||
                              (selectedMdaFromList && selectedMda.includes(m.name.replace(/^[^-]+ - /, '')))
                            );
                            return isActive 
                              ? (periodTicketData ? 
                            `${periodTicketData.totalTickets} tickets, ${periodTicketData.resolvedTickets} resolved` : 
                                  'No period data available')
                              : 'Use manual input below';
                          })()}
                        </p>
                        <p>Avg Response Time: {ticketResolutionData.averageResponseTime.toFixed(1)} hours</p>
                        <p>Avg Resolution Time: {ticketResolutionData.averageResolutionTime.toFixed(1)} hours</p>
                        <p className="text-xs text-gray-500">
                          Scoring: Resolution Rate (7pts) + Response Time (3pts) + Resolution Time (5pts)
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setReportgovRate(ticketResolutionData.score)}
                          className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
                        >
                          Calculate Score
                        </button>
                        <button
                          onClick={handleSaveReportGovData}
                          disabled={!selectedMda}
                          className={`px-4 py-2 rounded text-white text-sm font-medium transition-colors duration-300 ${
                            !selectedMda 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-blue-500 hover:bg-blue-600'
                          }`}
                        >
                          💾 Save
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm mb-3">
                        <p className="text-xs text-blue-600 mb-2">
                          📅 Manual Input for: {scoringPeriod.includes("1st Half") ? `Jan-Jun ${scoringPeriod.match(/\d{4}/)?.[0] || currentYear}` : 
                                             scoringPeriod.includes("2nd Half") ? `Jul-Dec ${scoringPeriod.match(/\d{4}/)?.[0] || currentYear}` : "All Periods"}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Total Tickets</label>
                          <input
                            type="number"
                            min="0"
                            value={manualTotalTickets}
                            onChange={(e) => setManualTotalTickets(Number(e.target.value))}
                            className="w-full border rounded px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Resolved Tickets</label>
                          <input
                            type="number"
                            min="0"
                            max={manualTotalTickets}
                            value={manualResolvedTickets}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              // Ensure resolved tickets never exceed total tickets
                              if (value > manualTotalTickets) {
                                setManualResolvedTickets(manualTotalTickets);
                              } else {
                                setManualResolvedTickets(value);
                              }
                            }}
                            className="w-full border rounded px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Avg Response Time (hours)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={manualAverageResponseTime}
                            onChange={(e) => setManualAverageResponseTime(Number(e.target.value))}
                            className="w-full border rounded px-3 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Avg Resolution Time (hours)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={manualAverageResolutionTime}
                            onChange={(e) => setManualAverageResolutionTime(Number(e.target.value))}
                            className="w-full border rounded px-3 py-2"
                          />
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Resolution Rate: {manualTotalTickets > 0 ? ((manualResolvedTickets / manualTotalTickets) * 100).toFixed(1) : 0}%</p>
                        <p>Scoring: Resolution Rate (7pts) + Response Time (3pts) + Resolution Time (5pts)</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setManualReportGovRate(calculateManualReportGovScore())}
                          className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
                        >
                          Calculate Manual Score
                        </button>
                        <button
                          onClick={handleSaveReportGovData}
                          disabled={!selectedMda}
                          className={`px-4 py-2 rounded text-white text-sm font-medium transition-colors duration-300 ${
                            !selectedMda 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-blue-500 hover:bg-blue-600'
                          }`}
                        >
                          💾 Save
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-center mt-3">
                    Score: {useManualReportGov ? manualReportGovRate.toFixed(1) : reportgovRate.toFixed(1)}/15
                  </div>
                </div>
              </div>

              {/* Monthly Report Submission and Deadline Compliance */}
              <div className="w-full flex flex-col md:flex-row justify-between gap-5">
                {/* Monthly Report Submission */}
                <div className="w-full md:w-1/2 flex flex-col items-center bg-gray-100/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center gap-2 w-full mb-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <h2 className="text-lg font-semibold">Monthly Report Submission</h2>
                        <p className="text-sm text-gray-600">Track submission of monthly reports</p>
                      </div>
                      {isLoadingMonthlyReportData && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          🔄 Loading...
                        </span>
                      )}
                      {!isLoadingMonthlyReportData && savedMonthlyReportData && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          💾 Saved
                        </span>
                      )}
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      3 Points
                    </span>
                  </div>
                  
                  {/* Toggle between automatic and manual */}
                  <div className="flex gap-4 mb-3 w-full">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="monthly-mode"
                        checked={!useManualMonthlyReports}
                        onChange={() => setUseManualMonthlyReports(false)}
                        className="mr-2"
                      />
                      Automatic
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="monthly-mode"
                        checked={useManualMonthlyReports}
                        onChange={() => setUseManualMonthlyReports(true)}
                        className="mr-2"
                      />
                      Manual
                    </label>
                  </div>
                  
                  <div className="w-full bg-gray-50 p-4 rounded-md mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Progress:</span>
                      <span className="text-sm font-semibold">{monthlyReportData.submitted}/{monthlyReportData.total} Reports</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${monthlyReportData.percentage}%` }}
                      ></div>
                    </div>
                  </div>

               
                  
                  {/* Monthly Report Grid */}
                  <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-4">
                    {getMonthsForPeriod(scoringPeriod).map((periodMonth, index) => {
                      const monthName = new Date(periodMonth.year, periodMonth.month, 1)
                        .toLocaleString('default', { month: 'short' });
                      const monthKey = `${periodMonth.year}-${periodMonth.month}`;
                      
                      if (useManualMonthlyReports) {
                        // Manual mode - show checkboxes
                        const isChecked = manualMonthlyReports[monthKey] || false;
                        return (
                          <div key={index} className="p-2 rounded-md text-center border">
                            <div className="font-medium mb-1">{monthName}</div>
                            <label className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => setManualMonthlyReports(prev => ({
                                  ...prev,
                                  [monthKey]: e.target.checked
                                }))}
                                className="mr-1"
                              />
                              <span className="text-xs">Submitted</span>
                            </label>
                          </div>
                        );
                      } else {
                        // Automatic mode - show status from data
                        if (!realMonthlyReports) {
                          return (
                            <div key={index} className="p-2 rounded-md text-center bg-gray-100 text-gray-600">
                              <div className="font-medium">{monthName}</div>
                              <div className="text-xs">No data</div>
                            </div>
                          );
                        }
                        
                        // Helper function to check if report name contains month name
                        const reportNameContainsMonth = (reportName: string | undefined): boolean => {
                          if (!reportName) return false;
                          const nameLower = reportName.toLowerCase();
                          const monthNameLower = monthName.toLowerCase();
                          const monthNameShort = new Date(periodMonth.year, periodMonth.month, 1)
                            .toLocaleString('default', { month: 'short' }).toLowerCase();
                          return nameLower.includes(monthNameLower) || 
                                 nameLower.includes(monthNameShort);
                        };
                        
                        // Find report - first try by deadline date, then also check report names in the reports array
                        let monthReport = realMonthlyReports.find(report => {
                          const reportDate = new Date(report.deadline);
                          return reportDate.getMonth() === periodMonth.month && 
                                 reportDate.getFullYear() === periodMonth.year;
                        });
                        
                        // If no match by deadline or report not submitted, check if any report in any month has this month in its name
                        if (!monthReport || !monthReport.submitted) {
                          for (const reportGroup of realMonthlyReports) {
                            if (reportGroup.reports && Array.isArray(reportGroup.reports)) {
                              const matchingReport = reportGroup.reports.find((r: any) => 
                                reportNameContainsMonth(r.reportName)
                              );
                              if (matchingReport) {
                                // Found a report with this month in the name, check if it's for this month
                                const reportDate = new Date(reportGroup.deadline);
                                // If the report group's month matches our target month (based on name), use it
                                if (reportDate.getMonth() !== periodMonth.month || 
                                    reportDate.getFullYear() !== periodMonth.year) {
                                  // This report has the month name but is in a different month group
                                  // Create a virtual report entry for this month
                                  // Calculate deadline (last Friday of the month)
                                  const lastDay = new Date(periodMonth.year, periodMonth.month + 1, 0);
                                  const lastFriday = new Date(lastDay);
                                  while (lastFriday.getDay() !== 5) {
                                    lastFriday.setDate(lastFriday.getDate() - 1);
                                  }
                                  monthReport = {
                                    deadline: lastFriday.getTime(),
                                    submitted: true,
                                    onTime: matchingReport.submittedAt ? 
                                      new Date(matchingReport.submittedAt).getTime() <= lastFriday.getTime() : false,
                                    submittedDate: matchingReport.submittedAt
                                  };
                                } else {
                                  monthReport = reportGroup;
                                }
                                break;
                              }
                            }
                          }
                        }
                        
                        const isSubmitted = monthReport?.submitted || false;
                        const isOnTime = monthReport?.onTime || false;
                        
                        return (
                          <div key={index} className={`p-2 rounded-md text-center ${
                            isSubmitted 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            <div className="font-medium">{monthName}</div>
                            <div className="text-xs">
                              {isSubmitted ? '✓' : '✗'}
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                  
                  <div className="flex items-center w-full space-x-4">
                    <label className="block text-sm font-medium">Score:</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={useManualMonthlyReports ? 
                        (Object.values(manualMonthlyReports).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 100 : 
                        monthlyReportData.percentage}
                      readOnly
                      className="flex-1 accent-green-500 border-none"
                    />
                    <div className="w-20 flex items-center justify-center">
                      <span className="text-sm text-gray-500 font-semibold">
                        {useManualMonthlyReports ? 
                          ((Object.values(manualMonthlyReports).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 100).toFixed(0) : 
                          monthlyReportData.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="bg-gray-100 px-3 py-1 text-center rounded-md text-sm">
                      {useManualMonthlyReports ? 
                        ((Object.values(manualMonthlyReports).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 3).toFixed(1) : 
                        monthlyReportData.score.toFixed(1)}/3
                    </div>
                  </div>
                  <button
                    onClick={handleSaveMonthlyReportData}
                    disabled={!selectedMda}
                    className={`w-full mb-4 py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors ${
                      !selectedMda
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    💾 Save Monthly Report Data
                  </button>
                </div>

                {/* Deadline Compliance */}
                <div className="w-full md:w-1/2 flex flex-col items-center bg-gray-100/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center gap-2 w-full mb-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <h2 className="text-lg font-semibold">Timeliness in Submitting Report</h2>
                        <p className="text-sm text-gray-600">Assess timeliness of report submissions</p>
                      </div>
                      {isLoadingTimelinessData && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          🔄 Loading...
                        </span>
                      )}
                      {!isLoadingTimelinessData && savedTimelinessData && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          💾 Saved
                        </span>
                      )}
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      2 Points
                    </span>
                  </div>
                  
                  {/* Toggle between automatic and manual */}
                  <div className="flex gap-4 mb-3 w-full">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="timeliness-mode"
                        checked={!useManualTimeliness}
                        onChange={() => setUseManualTimeliness(false)}
                        className="mr-2"
                      />
                      Automatic
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="timeliness-mode"
                        checked={useManualTimeliness}
                        onChange={() => setUseManualTimeliness(true)}
                        className="mr-2"
                      />
                      Manual
                    </label>
                  </div>
                  
                  <div className="w-full bg-gray-50 p-4 rounded-md mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Timeliness Score:</span>
                      <span className="text-sm font-semibold">{deadlineData.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${deadlineData.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Deadline Compliance Grid */}
                  <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-4">
                    {getMonthsForPeriod(scoringPeriod).map((periodMonth, index) => {
                      const monthName = new Date(periodMonth.year, periodMonth.month, 1)
                        .toLocaleString('default', { month: 'short' });
                      const monthKey = `${periodMonth.year}-${periodMonth.month}`;
                      
                      if (useManualTimeliness) {
                        // Manual mode - show checkboxes
                        const isChecked = manualTimeliness[monthKey] || false;
                        return (
                          <div key={index} className="p-2 rounded-md text-center border">
                            <div className="font-medium mb-1">{monthName}</div>
                            <label className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => setManualTimeliness(prev => ({
                                  ...prev,
                                  [monthKey]: e.target.checked
                                }))}
                                className="mr-1"
                              />
                              <span className="text-xs">On Time</span>
                            </label>
                          </div>
                        );
                      } else {
                        // Automatic mode - show status from data
                        if (!realMonthlyReports) {
                          return (
                            <div key={index} className="p-2 rounded-md text-center bg-gray-100 text-gray-600">
                              <div className="font-medium">{monthName}</div>
                              <div className="text-xs">No data</div>
                            </div>
                          );
                        }
                        
                        // Helper function to check if report name contains month name
                        const reportNameContainsMonth = (reportName: string | undefined): boolean => {
                          if (!reportName) return false;
                          const nameLower = reportName.toLowerCase();
                          const monthNameLower = monthName.toLowerCase();
                          const monthNameShort = new Date(periodMonth.year, periodMonth.month, 1)
                            .toLocaleString('default', { month: 'short' }).toLowerCase();
                          return nameLower.includes(monthNameLower) || 
                                 nameLower.includes(monthNameShort);
                        };
                        
                        // Find report - first try by deadline date, then also check report names in the reports array
                        let monthReport = realMonthlyReports.find(report => {
                          const reportDate = new Date(report.deadline);
                          return reportDate.getMonth() === periodMonth.month && 
                                 reportDate.getFullYear() === periodMonth.year;
                        });
                        
                        // If no match by deadline or report not submitted, check if any report in any month has this month in its name
                        if (!monthReport || !monthReport.submitted) {
                          for (const reportGroup of realMonthlyReports) {
                            if (reportGroup.reports && Array.isArray(reportGroup.reports)) {
                              const matchingReport = reportGroup.reports.find((r: any) => 
                                reportNameContainsMonth(r.reportName)
                              );
                              if (matchingReport) {
                                // Found a report with this month in the name, check if it's for this month
                                const reportDate = new Date(reportGroup.deadline);
                                // If the report group's month matches our target month (based on name), use it
                                if (reportDate.getMonth() !== periodMonth.month || 
                                    reportDate.getFullYear() !== periodMonth.year) {
                                  // This report has the month name but is in a different month group
                                  // Create a virtual report entry for this month
                                  // Calculate deadline (last Friday of the month)
                                  const lastDay = new Date(periodMonth.year, periodMonth.month + 1, 0);
                                  const lastFriday = new Date(lastDay);
                                  while (lastFriday.getDay() !== 5) {
                                    lastFriday.setDate(lastFriday.getDate() - 1);
                                  }
                                  monthReport = {
                                    deadline: lastFriday.getTime(),
                                    submitted: true,
                                    onTime: matchingReport.submittedAt ? 
                                      new Date(matchingReport.submittedAt).getTime() <= lastFriday.getTime() : false,
                                    submittedDate: matchingReport.submittedAt
                                  };
                                } else {
                                  monthReport = reportGroup;
                                }
                                break;
                              }
                            }
                          }
                        }
                        
                        const isSubmitted = monthReport?.submitted || false;
                        const isOnTime = monthReport?.onTime || false;
                        
                        return (
                          <div key={index} className={`p-2 rounded-md text-center ${
                            isSubmitted 
                              ? isOnTime 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            <div className="font-medium">{monthName}</div>
                            <div className="text-xs">
                              {isSubmitted 
                                ? isOnTime 
                                  ? 'On Time' 
                                  : 'Late'
                                : 'Not Submitted'
                              }
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                  
                  <div className="flex items-center w-full space-x-4 mb-3">
                    <label className="block text-sm font-medium">Score:</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={useManualTimeliness ? 
                        (Object.values(manualTimeliness).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 100 : 
                        deadlineData.percentage}
                      readOnly
                      className="flex-1 accent-blue-500 border-none"
                    />
                    <div className="w-20 flex items-center justify-center">
                      <span className="text-sm text-gray-500 font-semibold">
                        {useManualTimeliness ? 
                          ((Object.values(manualTimeliness).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 100).toFixed(0) : 
                          deadlineData.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="bg-gray-100 px-3 py-1 text-center rounded-md text-sm">
                      {useManualTimeliness ? 
                        ((Object.values(manualTimeliness).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 2).toFixed(1) : 
                        deadlineData.score.toFixed(1)}/2
                    </div>
                  </div>

                  <button
                    onClick={handleSaveTimelinessData}
                    disabled={!selectedMda}
                    className={`w-full py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors ${
                      !selectedMda
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    💾 Save Timeliness Data
                  </button>
                </div>
              </div>

              {/* Final Score Button */}
              <div className="w-full flex justify-center mt-8">
                <button
                  onClick={() => setShowFinalScore(true)}
                  disabled={!selectedMda || mdaScoringStatus?.hasScore}
                  className={`font-bold py-4 px-8 rounded-lg text-lg shadow-lg transition-all duration-300 transform ${
                    !selectedMda || mdaScoringStatus?.hasScore
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-xl hover:scale-105'
                  }`}
                >
                  {!selectedMda 
                    ? 'Select an MDA First'
                    : mdaScoringStatus?.hasScore 
                    ? 'MDA Already Scored for This Period'
                    : 'Calculate Final Score'
                  }
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Final Score Modal */}
      {showFinalScore && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-screen overflow-y-auto bg-white rounded-lg shadow-xl">
            <button
              onClick={() => setShowFinalScore(false)}
              className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
            >
              &times;
            </button>
            
            <div className="p-6">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">MDA Scoring Results</h1>
                <p className="text-gray-600">{selectedMda} - {scoringPeriod}</p>
              </div>
              
              {/* Score Display */}
              <div className="flex justify-center mb-8">
                <div className="w-48 h-48 bg-blue-100 rounded-full flex items-center justify-center border-8 border-blue-200">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-800">
                      {finalScoreData.totalPercentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Score Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Score Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div>Service Level Agreement: {finalScoreData.scores.serviceLevelAgreement.toFixed(1)}/30</div>
                    <div>Mystery Shopping: {finalScoreData.scores.mysteryShopping.toFixed(1)}/20</div>
                    <div>Controversial: {finalScoreData.scores.controversial.toFixed(1)}/5</div>
                    <div>Innovation: {finalScoreData.scores.innovation.toFixed(1)}/5</div>
                    <div>Stakeholder Engagement: {finalScoreData.scores.stakeholderEngagement.toFixed(1)}/10</div>
                    <div>Transparency: {finalScoreData.scores.transparency.toFixed(1)}/10</div>
                    <div className={skipReportGov ? "text-gray-500 line-through" : ""}>
                      Report Gov Resolution: {finalScoreData.scores.reportGovernanceResolution.toFixed(1)}/15
                      {skipReportGov && " (Skipped)"}
                    </div>
                    <div>Monthly Report Submission: {finalScoreData.scores.monthlyReportSubmission.toFixed(1)}/3</div>
                    <div>Timeliness in Submitting: {finalScoreData.scores.timelinessInSubmitting.toFixed(1)}/2</div>
                  </div>
                  
                  {(skipReportGov || skipTransparency) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-blue-600">
                        ⚠️ Optional metrics skipped - calculated out of {finalScoreData.maxPossiblePoints} points instead of 100
                      </p>
                    </div>
                  )}
                  
                  {/* Show averaging info if past data exists */}
                  {pastScoringData && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-blue-600">
                        ⚡ Scores include 30% weight from {pastScoringData.pastScores} previous periods
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Performance Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div>Total Score: {finalScoreData.totalScore.toFixed(1)}/{finalScoreData.maxPossiblePoints || 100}</div>
                    <div>Percentage: {finalScoreData.totalPercentage.toFixed(1)}%</div>
                    <div>Grade: {finalScoreData.totalPercentage >= 90 ? 'A' : 
                      finalScoreData.totalPercentage >= 80 ? 'B' : 
                      finalScoreData.totalPercentage >= 70 ? 'C' : 
                      finalScoreData.totalPercentage >= 60 ? 'D' : 'F'}</div>
                    <div>Status: {finalScoreData.totalPercentage >= 70 ? 'Compliant' : 'Non-Compliant'}</div>
                    {skipReportGov && (
                      <div className="text-xs text-blue-600">
                        📊 Adjusted calculation: {finalScoreData.maxPossiblePoints} points maximum
                      </div>
                    )}
                  </div>
                  
                  {/* Show base vs averaged comparison */}
                  {pastScoringData && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        Base Score: {finalScoreData.baseScores ? 
                          Object.values(finalScoreData.baseScores).reduce((sum, score) => sum + score, 0).toFixed(1) : 
                          finalScoreData.totalScore.toFixed(1)}/{finalScoreData.maxPossiblePoints || 100}
                      </p>
                      <p className="text-xs text-blue-600">
                        With Averaging: {finalScoreData.totalScore.toFixed(1)}/{finalScoreData.maxPossiblePoints || 100}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes and Recommendations */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    rows={3}
                    placeholder="Add any notes about this scoring..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Recommendations</label>
                  <textarea
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    rows={3}
                    placeholder="Add recommendations for improvement..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleSaveScore}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
                >
                  Save Score
                </button>
                <button
                  onClick={() => setShowFinalScore(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showModel && (
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-40 flex items-center justify-center px-4">
          <div className="relative w-full max-w-6xl max-h-screen overflow-y-auto bg-white p-6 rounded-lg shadow-xl">
            <button
              onClick={() => setShowModel(false)}
              className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
            >
              &times;
            </button>
            <ResultTable
              results={results}
              overallPercentage={overallPercentage}
            />
          </div>
        </div>
      )}

      {/* Monthly SLA Modal */}
      {showSlaModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-6xl max-h-screen overflow-y-auto bg-white rounded-lg shadow-xl">
            <button
              onClick={() => setShowSlaModal(false)}
              className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
            >
              &times;
            </button>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Monthly SLA Scoring</h1>
                <p className="text-gray-600">{scoringPeriod} - 5 points per month</p>
              </div>
              
              {/* Monthly SLA Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {getMonthsForPeriod(scoringPeriod).map((periodMonth, index) => {
                  const monthName = new Date(periodMonth.year, periodMonth.month, 1)
                    .toLocaleString('default', { month: 'long' });
                  const monthKey = `${periodMonth.year}-${periodMonth.month}`;
                  const monthData = monthlySlaData[monthKey] || {
                    method: 'file' as 'file' | 'rating',
                    file: null,
                    rating: 0,
                    score: 0,
                    results: [],
                    overallPercentage: null
                  };
                  
                  return (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-lg">{monthName}</h3>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          5 Points
                        </span>
                      </div>
                      
                      {/* Method Selection - Hide during processing */}
                      {!processingMonthlyFiles[monthKey] && (
                        <div className="flex gap-2 mb-3">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`sla-method-${monthKey}`}
                              value="file"
                              checked={monthData.method === 'file'}
                              onChange={(e) => {
                                setMonthlySlaData(prev => ({
                                  ...prev,
                                  [monthKey]: {
                                    ...prev[monthKey],
                                    method: 'file' as 'file' | 'rating',
                                    rating: 0
                                  }
                                }));
                              }}
                              className="mr-1"
                            />
                            File
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`sla-method-${monthKey}`}
                              value="rating"
                              checked={monthData.method === 'rating'}
                              onChange={(e) => {
                                setMonthlySlaData(prev => ({
                                  ...prev,
                                  [monthKey]: {
                                    ...prev[monthKey],
                                    method: 'rating' as 'file' | 'rating',
                                    file: null,
                                    results: [],
                                    overallPercentage: null
                                  }
                                }));
                              }}
                              className="mr-1"
                            />
                            Rating
                          </label>
                        </div>
                      )}
                      
                      {monthData.method === 'file' ? (
                        <div className="space-y-2">
                          <input
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setProcessingMonthlyFiles(prev => ({
                                  ...prev,
                                  [monthKey]: true
                                }));
                                // Process file similar to main SLA
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                  try {
                                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                                    const workbook = XLSX.read(data, { type: 'array' });
                                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                                    
                                    if (jsonData.length === 0) {
                                      toast.error("No data found in the Excel file");
                                      setProcessingMonthlyFiles(prev => ({
                                        ...prev,
                                        [monthKey]: false
                                      }));
                                      return;
                                    }
                                    
                                    const headers = Object.keys(jsonData[0] as Record<string, any>);
                                    
                                    // Use AI helper for header matching
                                    const headerResult = await matchHeaders({
                                      headers: headers,
                                      data: jsonData
                                    });
                                    
                                    if (!headerResult.success) {
                                      toast.warning("⚠️ AI header matching failed for this file");
                                    }
                                    
                                    // Process data using AI helper
                                    const processResult = await processSlaData({
                                      data: jsonData,
                                      headerMapping: headerResult.headerMapping as {
                                        DATE_OF_SUBMISSION: string | null;
                                        DATE_OF_COMPLETION: string | null;
                                        EXPECTED_TIMELINE: string | null;
                                      }
                                    });
                                    
                                    if (processResult.success) {
                                      setMonthlySlaData(prev => ({
                                        ...prev,
                                        [monthKey]: {
                                          method: 'file' as 'file' | 'rating',
                                          file: file,
                                          rating: 0,
                                          overallPercentage: processResult.overallPercentage,
                                          results: processResult.processedData,
                                          score: processResult.overallPercentage ? (processResult.overallPercentage / 100) * 5 : 0
                                        }
                                      }));
                                      toast.success(`✅ ${monthName} file processed successfully`);
                                    } else {
                                      toast.error(`Failed to process ${monthName} file: ${processResult.error}`);
                                    }
                                    setProcessingMonthlyFiles(prev => ({
                                      ...prev,
                                      [monthKey]: false
                                    }));
                                  } catch (error) {
                                    console.error("File processing error:", error);
                                    toast.error(`Failed to process ${monthName} file: ${(error as Error).message}`);
                                    setProcessingMonthlyFiles(prev => ({
                                      ...prev,
                                      [monthKey]: false
                                    }));
                                  }
                                };
                                reader.readAsArrayBuffer(file);
                              }
                            }}
                            accept=".xlsx, .xls"
                            className="w-full text-sm"
                          />
                          <div className="text-xs text-gray-500">
                            Excel files only
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                            <Select
                              value={monthData.rating || 0}
                              onChange={(e) => {
                              const rating = Number(e.target.value);
                              setMonthlySlaData(prev => ({
                                ...prev,
                                [monthKey]: {
                                  ...prev[monthKey],
                                  rating: rating,
                                  score: (rating / 10) * 5
                                }
                              }));
                            }}
                            className="w-full"
                          >
                            {[...Array(11)].map((_, i) => (
                              <MenuItem key={i} value={i}>{i}</MenuItem>
                            ))}
                          </Select>
                        </div>
                      )}
                      
                      {/* Score Display */}
                      <div className="mt-3 p-2 bg-gray-100 rounded text-center">
                        {processingMonthlyFiles[monthKey] ? (
                          <div className="flex flex-col items-center space-y-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <div className="text-xs text-gray-600">Processing file with AI...</div>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm font-medium">
                              Score: {monthData.method === 'file' 
                                ? (monthData.overallPercentage !== null ? `${monthData.overallPercentage.toFixed(1)}%` : 'N/A')
                                : `${((monthData.rating / 10) * 5).toFixed(1)}/5`
                              }
                            </div>
                            {monthData.method === 'file' && monthData.results.length > 0 && (
                              <div className="text-xs text-gray-600 mt-1">
                                {monthData.results.length} rows processed
                              </div>
                            )}
                            {monthData.method === 'file' && monthData.results.length > 0 && (
                              <button 
                                onClick={() => {
                                  setResults(monthData.results);
                                  setOverallPercentage(monthData.overallPercentage);
                                  setShowModel(true);
                                }} 
                                className="mt-2 bg-green-500 px-2 py-1 rounded text-white hover:bg-green-600 transition-colors duration-300 text-xs"
                              >
                                View Results
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Overall Score Summary */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-800 mb-2">Overall SLA Score Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Score:</span>
                    <div className="text-lg font-bold text-blue-600">
                      {calculateMonthlySlaScore().totalScore.toFixed(1)}/30
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Months Completed:</span>
                    <div className="text-lg font-bold text-blue-600">
                      {calculateMonthlySlaScore().monthsWithData}/{calculateMonthlySlaScore().totalMonths}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Percentage:</span>
                    <div className="text-lg font-bold text-blue-600">
                      {calculateMonthlySlaScore().percentage.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <div className={`text-lg font-bold ${
                      calculateMonthlySlaScore().percentage >= 80 ? 'text-green-600' : 
                      calculateMonthlySlaScore().percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {calculateMonthlySlaScore().percentage >= 80 ? 'Excellent' : 
                       calculateMonthlySlaScore().percentage >= 60 ? 'Good' : 'Needs Improvement'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowSlaModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowSlaModal(false);
                    toast.success("Monthly SLA data saved successfully!");
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg"
                >
                  Save Monthly Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mystery Shopping Modal */}
      {showMysteryModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-screen overflow-y-auto bg-white rounded-lg shadow-xl">
            <button
              onClick={() => setShowMysteryModal(false)}
              className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
            >
              &times;
            </button>
            
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-center">Mystery Shopping Assessment</h2>
              
              {/* Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Assessment Type:
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mysteryType"
                      value="hasReportGov"
                      checked={mysteryType === 'hasReportGov'}
                      onChange={(e) => handleMysteryTypeChange('hasReportGov')}
                      className="mr-2"
                    />
                    <span className="text-sm">ReportGov</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mysteryType"
                      value="noReportGov"
                      checked={mysteryType === 'noReportGov'}
                      onChange={(e) => handleMysteryTypeChange('noReportGov')}
                      className="mr-2"
                    />
                    <span className="text-sm">No ReportGov</span>
                  </label>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-6">
                {(mysteryType === 'hasReportGov' ? hasReportGovQuestions : noReportGovQuestions).map((question, index) => (
                  <div key={question.key} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">
                      {index + 1}. {question.label}
                    </h3>
                    <div className={`grid gap-2 ${question.type === 'rating' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2'}`}>
                      {(question.type === 'rating' ? ratingOptions : yesNoOptions).map((option) => (
                        <label key={option.value} className="flex items-center p-2 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name={question.key}
                            value={option.value}
                            checked={mysteryRatings[question.key] === option.value}
                            onChange={(e) => handleMysteryRatingChange(question.key, parseInt(e.target.value))}
                            className="mr-2"
                          />
                          <span className="text-sm">
                            {question.type === 'rating' ? `${option.value} - ${option.label}` : option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Score Display */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Current Score</h3>
                  <div className="text-3xl font-bold text-blue-600">
                    {calculateMysteryScore().toFixed(1)}/20
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    Average: {((calculateMysteryScore() / 20) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => setShowMysteryModal(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    setMysteryRate(calculateMysteryScore());
                    setShowMysteryModal(false);
                    await handleSaveMysteryShoppingData();
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg"
                >
                  Save Assessment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mystery Shopping Ranking Modal */}
      {showMysteryRanking && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-screen overflow-y-auto bg-white rounded-lg shadow-xl">
            <button
              onClick={() => setShowMysteryRanking(false)}
              className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
            >
              &times;
            </button>
            
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-center">Mystery Shopping Rankings</h2>
              <p className="text-center text-gray-600 mb-6">Year {scoringPeriod.match(/\d{4}/)?.[0] || currentYear} - Averaged across both halves</p>
              
              {mysteryRankings && Array.isArray(mysteryRankings) && mysteryRankings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MDA Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(mysteryRankings || []).map((item: any, index: number) => (
                        <tr key={item.mdaName} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.mdaName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="font-semibold">{item.totalScore.toFixed(1)}/20</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`font-semibold ${
                              item.percentage >= 90 ? 'text-green-600' :
                              item.percentage >= 80 ? 'text-blue-600' :
                              item.percentage >= 70 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {item.percentage.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.mysteryType === 'hasReportGov' ? 'ReportGov' : 'No ReportGov'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No Mystery Shopping rankings available for this period.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SLA Ranking Modal */}
      {showSLARanking && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl max-h-screen overflow-y-auto bg-white rounded-lg shadow-xl">
            <button
              onClick={() => setShowSLARanking(false)}
              className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
            >
              &times;
            </button>
            
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-center">SLA Rankings</h2>
              <p className="text-center text-gray-600 mb-6">Year {scoringPeriod.match(/\d{4}/)?.[0] || currentYear} - Averaged across both halves</p>
              
              {slaRankings && Array.isArray(slaRankings) && slaRankings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MDA Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Months Completed</th>
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
                            <span className={`font-semibold ${
                              item.percentage >= 90 ? 'text-green-600' :
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
              <h2 className="text-2xl font-bold mb-4 text-center">Report Gov Resolution Rankings</h2>
              <p className="text-center text-gray-600 mb-6">Year {scoringPeriod.match(/\d{4}/)?.[0] || currentYear} - Averaged across both halves</p>
              
              {reportGovRankings && Array.isArray(reportGovRankings) && reportGovRankings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MDA Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resolution Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Response Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Resolution Time</th>
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
                            <span className={`font-semibold ${
                              item.score >= 13.5 ? 'text-green-600' :
                              item.score >= 12 ? 'text-blue-600' :
                              item.score >= 10.5 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {item.score.toFixed(1)}/15
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.resolutionRate.toFixed(1)}% ({item.resolvedTickets}/{item.totalTickets})
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.averageResponseTime.toFixed(1)}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.averageResolutionTime.toFixed(1)}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No Report Gov Resolution rankings available for this period.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
