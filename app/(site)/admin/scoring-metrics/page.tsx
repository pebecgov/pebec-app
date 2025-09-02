"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
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
  const [mysteryRate, setMysteryRate] = useState(0);
  const [collaborationRate, setCollaborationRate] = useState(0);
  const [stakeholderRate, setStakeholderRate] = useState(0);
  const [slaRate, setSlaRate] = useState(0);
  const [slaMethod, setSlaMethod] = useState('file');
  const [checkboxItems, setCheckboxItems] = useState({
    activeWebsite: false,
    activeUsers: false,
    reportGovLink: false,
  });
  const [reportgovRate, setReportgovRate] = useState(0);
  const [showFinalScore, setShowFinalScore] = useState(false);
  const [scoringPeriod, setScoringPeriod] = useState(`1st Half ${new Date().getFullYear()}`);
  const currentYear = new Date().getFullYear();
  const [notes, setNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convex queries and mutations
  const mdasWithScores = useQuery(api.mda_scoring.getMDAsWithScores);
  const scoringAnalytics = useQuery(api.mda_scoring.getScoringAnalytics);
  const calculateScore = useMutation(api.mda_scoring.calculateAndSaveMDAScore);
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
    if (!selectedMda || !mdasWithScores) return {
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

    const mda = mdasWithScores.find(m => m.name === selectedMda);
    if (!mda) return {
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

    // Get the months for the selected scoring period
    const periodMonths = getMonthsForPeriod(scoringPeriod);
    
    // Use period-specific ticket data if available, otherwise fall back to overall data
    const totalTickets = periodTicketData?.totalTickets || mda.totalTickets || 0;
    const resolvedTickets = periodTicketData?.resolvedTickets || mda.resolvedTickets || 0;
    const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;
    const averageResponseTime = periodTicketData?.averageResponseTime || mda.averageResponseTime || 0;
    const averageResolutionTime = periodTicketData?.averageResolutionTime || mda.averageResolutionTime || 0;

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
    
    if (period.includes("1st Half")) {
      return [
        { month: 0, year: currentYear },   // January
        { month: 1, year: currentYear },   // February
        { month: 2, year: currentYear },   // March
        { month: 3, year: currentYear },   // April
        { month: 4, year: currentYear },   // May
        { month: 5, year: currentYear }    // June
      ];
    } else if (period.includes("2nd Half")) {
      return [
        { month: 6, year: currentYear },   // July
        { month: 7, year: currentYear },   // August
        { month: 8, year: currentYear },   // September
        { month: 9, year: currentYear },   // October
        { month: 10, year: currentYear },  // November
        { month: 11, year: currentYear }   // December
      ];
    } else {
      // Default: From January to current month of current year
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const months: Array<{ month: number; year: number }> = [];
      for (let month = 0; month <= currentMonth; month++) {
        months.push({ month, year: currentYear });
      }
      return months;
    }
  };

  const ticketResolutionData = calculateTicketResolutionScore();

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
    const score = (finalPercentage / 100) * 2; // 2 points max
    
    return {
      percentage: finalPercentage,
      score: score,
      penalty: totalPenalty
    };
  };

  const monthlyReportData = calculateMonthlyReportScore();
  const deadlineData = calculateDeadlineScore();

  // Calculate total score
  const calculateTotalScore = () => {
    const baseScores = {
      serviceLevelAgreement: slaMethod === 'file' 
        ? (overallPercentage !== null ? (overallPercentage / 100) * 30 : 0)
        : (slaRate / 10) * 30,
      mysteryShopping: (mysteryRate / 10) * 20,
      interMdaCollaboration: (collaborationRate / 10) * 15,
      stakeholderEngagement: (stakeholderRate / 10) * 10,
      reportGovernance: Object.values(checkboxItems).filter(Boolean).length / 3 * 5,
      reportGovernanceResolution: reportgovRate,
      monthlyReportSubmission: monthlyReportData.score,
      timelinessInSubmitting: deadlineData.score
    };

    // Apply averaging with past data if available
    const scores = {
      serviceLevelAgreement: calculateAverageWithPastData(baseScores.serviceLevelAgreement, 'serviceLevelAgreement'),
      mysteryShopping: calculateAverageWithPastData(baseScores.mysteryShopping, 'mysteryShopping'),
      interMdaCollaboration: calculateAverageWithPastData(baseScores.interMdaCollaboration, 'interMdaCollaboration'),
      stakeholderEngagement: calculateAverageWithPastData(baseScores.stakeholderEngagement, 'stakeholderEngagement'),
      reportGovernance: calculateAverageWithPastData(baseScores.reportGovernance, 'reportGovernance'),
      reportGovernanceResolution: calculateAverageWithPastData(baseScores.reportGovernanceResolution, 'reportGovernanceResolution'),
      monthlyReportSubmission: calculateAverageWithPastData(baseScores.monthlyReportSubmission, 'monthlyReportSubmission'),
      timelinessInSubmitting: calculateAverageWithPastData(baseScores.timelinessInSubmitting, 'timelinessInSubmitting')
    };

    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const totalPercentage = (totalScore / 100) * 100;

    return { scores, totalScore, totalPercentage, baseScores };
  };

  const finalScoreData = calculateTotalScore();

  // Handle file upload for SLA scoring
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);

      // Process the data and calculate performance
      // This is a simplified version - you can enhance it based on your needs
      let totalPercentage = 0;
      let validRows = 0;

      const processed = jsonData.map((row: any) => {
        // Add your processing logic here
        const performancePercentage = Math.random() * 100; // Placeholder
        totalPercentage += performancePercentage;
        validRows++;
        
        return {
          ...row,
          'PERFORMANCE %': `${performancePercentage.toFixed(2)}%`
        };
      });

      const overall = validRows > 0 ? (totalPercentage / validRows) : null;
      setOverallPercentage(overall);
      setResults(processed);
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
      const mda = mdasWithScores?.find(m => m.name === selectedMda);
      if (!mda) {
        toast.error("MDA not found");
        return;
      }

      const result = await calculateScore({
        mdaId: mda._id,
        mdaName: mda.name,
        scoringPeriod: scoringPeriod,
        serviceLevelAgreementScore: finalScoreData.scores.serviceLevelAgreement,
        mysteryShoppingScore: finalScoreData.scores.mysteryShopping,
        interMdaCollaborationScore: finalScoreData.scores.interMdaCollaboration,
        stakeholderEngagementScore: finalScoreData.scores.stakeholderEngagement,
        reportGovernanceScore: finalScoreData.scores.reportGovernance,
        reportGovernanceResolutionScore: finalScoreData.scores.reportGovernanceResolution,
        monthlyReportSubmissionScore: finalScoreData.scores.monthlyReportSubmission,
        timelinessInSubmittingScore: finalScoreData.scores.timelinessInSubmitting,
        totalTickets: mda.totalTickets || 0,
        resolvedTickets: mda.resolvedTickets || 0,
        averageResponseTime: mda.averageResponseTime || 0,
        averageResolutionTime: mda.averageResolutionTime || 0,
        resolutionRate: mda.resolutionRate || 0,
        hasActiveWebsite: checkboxItems.activeWebsite,
        hasReportGovLink: checkboxItems.reportGovLink,
        hasActiveUsers: checkboxItems.activeUsers,
        notes: notes,
        recommendations: recommendations
      });

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
          <div className="w-full">
            <ScoringMetricsDashboard />
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
                    {mdasWithScores?.map((mda) => (
                      <MenuItem key={mda._id} value={mda.name}>
                        {mda.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
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
                     <p>Year: {currentYear}</p>
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
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="sla-method"
                          value="file"
                          checked={slaMethod === 'file'}
                          onChange={(e) => setSlaMethod(e.target.value)}
                          className="mr-2"
                        />
                        File Upload
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="sla-method"
                          value="rating"
                          checked={slaMethod === 'rating'}
                          onChange={(e) => setSlaMethod(e.target.value)}
                          className="mr-2"
                        />
                        Rating
                      </label>
                    </div>

                    {slaMethod === 'file' ? (
                      <div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept=".xlsx, .xls"
                          className="w-full"
                        />
                      </div>
                    ) : (
                      <Select
                        value={slaRate}
                        onChange={(e) => setSlaRate(Number(e.target.value))}
                        className="w-full"
                      >
                        {[...Array(11)].map((_, i) => (
                          <MenuItem key={i} value={i}>{i}</MenuItem>
                        ))}
                      </Select>
                    )}

                    <div className="text-center">
                      Score: {slaMethod === 'file' 
                        ? (overallPercentage !== null ? `${overallPercentage.toFixed(1)}%` : 'N/A')
                        : `${((slaRate / 10) * 30).toFixed(1)}/30`
                      }
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
                    value={mysteryRate}
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
                    value={collaborationRate}
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
                    value={stakeholderRate}
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
                  
                  <div className="text-sm mb-3">
                                                              <p className="text-xs text-blue-600 mb-2">
                       📅 Evaluating: {scoringPeriod.includes("1st Half") ? `Jan-Jun ${currentYear}` : 
                                     scoringPeriod.includes("2nd Half") ? `Jul-Dec ${currentYear}` : "All Periods"}
                     </p>
                     <p>Total Tickets: {ticketResolutionData.totalTickets}</p>
                     <p>Resolved: {ticketResolutionData.resolvedTickets}</p>
                     <p>Resolution Rate: {ticketResolutionData.resolutionRate.toFixed(1)}%</p>
                     <p className="text-xs text-gray-500">
                       Data Source: {periodTicketData ? 'Period-specific' : 'Overall MDA data'}
                     </p>
                     <p className="text-xs text-gray-500">
                       Period Data: {periodTicketData ? 
                         `${periodTicketData.totalTickets} tickets, ${periodTicketData.resolvedTickets} resolved` : 
                         'No period data available'
                       }
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

                  <div className="text-center mt-3">
                    Score: {reportgovRate.toFixed(1)}/15
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
                  {realMonthlyReports && (
                    <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-4">
                      {getMonthsForPeriod(scoringPeriod).map((periodMonth, index) => {
                        const monthName = new Date(periodMonth.year, periodMonth.month, 1)
                          .toLocaleString('default', { month: 'short' });
                        
                        // Find if there's a report for this month
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
                      })}
                    </div>
                  )}
                  
                  <div className="flex items-center w-full space-x-4">
                    <label className="block text-sm font-medium">Score:</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={monthlyReportData.percentage}
                      readOnly
                      className="flex-1 accent-green-500 border-none"
                    />
                    <div className="w-20 flex items-center justify-center">
                      <span className="text-sm text-gray-500 font-semibold">
                        {monthlyReportData.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="bg-gray-100 px-3 py-1 text-center rounded-md text-sm">
                      {monthlyReportData.score.toFixed(1)}/3
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
                  {realMonthlyReports && (
                    <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-4">
                      {getMonthsForPeriod(scoringPeriod).map((periodMonth, index) => {
                        const monthName = new Date(periodMonth.year, periodMonth.month, 1)
                          .toLocaleString('default', { month: 'short' });
                        
                        // Find if there's a report for this month
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
                      })}
                    </div>
                  )}
                  
                  <div className="flex items-center w-full space-x-4">
                    <label className="block text-sm font-medium">Score:</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={deadlineData.percentage}
                      readOnly
                      className="flex-1 accent-blue-500 border-none"
                    />
                    <div className="w-20 flex items-center justify-center">
                      <span className="text-sm text-gray-500 font-semibold">
                        {deadlineData.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="bg-gray-100 px-3 py-1 text-center rounded-md text-sm">
                      {deadlineData.score.toFixed(1)}/2
                    </div>
                  </div>
                </div>
              </div>

              {/* Final Score Button */}
              <div className="w-full flex justify-center mt-8">
                <button
                  onClick={() => setShowFinalScore(true)}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  Calculate Final Score
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
                    <div>Report Gov Resolution: {finalScoreData.scores.reportGovernanceResolution.toFixed(1)}/15</div>
                    <div>Monthly Report Submission: {finalScoreData.scores.monthlyReportSubmission.toFixed(1)}/3</div>
                    <div>Timeliness in Submitting: {finalScoreData.scores.timelinessInSubmitting.toFixed(1)}/2</div>
                  </div>
                  
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
                    <div>Total Score: {finalScoreData.totalScore.toFixed(1)}/100</div>
                    <div>Percentage: {finalScoreData.totalPercentage.toFixed(1)}%</div>
                    <div>Grade: {finalScoreData.totalPercentage >= 90 ? 'A' : 
                      finalScoreData.totalPercentage >= 80 ? 'B' : 
                      finalScoreData.totalPercentage >= 70 ? 'C' : 
                      finalScoreData.totalPercentage >= 60 ? 'D' : 'F'}</div>
                    <div>Status: {finalScoreData.totalPercentage >= 70 ? 'Compliant' : 'Non-Compliant'}</div>
                  </div>
                  
                  {/* Show base vs averaged comparison */}
                  {pastScoringData && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        Base Score: {finalScoreData.baseScores ? 
                          Object.values(finalScoreData.baseScores).reduce((sum, score) => sum + score, 0).toFixed(1) : 
                          finalScoreData.totalScore.toFixed(1)}/100
                      </p>
                      <p className="text-xs text-blue-600">
                        With Averaging: {finalScoreData.totalScore.toFixed(1)}/100
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
        <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center px-4">
          <div className="relative w-full max-w-6xl max-h-screen overflow-y-auto bg-white p-6 rounded-lg shadow-xl">
            <button
              onClick={() => setShowModel(false)}
              className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold"
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
    </div>
  );
}
