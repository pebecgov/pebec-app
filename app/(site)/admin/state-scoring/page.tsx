"use client";

import { useState, useMemo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import StateScoringForm from "@/components/Admin/StateScoringForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useStateRankings } from "@/hooks/useStateRankings";
import { indicators } from "@/convex/config/indicators";
import { generateStateRankingPDF } from "@/lib/stateRankingPdfGenerator";

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
      gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
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

  // Performance categories based on percentage scores
  const topPerformers = scores.filter(score => (score / TOTAL_POSSIBLE_POINTS) * 100 >= 70).length;
  const midPerformers = scores.filter(score => {
    const percentage = (score / TOTAL_POSSIBLE_POINTS) * 100;
    return percentage >= 50 && percentage < 70;
  }).length;
  const lowPerformers = scores.filter(score => (score / TOTAL_POSSIBLE_POINTS) * 100 < 50).length;

  // Highest and lowest scoring states
  const sortedStates = states.sort((a, b) => stateTotals[b] - stateTotals[a]);
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

  // Grade distribution based on percentage scores (A: 85-100%, B: 70-84%, C: 55-69%, D: 40-54%, F: <40%)
  const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  scores.forEach(score => {
    const percentage = (score / TOTAL_POSSIBLE_POINTS) * 100;
    if (percentage >= 85) gradeDistribution.A++;
    else if (percentage >= 70) gradeDistribution.B++;
    else if (percentage >= 55) gradeDistribution.C++;
    else if (percentage >= 40) gradeDistribution.D++;
    else gradeDistribution.F++;
  });

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
          <p><strong>Grade A (85%+):</strong> Excellent performance - Meeting all standards</p>
          <p><strong>Grade B (70-84%):</strong> Good performance - Meeting most standards</p>
          <p><strong>Grade C (55-69%):</strong> Satisfactory performance - Meeting basic standards</p>
          <p><strong>Grade D (40-54%):</strong> Below average - Needs improvement</p>
          <p><strong>Grade F (Below 40%):</strong> Poor performance - Requires immediate attention</p>
          <p><strong>Meeting Standards (70%+):</strong> States performing at acceptable level or better</p>
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
            <div className="text-sm text-gray-600">Score ≥ 70%</div>
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
                { name: 'Top (≥70%)', value: topPerformers, fill: '#10b981' },
                { name: 'Mid (50-69%)', value: midPerformers, fill: '#f59e0b' },
                { name: 'Low (<50%)', value: lowPerformers, fill: '#ef4444' }
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
                  data={Object.entries(gradeDistribution).map(([grade, count]) => ({
                    name: `Grade ${grade}`,
                    value: count,
                    fill: grade === 'A' ? '#10b981' : grade === 'B' ? '#3b82f6' : grade === 'C' ? '#f59e0b' : grade === 'D' ? '#f97316' : '#ef4444'
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {Object.entries(gradeDistribution).map(([grade, count], index) => (
                    <Cell key={`cell-${index}`} fill={
                      grade === 'A' ? '#10b981' : 
                      grade === 'B' ? '#3b82f6' : 
                      grade === 'C' ? '#f59e0b' : 
                      grade === 'D' ? '#f97316' : '#ef4444'
                    } />
                  ))}
                </Pie>
                <Tooltip />
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

      {/* Indicator Performance */}
      {Object.keys(indicatorPerformance).length > 0 && (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-700">Indicator Performance Averages</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={Object.entries(indicatorPerformance)
                  .sort(([,a], [,b]) => b - a)
                  .map(([indicator, average]) => ({
                    id: indicator, // Unique identifier
                    name: indicator.replace(/([A-Z])/g, ' $1').trim(),
                    value: Number(average.toFixed(2)), // Ensure consistent number format
                    fill: '#3b82f6'
                  }))
                  .filter((item, index, self) => 
                    index === self.findIndex((t) => t.id === item.id)
                  )}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip formatter={(value) => [typeof value === 'number' ? value.toFixed(1) : value, 'Average Score']} />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Score Trend Chart */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-700">Score Distribution Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart 
              data={[
                { range: '0-20', count: analytics?.gradeDistribution.F || 0, fill: '#ef4444' },
                { range: '20-40', count: 0, fill: '#f97316' },
                { range: '40-55', count: analytics?.gradeDistribution.D || 0, fill: '#f97316' },
                { range: '55-70', count: analytics?.gradeDistribution.C || 0, fill: '#f59e0b' },
                { range: '70-85', count: analytics?.gradeDistribution.B || 0, fill: '#3b82f6' },
                { range: '85-100', count: analytics?.gradeDistribution.A || 0, fill: '#10b981' }
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
  const [activeTab, setActiveTab] = useState("scoring");

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">State Scoring & Rankings</h1>
        <p className="text-gray-600">Score states and view performance rankings</p>
      </div>

      {/* Tab Navigation */}
      <div className="w-full mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
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
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "scoring" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Score States</h2>
            <StateScoringForm />
          </div>
        )}

        {activeTab === "rankings" && (
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
      </div>
    </div>
  );
}
