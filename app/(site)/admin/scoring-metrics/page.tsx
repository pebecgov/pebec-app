"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useUserRole } from "@/lib/useUserRole";
import { useRouter } from "next/navigation";
import { mdasList } from "@/components/mdaList";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import * as XLSX from 'xlsx';
import { toast } from "sonner";
import ScoringMetricsDashboard from "@/components/Admin/ScoringMetricsDashboard";

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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMda, setSelectedMda] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [overallPercentage, setOverallPercentage] = useState<number | null>(null);
  const [showModel, setShowModel] = useState(false);
  const [showSlaModal, setShowSlaModal] = useState(false);
  const [mysteryRate, setMysteryRate] = useState(0);
  const [collaborationRate, setCollaborationRate] = useState(0);
  const [stakeholderRate, setStakeholderRate] = useState(0);
  const [slaRate, setSlaRate] = useState(0);
  const [slaMethod, setSlaMethod] = useState<'file' | 'rating'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Monthly SLA data
  const [monthlySlaData, setMonthlySlaData] = useState<{[key: string]: {
    method: 'file' | 'rating';
    file: File | null;
    rating: number;
    score: number;
    results: any[];
    overallPercentage: number | null;
  }}>({});
  const [checkboxItems, setCheckboxItems] = useState({
    activeWebsite: false,
    activeUsers: false,
    reportGovLink: false,
  });
  const [reportgovRate, setReportgovRate] = useState(0);
  const [manualReportGovRate, setManualReportGovRate] = useState(0);
  const [useManualReportGov, setUseManualReportGov] = useState(false);
  const [skipReportGov, setSkipReportGov] = useState(false);
  
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

  // Helper function to sanitize MDA names (same as backend)
  const sanitizeMdaName = (mdaName: string): string => {
    return mdaName
      .replace(/[–—]/g, '-') // Replace em dash and en dash with regular dash
      .replace(/[^\w\s-]/g, '') // Remove all non-word characters except spaces and dashes
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/-+/g, '_') // Replace multiple dashes with underscores
      .toLowerCase();
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
  }, [scoringPeriod]);

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

    // Scoring logic: Resolution rate (9 points), Response time (3 points), Resolution time (3 points)
    let resolutionRateScore = (resolutionRate / 100) * 9;
    let responseTimeScore = 3;
    if (averageResponseTime > 24) {
      const penalty = (averageResponseTime - 24) * 0.06;
      responseTimeScore = Math.max(0, 3 - penalty);
    }
    let resolutionTimeScore = 3;
    if (averageResolutionTime > 72) {
      const penalty = (averageResolutionTime - 72) * 0.03;
      resolutionTimeScore = Math.max(0, 3 - penalty);
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
    
    // Scoring logic: Resolution rate (9 points), Response time (3 points), Resolution time (3 points)
    let resolutionRateScore = (resolutionRate / 100) * 9;
    let responseTimeScore = 3;
    if (manualAverageResponseTime > 24) {
      const penalty = (manualAverageResponseTime - 24) * 0.06;
      responseTimeScore = Math.max(0, 3 - penalty);
    }
    let resolutionTimeScore = 3;
    if (manualAverageResolutionTime > 72) {
      const penalty = (manualAverageResolutionTime - 72) * 0.03;
      resolutionTimeScore = Math.max(0, 3 - penalty);
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
    
    const baseScores = {
      serviceLevelAgreement: monthlySlaScore.totalScore,
      mysteryShopping: (mysteryRate / 10) * 20,
      interMdaCollaboration: (collaborationRate / 10) * 15,
      stakeholderEngagement: (stakeholderRate / 10) * 10,
      reportGovernance: Object.values(checkboxItems).filter(Boolean).length / 3 * 5,
      reportGovernanceResolution: reportGovScore,
      monthlyReportSubmission: monthlyReportScore,
      timelinessInSubmitting: timelinessScore
    };

    // Apply averaging with past data if available
    const scores = {
      serviceLevelAgreement: calculateAverageWithPastData(baseScores.serviceLevelAgreement, 'serviceLevelAgreement'),
      mysteryShopping: calculateAverageWithPastData(baseScores.mysteryShopping, 'mysteryShopping'),
      interMdaCollaboration: calculateAverageWithPastData(baseScores.interMdaCollaboration, 'interMdaCollaboration'),
      stakeholderEngagement: calculateAverageWithPastData(baseScores.stakeholderEngagement, 'stakeholderEngagement'),
      reportGovernance: calculateAverageWithPastData(baseScores.reportGovernance, 'reportGovernance'),
      reportGovernanceResolution: skipReportGov ? 0 : calculateAverageWithPastData(baseScores.reportGovernanceResolution, 'reportGovernanceResolution'),
      monthlyReportSubmission: calculateAverageWithPastData(baseScores.monthlyReportSubmission, 'monthlyReportSubmission'),
      timelinessInSubmitting: calculateAverageWithPastData(baseScores.timelinessInSubmitting, 'timelinessInSubmitting')
    };

    // Calculate total possible points (excluding skipped metrics)
    const maxPossiblePoints = skipReportGov ? 85 : 100; // 100 - 15 (Report Gov Resolution points)
    
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const totalPercentage = (totalScore / maxPossiblePoints) * 100;

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
        interMdaCollaborationScore: finalScoreData.scores.interMdaCollaboration,
        stakeholderEngagementScore: finalScoreData.scores.stakeholderEngagement,
        reportGovernanceScore: finalScoreData.scores.reportGovernance,
        reportGovernanceResolutionScore: finalScoreData.scores.reportGovernanceResolution,
        monthlyReportSubmissionScore: finalScoreData.scores.monthlyReportSubmission,
        timelinessInSubmittingScore: finalScoreData.scores.timelinessInSubmitting,
        totalTickets: mda?.totalTickets || 0,
        resolvedTickets: mda?.resolvedTickets || 0,
        averageResponseTime: mda?.averageResponseTime || 0,
        averageResolutionTime: mda?.averageResolutionTime || 0,
        resolutionRate: mda?.resolutionRate || 0,
        hasActiveWebsite: checkboxItems.activeWebsite,
        hasReportGovLink: checkboxItems.reportGovLink,
        hasActiveUsers: checkboxItems.activeUsers,
        notes: notes,
        recommendations: recommendations,
        maxPossiblePoints: finalScoreData.maxPossiblePoints || 100,
        scoringMethod: skipReportGov ? "skip_reportgov" : "standard"
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
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Dashboard
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
        {activeTab === 'dashboard' ? (
          <div className="w-full space-y-6">
            <ScoringMetricsDashboard />
            
            {/* MDA Leaderboard */}
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
                    <h2 className="text-lg font-semibold">Service Level Agreement</h2>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      30 Points
                    </span>
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
                        <button 
                          onClick={() => setShowSlaModal(true)} 
                          className="bg-blue-500 px-4 py-2 rounded-md text-white hover:bg-blue-600 transition-colors duration-300 text-sm font-medium"
                        >
                          Configure Monthly SLA
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mystery Shopping */}
                <div className="bg-gray-100/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Mystery Shopping</h2>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      20 Points
                    </span>
                  </div>
                  
                  <Select
                    value={mysteryRate || 0}
                    onChange={(e) => setMysteryRate(Number(e.target.value))}
                    className="w-full mb-3"
                  >
                    {[...Array(11)].map((_, i) => (
                      <MenuItem key={i} value={i}>{i}</MenuItem>
                    ))}
                  </Select>

                  <div className="text-center">
                    Score: {((mysteryRate / 10) * 20).toFixed(1)}/20
                  </div>
                </div>

                {/* Inter MDA Collaboration */}
                <div className="bg-gray-100/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Inter MDA Collaboration</h2>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      15 Points
                    </span>
                  </div>
                  
                  <Select
                    value={collaborationRate || 0}
                    onChange={(e) => setCollaborationRate(Number(e.target.value))}
                    className="w-full mb-3"
                  >
                    {[...Array(11)].map((_, i) => (
                      <MenuItem key={i} value={i}>{i}</MenuItem>
                    ))}
                  </Select>

                  <div className="text-center">
                    Score: {((collaborationRate / 10) * 15).toFixed(1)}/15
                  </div>
                </div>

                {/* Stakeholder Engagement */}
                <div className="bg-gray-100/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Stakeholder Engagement</h2>
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

                  <div className="text-center">
                    Score: {((stakeholderRate / 10) * 10).toFixed(1)}/10
                  </div>
                </div>

                {/* Report Governance */}
                <div className="bg-gray-100/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Report Governance</h2>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      5 Points
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {Object.entries(checkboxItems).map(([key, value]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setCheckboxItems(prev => ({
                            ...prev,
                            [key]: e.target.checked
                          }))}
                          className="mr-2"
                        />
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </label>
                    ))}
                  </div>

                  <div className="text-center mt-3">
                    Score: {(Object.values(checkboxItems).filter(Boolean).length / 3 * 5).toFixed(1)}/5
                  </div>
                </div>

                {/* Report Governance Resolution */}
                <div className="bg-gray-100/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Report Gov Resolution</h2>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      15 Points
                    </span>
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
                      </div>

                      <button
                        onClick={() => setReportgovRate(ticketResolutionData.score)}
                        className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
                      >
                        Calculate Score
                      </button>
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
                            onChange={(e) => setManualResolvedTickets(Number(e.target.value))}
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
                        <p>Scoring: Resolution Rate (9pts) + Response Time (3pts) + Resolution Time (3pts)</p>
                      </div>

                      <button
                        onClick={() => setManualReportGovRate(calculateManualReportGovScore())}
                        className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
                      >
                        Calculate Manual Score
                      </button>
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
                    <div>
                      <h2 className="text-lg font-semibold">Monthly Report Submission</h2>
                      <p className="text-sm text-gray-600">Track submission of monthly reports</p>
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
                        
                        const monthReport = realMonthlyReports.find(report => {
                          const reportDate = new Date(report.deadline);
                          return reportDate.getMonth() === periodMonth.month && 
                                 reportDate.getFullYear() === periodMonth.year;
                        });
                        
                        const isSubmitted = monthReport?.submitted || false;
                        const isOnTime = monthReport?.onTime || false;
                        
                        return (
                          <div key={index} className={`p-2 rounded-md text-center ${
                            isSubmitted 
                              ? isOnTime 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
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
                </div>

                {/* Deadline Compliance */}
                <div className="w-full md:w-1/2 flex flex-col items-center bg-gray-100/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center gap-2 w-full mb-4">
                    <div>
                      <h2 className="text-lg font-semibold">Timeliness in Submitting Report</h2>
                      <p className="text-sm text-gray-600">Assess timeliness of report submissions</p>
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
                        
                        const monthReport = realMonthlyReports.find(report => {
                          const reportDate = new Date(report.deadline);
                          return reportDate.getMonth() === periodMonth.month && 
                                 reportDate.getFullYear() === periodMonth.year;
                        });
                        
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
                  
                  <div className="flex items-center w-full space-x-4">
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
                    <div>Inter MDA Collaboration: {finalScoreData.scores.interMdaCollaboration.toFixed(1)}/15</div>
                    <div>Stakeholder Engagement: {finalScoreData.scores.stakeholderEngagement.toFixed(1)}/10</div>
                    <div>Report Governance: {finalScoreData.scores.reportGovernance.toFixed(1)}/5</div>
                    <div className={skipReportGov ? "text-gray-500 line-through" : ""}>
                      Report Gov Resolution: {finalScoreData.scores.reportGovernanceResolution.toFixed(1)}/15
                      {skipReportGov && " (Skipped)"}
                    </div>
                    <div>Monthly Report Submission: {finalScoreData.scores.monthlyReportSubmission.toFixed(1)}/3</div>
                    <div>Timeliness in Submitting: {finalScoreData.scores.timelinessInSubmitting.toFixed(1)}/2</div>
                  </div>
                  
                  {skipReportGov && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-blue-600">
                        ⚠️ Report Gov Resolution skipped - calculated out of 85 points instead of 100
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
    </div>
  );
}
