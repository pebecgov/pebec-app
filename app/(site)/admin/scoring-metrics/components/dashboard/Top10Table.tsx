'use client';

import React from 'react';

interface Top10TableProps {
    processDashboardMdaData: (filter: 'all' | 'withData', ministryFilter: 'all' | 'ministries-only' | 'without-ministries') => any[];
    mdaFilter: 'all' | 'withData';
    ministryFilter: 'all' | 'ministries-only' | 'without-ministries';
    selectedMetric: string;
    dashboardYear: number;
}

// Helper function to get metric label
function getMetricLabel(selectedMetric: string): string {
    if (selectedMetric.startsWith("others:")) {
        return "Others Item";
    }
    const labels: Record<string, string> = {
        mysteryShopping: 'Mystery Shopping',
        sla: 'Service Level Agreement',
        controversial: 'Controversial',
        toutingRentseeking: 'Touting & Rentseeking',
        innovation: 'Innovation',
        stakeholder: 'Stakeholder Engagement',
        transparency: 'Transparency',
        reportGovResolution: 'Report Gov Resolution',
        monthlyReport: 'Monthly Report Submission',
        timeliness: 'Timeliness',
        totalScore: 'Total Score',
        others: 'Others (Dynamic)',
        penalties: 'Penalties'
    };
    return labels[selectedMetric] || 'Score';
}

// Helper function to get score value for sorting
function getMetricValue(mda: any, metric: string): number {
    if (metric === 'totalScore') return mda.totalPercentage || 0;
    if (metric === 'mysteryShopping') return mda.mysteryShopping?.score || 0;
    if (metric === 'sla') return mda.sla?.score || 0;
    if (metric === 'controversial') return mda.controversial?.score || 0;
    if (metric === 'toutingRentseeking') return mda.toutingRentseeking?.score || 0;
    if (metric === 'innovation') return mda.innovation?.score || 0;
    if (metric === 'stakeholder') return mda.stakeholder?.score || 0;
    if (metric === 'transparency') return mda.transparency?.score || 0;
    if (metric === 'reportGovResolution') return mda.reportGovResolution?.score || 0;
    if (metric === 'monthlyReport') return mda.monthlyReport?.score || 0;
    if (metric === 'timeliness') return mda.timeliness?.score || 0;
    if (metric === 'others') return mda.others?.score || 0;
    if (metric.startsWith('others:')) {
        const itemId = metric.replace('others:', '');
        const excluded = mda?.excludedMetrics;
        if (Array.isArray(excluded) && (excluded.includes("others") || excluded.includes(`others:${itemId}`))) {
            return 0;
        }
        return mda.others?.scores?.[itemId] || 0;
    }
    if (metric === 'penalties') return mda.penalties?.score || 0;
    return 0;
}

// Helper function to calculate percentage for display
function calculatePercentage(mda: any, metric: string): number {
    if (metric === 'totalScore') return mda.totalPercentage || 0;

    const score = getMetricValue(mda, metric);
    const maxScores: Record<string, number> = {
        mysteryShopping: 20,
        sla: 30,
        controversial: 0, // penalty
        toutingRentseeking: 0, // penalty
        innovation: 5,
        stakeholder: 10,
        transparency: 5,
        reportGovResolution: 15,
        monthlyReport: 3,
        timeliness: 2,
        others: 45
    };

    const maxScore = maxScores[metric] || 100;
    if (metric === 'controversial' || metric === 'toutingRentseeking' || metric === 'penalties') {
        return score; // Display raw penalty value
    }
    return maxScore > 0 ? (score / maxScore) * 100 : 0;
}

export default function Top10Table({
    processDashboardMdaData,
    mdaFilter,
    ministryFilter,
    selectedMetric,
    dashboardYear
}: Top10TableProps) {
    const allMdasArray = processDashboardMdaData(mdaFilter, ministryFilter);
    const metricScopedData = selectedMetric === "totalScore"
        ? allMdasArray
        : allMdasArray.filter((mda: any) => {
            const excluded = mda?.excludedMetrics;
            if (!Array.isArray(excluded)) return true;
            if (selectedMetric === "efficiency") {
                return !(excluded.includes("sla") && excluded.includes("reportSubmission") && excluded.includes("timeliness"));
            }
            if (selectedMetric === "mysteryShopping") return !excluded.includes("mystery");
            if (selectedMetric === "sla") return !excluded.includes("sla");
            if (selectedMetric === "reportGovResolution") return !excluded.includes("reportGov");
            if (selectedMetric === "monthlyReport") return !excluded.includes("reportSubmission");
            if (selectedMetric === "timeliness") return !excluded.includes("timeliness");
            if (selectedMetric.startsWith("others:")) {
                const itemId = selectedMetric.replace("others:", "");
                return !(excluded.includes("others") || excluded.includes(`others:${itemId}`));
            }
            if (selectedMetric === "others") return !excluded.includes("others");
            return !excluded.includes(selectedMetric);
        });

    // Sort by selected metric
    const sortedData = [...metricScopedData].sort((a: any, b: any) => {
        const aValue = getMetricValue(a, selectedMetric);
        const bValue = getMetricValue(b, selectedMetric);
        return bValue - aValue;
    });

    const top10 = sortedData.slice(0, 10);

    return (
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 text-center">🏆 Top 10</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-green-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rank
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                MDA Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {getMetricLabel(selectedMetric)} (%)
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {top10.map((mda: any, index: number) => {
                            const score = getMetricValue(mda, selectedMetric);
                            const overallPercentage = calculatePercentage(mda, selectedMetric);

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
                                            <span className={`font-bold text-lg ${overallPercentage >= 90 ? 'text-green-600' :
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
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
