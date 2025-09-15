"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';



export default function ScoringMetricsDashboard() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const scoringAnalytics = useQuery(api.mda_scoring.getScoringAnalytics);
  const mdasWithScores = useQuery(api.mda_scoring.getMDAsWithScores);
  const yearlyScoringData = useQuery(api.mda_scoring.getYearlyScoringData, { year: selectedYear });
  const allMDAsWithScores = useQuery(api.mda_scoring.getAllMDAsLatestScores);

  if (!scoringAnalytics || !mdasWithScores || !yearlyScoringData || !allMDAsWithScores) {
    return <div className="text-center py-8">Loading scoring analytics...</div>;
  }

  // Prepare data for charts
  const gradeData = Object.entries(scoringAnalytics.gradeDistribution).map(([grade, count]) => ({
    grade,
    count,
    percentage: (count / scoringAnalytics.totalMDAs) * 100
  }));

  const topPerformersData = allMDAsWithScores
    .filter(mda => mda.currentScore && mda.currentScore > 0)
    .slice(0, 10)
    .map((mda, index) => ({
      name: mda.mdaName,
      score: mda.currentScore || 0,
      rank: index + 1,
      isActive: mda.isActiveOnPlatform
    }));

  const bottomPerformersData = allMDAsWithScores
    .filter(mda => mda.currentScore && mda.currentScore > 0)
    .slice(-10)
    .reverse()
    .map((mda, index) => ({
      name: mda.mdaName,
      score: mda.currentScore || 0,
      rank: allMDAsWithScores.length - index,
      isActive: mda.isActiveOnPlatform
    }));

  return (
    <div className="space-y-6">
      {/* Year Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Year Filter</h2>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Explanation Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">📊 Understanding the Scoring System</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p><strong>Scoring Periods:</strong> 1st Half (Jan-Jun) and 2nd Half (Jul-Dec) of each year</p>
          <p><strong>Year Average:</strong> (1st Half Score + 2nd Half Score) ÷ 2</p>
          <p><strong>Grade A (90%+):</strong> Excellent performance - Meeting all standards</p>
          <p><strong>Grade B (80-89%):</strong> Good performance - Meeting most standards</p>
          <p><strong>Grade C (70-79%):</strong> Satisfactory performance - Meeting basic standards</p>
          <p><strong>Grade D (60-69%):</strong> Below average - Needs improvement</p>
          <p><strong>Grade F (Below 60%):</strong> Poor performance - Requires immediate attention</p>
          <p><strong>Meeting Standards (70%+):</strong> MDAs performing at acceptable level or better</p>
          <p><strong>Below Standards (Below 70%):</strong> MDAs that need improvement to meet requirements</p>
        </div>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total MDAs</p>
              <p className="text-2xl font-semibold text-gray-900">{scoringAnalytics.totalMDAs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Meeting Standards (70%+)</p>
              <p className="text-2xl font-semibold text-gray-900">{scoringAnalytics.compliantMDAs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{scoringAnalytics.complianceRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-semibold text-gray-900">{scoringAnalytics.averageScore.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Grade Distribution Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topPerformersData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Distribution Table */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
          <div className="space-y-3">
            {gradeData.map((grade) => (
              <div key={grade.grade} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`w-4 h-4 rounded-full mr-3 ${
                    grade.grade === 'A' ? 'bg-green-500' :
                    grade.grade === 'B' ? 'bg-blue-500' :
                    grade.grade === 'C' ? 'bg-yellow-500' :
                    grade.grade === 'D' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}></span>
                  <span className="text-sm font-medium text-gray-900">
                    Grade {grade.grade}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{grade.count} MDAs</div>
                  <div className="text-xs text-gray-500">{grade.percentage.toFixed(1)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Top 10 Performers</h3>
          </div>
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
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topPerformersData.map((mda, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{mda.rank}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {mda.name}
                        {mda.isActive ? (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {mda.score.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        mda.score >= 90 ? 'bg-green-100 text-green-800' :
                        mda.score >= 80 ? 'bg-blue-100 text-blue-800' :
                        mda.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        mda.score >= 60 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {mda.score >= 90 ? 'A' :
                         mda.score >= 80 ? 'B' :
                         mda.score >= 70 ? 'C' :
                         mda.score >= 60 ? 'D' : 'F'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Performers Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Bottom 10 Performers</h3>
          </div>
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
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bottomPerformersData.map((mda, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{mda.rank}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {mda.name}
                        {mda.isActive ? (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {mda.score.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        mda.score >= 90 ? 'bg-green-100 text-green-800' :
                        mda.score >= 80 ? 'bg-blue-100 text-blue-800' :
                        mda.score >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        mda.score >= 60 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {mda.score >= 90 ? 'A' :
                         mda.score >= 80 ? 'B' :
                         mda.score >= 70 ? 'C' :
                         mda.score >= 60 ? 'D' : 'F'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Yearly Performance Overview */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{selectedYear} Performance Overview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MDA Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  1st Half
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  2nd Half
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year Average
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {yearlyScoringData.map((mdaData) => {
                const firstHalf = mdaData.periods.find(p => p.period.includes('1st Half'))?.score || 0;
                const secondHalf = mdaData.periods.find(p => p.period.includes('2nd Half'))?.score || 0;
                const yearlyAverage = mdaData.yearlyAverage;
                
                return (
                  <tr key={mdaData.mdaName} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {mdaData.mdaName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {firstHalf > 0 ? `${firstHalf.toFixed(1)}%` : 'Not Scored'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {secondHalf > 0 ? `${secondHalf.toFixed(1)}%` : 'Not Scored'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {yearlyAverage > 0 ? `${yearlyAverage.toFixed(1)}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {yearlyAverage > 0 ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          yearlyAverage >= 90 ? 'bg-green-100 text-green-800' :
                          yearlyAverage >= 80 ? 'bg-blue-100 text-blue-800' :
                          yearlyAverage >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          yearlyAverage >= 60 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {yearlyAverage >= 90 ? 'A' :
                           yearlyAverage >= 80 ? 'B' :
                           yearlyAverage >= 70 ? 'C' :
                           yearlyAverage >= 60 ? 'D' : 'F'}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {yearlyAverage > 0 ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          yearlyAverage >= 70 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {yearlyAverage >= 70 ? 'Meeting Standards' : 'Below Standards'}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* All MDAs Performance */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All MDAs Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MDA Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Scored
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allMDAsWithScores
                .sort((a, b) => b.currentScore - a.currentScore)
                .map((mda) => (
                  <tr key={mda.mdaName} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        {mda.mdaName}
                        {mda.isActiveOnPlatform ? (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(mda.currentScore || 0).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (mda.currentScore || 0) >= 90 ? 'bg-green-100 text-green-800' :
                        (mda.currentScore || 0) >= 80 ? 'bg-blue-100 text-blue-800' :
                        (mda.currentScore || 0) >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        (mda.currentScore || 0) >= 60 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {(mda.currentScore || 0) >= 90 ? 'A' :
                         (mda.currentScore || 0) >= 80 ? 'B' :
                         (mda.currentScore || 0) >= 70 ? 'C' :
                         (mda.currentScore || 0) >= 60 ? 'D' : 'F'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (mda.currentScore || 0) >= 70 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {(mda.currentScore || 0) >= 70 ? 'Meeting Standards' : 'Below Standards'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {mda.lastScoredAt 
                        ? new Date(mda.lastScoredAt).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {mda.isActiveOnPlatform ? 'Live Data' : 'Manual Only'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {mda.isActiveOnPlatform ? 'Live Data' : 'Manual Only'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
