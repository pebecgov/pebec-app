"use client";

import { useState, useMemo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import StateScoringForm from "@/components/Admin/StateScoringForm";
import BulkImportStateScores from "@/components/Admin/BulkImportStateScores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useStateRankings } from "@/hooks/useStateRankings";
import { indicators } from "@/convex/config/indicators";
import { generateStateRankingPDF } from "@/lib/stateRankingPdfGenerator";
import AnalysisTab from "@/components/Admin/AnalysisTab";
import { generateStateIndicatorPDF, processStateScoresForIndicator } from "@/lib/stateIndicatorPdfGenerator";
import { toast } from "sonner";

// Grade calculation function
const indicatorMaxScores: Record<string, number> = Object.fromEntries(
  Object.entries(indicators).map(([indicatorKey, indicatorConfig]) => {
    const maxScoreForIndicator = Object.values(indicatorConfig.subIndicators).reduce((sum, subIndicator: any) => {
      const options = subIndicator.options as Array<{ score: number }>;
      const maxOptionScore = options.reduce((max, option) => Math.max(max, option.score), 0);
      return sum + maxOptionScore;
    }, 0);
    return [indicatorKey, maxScoreForIndicator];
  })
);

const overallMaxScore = Object.values(indicatorMaxScores).reduce((sum, value) => sum + value, 0);

const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
  "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna",
  "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
  "Federal Capital Territory",
];

const formatScore = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "0";
  }
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
};

const calculateGrade = (totalScore: number, maxPossibleScore: number = overallMaxScore): { grade: string; description: string } => {
  const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  
  if (percentage >= 85) return { grade: "A", description: "Excellent" };
  if (percentage >= 70) return { grade: "B", description: "Good" };
  if (percentage >= 55) return { grade: "C", description: "Satisfactory" };
  if (percentage >= 40) return { grade: "D", description: "Below Average" };
  return { grade: "F", description: "Poor" };
};

// Analytics calculation function
const calculateAnalytics = (allScores: any[]) => {
  if (!allScores || allScores.length === 0) {
    return {
      activeStates: 0,
      topPerformers: 0,
      midPerformers: 0,
      lowPerformers: 0,
      nationalAverage: 0,
      nationalAveragePercentage: 0,
      highestScoringState: null,
      lowestScoringState: null,
      lastUpdated: null,
      gradeDistribution: { topTier: 0, middleTier: 0, bottomTier: 0 },
      indicatorPerformance: {},
      totalPossiblePoints: overallMaxScore
    };
  }

  // Total possible points across all indicators
  const TOTAL_POSSIBLE_POINTS = overallMaxScore;

  // Group by state and calculate totals
  const stateTotals: Record<string, number> = {};
  const stateTimestamps: Record<string, number> = {};
  const indicatorTotals: Record<string, number> = {};
  const indicatorCounts: Record<string, number> = {};

  allScores.forEach(score => {
    // State totals
    if (!stateTotals[score.state]) {
      stateTotals[score.state] = 0;
    }
    stateTotals[score.state] += score.score;

    // Track latest timestamp per state
    if (!stateTimestamps[score.state] || score.createdAt > stateTimestamps[score.state]) {
      stateTimestamps[score.state] = score.createdAt;
    }

    // Indicator performance
    if (!indicatorTotals[score.indicator]) {
      indicatorTotals[score.indicator] = 0;
      indicatorCounts[score.indicator] = 0;
    }
    indicatorTotals[score.indicator] += score.score;
    indicatorCounts[score.indicator]++;
  });

  const states = Object.keys(stateTotals);
  const scores = Object.values(stateTotals);
  const nationalAverage = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const nationalAveragePercentage = (nationalAverage / TOTAL_POSSIBLE_POINTS) * 100;

  // Highest and lowest scoring states (sorted ranking)
  const sortedStates = states.sort((a, b) => stateTotals[b] - stateTotals[a]);
  const totalStates = sortedStates.length;
  const topTierLimit = Math.min(10, totalStates);
  const middleTierLimit = Math.min(22, totalStates);

  const topPerformers = topTierLimit;
  const midPerformers = Math.max(0, middleTierLimit - topTierLimit);
  const lowPerformers = Math.max(0, totalStates - middleTierLimit);
  const highestScoringState = sortedStates[0] ? {
    state: sortedStates[0],
    score: stateTotals[sortedStates[0]],
    percentage: (stateTotals[sortedStates[0]] / TOTAL_POSSIBLE_POINTS) * 100
  } : null;
  const lowestScoringState = sortedStates[sortedStates.length - 1] ? {
    state: sortedStates[sortedStates.length - 1],
    score: stateTotals[sortedStates[sortedStates.length - 1]],
    percentage: (stateTotals[sortedStates[sortedStates.length - 1]] / TOTAL_POSSIBLE_POINTS) * 100
  } : null;

  // Last updated
  const lastUpdated = Math.max(...Object.values(stateTimestamps));

  // Grade distribution (tier-based counts)
  const gradeDistribution = {
    topTier: topPerformers,
    middleTier: midPerformers,
    bottomTier: lowPerformers
  };

  // Indicator performance averages
  const indicatorPerformance: Record<string, number> = {};
  Object.keys(indicatorTotals).forEach(indicator => {
    indicatorPerformance[indicator] = indicatorTotals[indicator] / indicatorCounts[indicator];
  });

  return {
    activeStates: states.length,
    topPerformers,
    midPerformers,
    lowPerformers,
    nationalAverage,
    nationalAveragePercentage,
    highestScoringState,
    lowestScoringState,
    lastUpdated,
    gradeDistribution,
    indicatorPerformance,
    totalPossiblePoints: TOTAL_POSSIBLE_POINTS
  };
};

// Analytics Dashboard Component
const AnalyticsDashboard = () => {
  const allScores = useQuery(api.saveStateScore.getStateScores, {});
  
  const analytics = useMemo(() => {
    if (!allScores) return null;
    return calculateAnalytics(allScores);
  }, [allScores]);

  if (!analytics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="rounded-2xl shadow-sm">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const {
    activeStates,
    topPerformers,
    midPerformers,
    lowPerformers,
    nationalAverage,
    highestScoringState,
    lowestScoringState,
    lastUpdated,
    gradeDistribution,
    indicatorPerformance
  } = analytics;

  const gradePieData = [
    { key: 'topTier', name: 'Top Tier (1-10)', value: gradeDistribution.topTier, fill: '#10b981' },
    { key: 'middleTier', name: 'Middle Tier (11-22)', value: gradeDistribution.middleTier, fill: '#f59e0b' },
    { key: 'bottomTier', name: 'Bottom Tier (23+)', value: gradeDistribution.bottomTier, fill: '#ef4444' },
  ];

  return (
  <div className="py-3 bg-white">
  <div className="space-y-8">
    {/* Explanation Section */}
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">📊 Understanding the State Scoring System</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Ranking Logic:</strong> 
            <span className="ml-1">
              • All States ranked by their available score (fair comparison)
            </span>
          </p>
          <p><strong>Top Tier (Ranks 1-10):</strong> Highest performers leading national reforms</p>
          <p><strong>Middle Tier (Ranks 11-22):</strong> Solid momentum with room to climb</p>
          <p><strong>Bottom Tier (Ranks 23+):</strong> Priority states requiring additional support</p>
          <p><strong>Note:</strong> Tiers are rank-based to keep the focus on relative position each cycle.</p>
          <p><strong>Below Standards (Below 70%):</strong> States that need improvement to meet requirements</p>
          <p><strong>Scoring Methods:</strong> 
            <span className="ml-1">
              • <span className="font-semibold text-blue-600">{formatScore(overallMaxScore)}-Point Scale:</span> Standard scoring with all metrics included
              
             </span>
          </p>
        </div>
      </div>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="text-lg font-semibold text-gray-700 mb-2">Active States</div>
            <div className="text-3xl font-bold text-blue-600">{activeStates}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="text-lg font-semibold text-gray-700 mb-2">Top Performers</div>
            <div className="text-3xl font-bold text-green-600">{topPerformers}</div>
            <div className="text-sm text-gray-600">Top Tier (Ranks 1-10)</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-6">
            <div className="text-lg font-semibold text-gray-700 mb-2">National Average</div>
            <div className="text-3xl font-bold text-yellow-600">{analytics.nationalAveragePercentage.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">{nationalAverage.toFixed(1)}/{formatScore(overallMaxScore)} points</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="text-lg font-semibold text-gray-700 mb-2">Last Updated</div>
            <div className="text-sm font-medium text-purple-600">
              {lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-700">Performance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { name: 'Top Tier (1-10)', value: topPerformers, fill: '#10b981' },
                { name: 'Middle Tier (11-22)', value: midPerformers, fill: '#f59e0b' },
                { name: 'Bottom Tier (23+)', value: lowPerformers, fill: '#ef4444' }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-700">Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={gradePieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {gradePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top and Bottom Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {highestScoringState && (
          <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700">🏆 Top Performer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{highestScoringState.state}</div>
              <div className="text-lg text-gray-600">Score: {highestScoringState.score.toFixed(1)}</div>
            </CardContent>
          </Card>
        )}

        {lowestScoringState && (
          <Card className="rounded-2xl shadow-sm bg-gradient-to-br from-orange-50 to-orange-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-700">📈 Needs Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{lowestScoringState.state}</div>
              <div className="text-lg text-gray-600">Score: {lowestScoringState.score.toFixed(1)}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Score Trend Chart */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-700">Score Distribution Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart 
              data={[
                { range: 'Top Tier (1-10)', count: gradeDistribution.topTier, fill: '#10b981' },
                { range: 'Middle Tier (11-22)', count: gradeDistribution.middleTier, fill: '#3b82f6' },
                { range: 'Bottom Tier (23+)', count: gradeDistribution.bottomTier, fill: '#ef4444' },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip formatter={(value) => [value, 'States']} />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div></div>
  );
};

// Rankings Table Component
const INDICATOR_ALL_VALUE = "all";

const RankingsTable = () => {
  const [selectedIndicator, setSelectedIndicator] = useState<string>(INDICATOR_ALL_VALUE);
  const indicatorKey = selectedIndicator === INDICATOR_ALL_VALUE ? undefined : selectedIndicator;
  const { rankings, isLoading, isEmpty } = useStateRankings(indicatorKey);

  const indicatorOptions = useMemo(() => {
    return [
      { value: INDICATOR_ALL_VALUE, label: "All Indicators" },
      ...Object.entries(indicators).map(([key, config]) => ({
        value: key,
        label: config.name,
      })),
    ];
  }, []);

  const selectedIndicatorLabel = useMemo(() => {
    if (selectedIndicator === INDICATOR_ALL_VALUE) {
      return "All Indicators";
    }
    return indicators[selectedIndicator]?.name ?? selectedIndicator;
  }, [selectedIndicator]);

  const exportPDF = useCallback(async () => {
    await generateStateRankingPDF({
      rankings,
      indicatorLabel: selectedIndicatorLabel,
      indicatorKey,
    });
  }, [rankings, selectedIndicatorLabel, indicatorKey]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Select value={selectedIndicator} onValueChange={setSelectedIndicator} disabled>
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue placeholder="Filter by indicator" />
            </SelectTrigger>
            <SelectContent>
              {indicatorOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" disabled>
            Generate PDF
          </Button>
        </div>
        <div className="text-center mt-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rankings...</p>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
            <SelectTrigger className="w-full sm:w-60">
              <SelectValue placeholder="Filter by indicator" />
            </SelectTrigger>
            <SelectContent>
              {indicatorOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" disabled>
            Generate PDF
          </Button>
        </div>
        <div className="text-center mt-6">
          <p className="text-gray-600">No rankings available yet.</p>
        </div>
      </div>
    );
  }

  const maxScore =
    rankings.length > 0
      ? rankings[0].maxScore
      : indicatorKey
        ? indicatorMaxScores[indicatorKey] ?? 0
        : overallMaxScore;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-200">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Detailed Rankings</h3>
            <p className="text-sm text-gray-500">
              Viewing results for {selectedIndicatorLabel} — Max score {formatScore(maxScore)}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
              <SelectTrigger className="w-full sm:w-60">
                <SelectValue placeholder="Filter by indicator" />
              </SelectTrigger>
              <SelectContent>
                {indicatorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportPDF} className="bg-green-600 hover:bg-green-700 text-white">
            📥 Download PDF
            </Button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto pb-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                State
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Indicator Score
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                % Score
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Grade
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rankings.map((ranking, index) => {
              const maxScoreForRow = ranking.maxScore || overallMaxScore;
              const { grade, description } = calculateGrade(ranking.totalScore, maxScoreForRow);
              const isTopThree = index < 3;

              return (
                <tr key={ranking.state} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                    <div className="flex items-center justify-center">
                      {isTopThree && (
                        <span className="mr-2">
                          {index === 0 && "🥇"}
                          {index === 1 && "🥈"}
                          {index === 2 && "🥉"}
                        </span>
                      )}
                      #{ranking.rank}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {ranking.state}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-mono">
                    {ranking.totalScore.toFixed(1)}/{maxScoreForRow.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-mono">
                    {ranking.percentageScore.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        grade === "A"
                          ? "bg-green-100 text-green-800"
                          : grade === "B"
                          ? "bg-blue-100 text-blue-800"
                          : grade === "C"
                          ? "bg-yellow-100 text-yellow-800"
                          : grade === "D"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {grade} - {description}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rankings.length > 0 && (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Showing {rankings.length} states with available scores
          </p>
        </div>
      )}
    </div>
  );
};

export default function StateScoringPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  // Get current user data to check permissions
  const currentUser = useQuery(api.users.getCurrentUsers, {});
  const userPermissions = currentUser?.permissions || [];
  
  // Check if user has permission to score states (admin only)
  const canScoreStates = currentUser?.role === 'admin';
  
  // Check specific tab permissions for staff
  const canViewRankings = canScoreStates || userPermissions.includes('/admin/state-scoring-rankings');
  const canViewAnalysis = canScoreStates || userPermissions.includes('/admin/state-scoring-analysis');
  const canViewIndicatorAnalysis = canScoreStates || userPermissions.includes('/admin/state-scoring-indicator-analysis');
  
  // Set initial tab based on URL param or permissions
  const getInitialTab = () => {
    if (tabParam) {
      // Check if user has permission for the requested tab
      switch (tabParam) {
        case 'rankings':
          return canViewRankings ? 'rankings' : (canScoreStates ? 'scoring' : 'rankings');
        case 'analysis':
          return canViewAnalysis ? 'analysis' : (canScoreStates ? 'scoring' : 'rankings');
        case 'indicator-analysis':
          return canViewIndicatorAnalysis ? 'indicator-analysis' : (canScoreStates ? 'scoring' : 'rankings');
        default:
          return canScoreStates ? 'scoring' : 'rankings';
      }
    }
    return canScoreStates ? 'scoring' : 'rankings';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [selectedStateFilter, setSelectedStateFilter] = useState("");
  const [selectedIndicatorFilter, setSelectedIndicatorFilter] = useState("");
  const stateIndicatorScores = useQuery(
    api.saveStateScore.getStateScores,
    selectedStateFilter ? { state: selectedStateFilter } : "skip",
  );

  // Get all state scores for indicator analysis
  const allStateScores = useQuery(api.saveStateScore.getStateScores, {});

  const analysisIndicators = useMemo(() => {
    if (!selectedStateFilter || !stateIndicatorScores) {
      return null;
    }

    // Group scores by indicator and sub-indicator
    const indicatorScores: Record<string, { total: number; subMetrics: Record<string, { score: number; value?: string; linkToSource?: string }> }> = {};

    stateIndicatorScores.forEach((score) => {
      if (!indicatorScores[score.indicator]) {
        indicatorScores[score.indicator] = { total: 0, subMetrics: {} };
      }
      indicatorScores[score.indicator].total += score.score ?? 0;
      indicatorScores[score.indicator].subMetrics[score.subIndicator] = {
        score: score.score ?? 0,
        value: score.value,
        linkToSource: (score as any).linkToSource,
      };
    });

    return Object.entries(indicators).map(([indicatorKey, config]) => {
      const indicatorData = indicatorScores[indicatorKey] || { total: 0, subMetrics: {} };
      const totalScore = indicatorData.total;
      const maxScore = indicatorMaxScores[indicatorKey] ?? 0;
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      // Build sub-metrics array
      const subMetrics = Object.entries(config.subIndicators).map(([subIndicatorKey, subIndicatorConfig]) => {
        const subMetricData = indicatorData.subMetrics[subIndicatorKey] || { score: 0 };
        const subMetricMaxScore = Math.max(
          ...(subIndicatorConfig.options as Array<{ score: number }>).map((opt) => opt.score),
          0
        );

        return {
          subIndicator: subIndicatorKey,
          label: subIndicatorConfig.label,
          score: subMetricData.score,
          maxScore: subMetricMaxScore,
          value: subMetricData.value,
          linkToSource: subMetricData.linkToSource,
        };
      });

      return {
        name: config.name,
        indicatorKey,
        totalScore,
        maxScore,
        percentage,
        subMetrics,
      };
    });
  }, [stateIndicatorScores, selectedStateFilter]);

  // Memoized state data for selected indicator
  const selectedIndicatorData = useMemo(() => {
    if (!selectedIndicatorFilter || !allStateScores) {
      return null;
    }
    return processStateScoresForIndicator(allStateScores, selectedIndicatorFilter);
  }, [selectedIndicatorFilter, allStateScores]);

  const handleGenerateIndicatorPDF = async () => {
    if (!selectedIndicatorFilter || !selectedIndicatorData) {
      toast.error("Please select an indicator and ensure data is loaded");
      return;
    }

    const indicatorConfig = indicators[selectedIndicatorFilter as keyof typeof indicators];
    if (!indicatorConfig) {
      toast.error("Invalid indicator selected");
      return;
    }
    
    await generateStateIndicatorPDF({
      indicatorKey: selectedIndicatorFilter,
      indicatorName: indicatorConfig.name,
      stateData: selectedIndicatorData
    });
  };

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">State Scoring & Rankings</h1>
          <p className="text-gray-600">Score states, analyze indicator performance, and view rankings.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Global State Filter</p>
            <p className="text-sm text-gray-500">Select a state to power the Analysis dashboard across tabs.</p>
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={selectedStateFilter || "all"}
              onValueChange={(value) => {
                setSelectedStateFilter(value === "all" ? "" : value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {nigerianStates.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="w-full mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {canScoreStates && (
              <button
                onClick={() => setActiveTab("scoring")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "scoring"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Score States
              </button>
            )}
            {canViewRankings && (
              <button
                onClick={() => setActiveTab("rankings")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "rankings"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Rankings
              </button>
            )}
            {canViewAnalysis && (
              <button
                onClick={() => setActiveTab("analysis")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "analysis"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Analysis
              </button>
            )}
            {canViewIndicatorAnalysis && (
              <button
                onClick={() => setActiveTab("indicator-analysis")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "indicator-analysis"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Indicator Analysis
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "scoring" && canScoreStates && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Score States</h2>
              <div className="mb-6">
                <BulkImportStateScores />
              </div>
              <StateScoringForm />
            </div>
          </div>
        )}

        {activeTab === "rankings" && canViewRankings && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">State Rankings & Analytics</h2>
            
            {/* Analytics Dashboard */}
            <AnalyticsDashboard />
            
            {/* Rankings Table */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Detailed Rankings</h3>
              <RankingsTable />
            </div>
          </div>
        )}

        {activeTab === "analysis" && canViewAnalysis && (
          <div className="space-y-6">
         
            <AnalysisTab
              selectedState={selectedStateFilter || undefined}
              indicators={analysisIndicators ?? undefined}
            />
          </div>
        )}

        {activeTab === "indicator-analysis" && canViewIndicatorAnalysis && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Indicator Analysis</h2>
              <p className="text-gray-600 mb-6">
                Select an indicator to view detailed performance analysis across all states, including sub-indicator breakdowns.
              </p>

              {/* Indicator Filter and Download */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end mb-6">
                <div className="flex-1">
                  <label htmlFor="indicator-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Indicator
                  </label>
                  <Select value={selectedIndicatorFilter} onValueChange={setSelectedIndicatorFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose an indicator to analyze..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(indicators).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleGenerateIndicatorPDF}
                  disabled={!selectedIndicatorFilter || !selectedIndicatorData}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  📊 Download Analysis PDF
                </Button>
              </div>

              {/* Indicator Summary */}
              {selectedIndicatorFilter && selectedIndicatorData && (() => {
                const indicatorConfig = indicators[selectedIndicatorFilter as keyof typeof indicators];
                const totalStates = selectedIndicatorData.length;
                const averageScore = totalStates > 0 ? selectedIndicatorData.reduce((sum, state) => sum + state.percentage, 0) / totalStates : 0;
                const maxScore = selectedIndicatorData[0]?.maxScore || 0;

                return (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-3">{indicatorConfig.name} - Overview</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">States with Data:</span>
                        <span className="ml-2 text-blue-600 font-bold">{totalStates}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Average Performance:</span>
                        <span className="ml-2 text-blue-600 font-bold">{averageScore.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Max Possible Score:</span>
                        <span className="ml-2 text-blue-600 font-bold">{maxScore} pts</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Sub-Indicators:</span>
                        <span className="ml-2 text-blue-600 font-bold">{Object.keys(indicatorConfig.subIndicators).length}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* State Performance Table */}
              {selectedIndicatorFilter && selectedIndicatorData && (() => {
                const sortedStates = [...selectedIndicatorData].sort((a, b) => b.percentage - a.percentage);

                return (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">State Performance Rankings</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub-Indicators</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {sortedStates.map((state, index) => (
                            <tr key={state.state} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                #{index + 1}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {state.state}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {state.totalScore.toFixed(1)} / {state.maxScore}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  state.percentage >= 80 ? 'bg-green-100 text-green-800' :
                                  state.percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {state.percentage.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {state.percentage >= 90 ? 'A+' :
                                 state.percentage >= 80 ? 'A' :
                                 state.percentage >= 70 ? 'B' :
                                 state.percentage >= 60 ? 'C' :
                                 state.percentage >= 50 ? 'D' : 'F'}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-500">
                                <div className="flex flex-wrap gap-1">
                                  {state.subIndicatorScores.map((sub, subIndex) => (
                                    <span
                                      key={subIndex}
                                      className={`inline-flex px-2 py-1 text-xs rounded ${
                                        sub.percentage >= 80 ? 'bg-green-100 text-green-700' :
                                        sub.percentage >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                      }`}
                                      title={`${sub.label}: ${sub.score}/${sub.maxScore} (${sub.percentage.toFixed(1)}%)`}
                                    >
                                      {sub.score}/{sub.maxScore}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Unauthorized Access Message */}
        {!canScoreStates && !canViewRankings && !canViewAnalysis && !canViewIndicatorAnalysis && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <div className="text-yellow-800">
              <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
              <p className="text-sm">
                You don't have permission to access state scoring features. 
                Please contact your administrator to request access to specific state scoring modules.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
