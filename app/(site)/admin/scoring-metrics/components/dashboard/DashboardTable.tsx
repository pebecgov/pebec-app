'use client';

import React from 'react';
import { api } from '@/convex/_generated/api';
import { generateMdaScoringPDF } from '@/lib/pdfGenerator';
import { toast } from 'sonner';

interface DashboardTableProps {
    liveDashboardData: any[] | undefined;
    efficiencyConfig: any;
    othersConfig: any;
    penaltyConfig: any;
    mysteryConfig: any;
    processDashboardMdaData: (filter: 'all' | 'withData', ministryFilter: 'all' | 'ministries-only' | 'without-ministries') => any[];
    mdaFilter: 'all' | 'withData';
    ministryFilter: 'all' | 'ministries-only' | 'without-ministries';
    selectedMetric: string;
    setViewDetailsMda: (mda: string | null) => void;
    setViewDetailsRow: (row: any | null) => void;
    setIsLoadingDetails: (loading: boolean) => void;
    dashboardYear: number;
    convex: any;
}

export default function DashboardTable({
    liveDashboardData,
    efficiencyConfig,
    othersConfig,
    penaltyConfig,
    mysteryConfig,
    processDashboardMdaData,
    mdaFilter,
    ministryFilter,
    selectedMetric,
    setViewDetailsMda,
    setViewDetailsRow,
    setIsLoadingDetails,
    dashboardYear,
    convex
}: DashboardTableProps) {
    const isExcluded = (mda: any, metricKey: string) => {
        const excluded = mda?.excludedMetrics;
        return Array.isArray(excluded) && excluded.includes(metricKey);
    };
    const isOthersItemExcluded = (mda: any, itemId: string) => {
        const excluded = mda?.excludedMetrics;
        return Array.isArray(excluded) && (excluded.includes("others") || excluded.includes(`others:${itemId}`));
    };
    const getMetricLabel = (metric: string) => {
        if (metric.startsWith("others:")) {
            const itemId = metric.replace("others:", "");
            const item = (othersConfig || []).find((cfg: any) => cfg.itemId === itemId);
            return item?.itemName || "Others Item";
        }
        return metric === 'mysteryShopping' ? 'Mystery Shopping' :
            metric === 'sla' ? 'Service Level Agreement' :
                metric === 'efficiency' ? 'Efficiency (SLA + Reporting + Timeliness)' :
                    metric === 'controversial' ? 'Controversial' :
                        metric === 'toutingRentseeking' ? 'Touting & Rentseeking' :
                            metric === 'innovation' ? 'Innovation' :
                                metric === 'stakeholder' ? 'Stakeholder Engagement' :
                                    metric === 'transparency' ? 'Transparency' :
                                        metric === 'others' ? 'Others (Dynamic)' :
                                            metric === 'penalties' ? 'Penalties' :
                                                metric === 'reportGovResolution' ? 'Report Gov Resolution' :
                                                    metric === 'monthlyReport' ? 'Monthly Report Submission' :
                                                        metric === 'timeliness' ? 'Timeliness' : 'Score';
    };
    const getMetricScore = (mda: any, metric: string) => {
        if (metric === "totalScore") return mda.totalScore || 0;
        if (metric === "mysteryShopping") return isExcluded(mda, "mystery") ? 0 : (mda.mysteryShopping?.score || 0);
        if (metric === "sla") return isExcluded(mda, "sla") ? 0 : (mda.sla?.score || 0);
        if (metric === "controversial") return isExcluded(mda, "controversial") ? 0 : (mda.controversial?.score || 0);
        if (metric === "toutingRentseeking") return isExcluded(mda, "toutingRentseeking") ? 0 : (mda.toutingRentseeking?.score || 0);
        if (metric === "innovation") return isExcluded(mda, "innovation") ? 0 : (mda.innovation?.score || 0);
        if (metric === "stakeholder") return isExcluded(mda, "stakeholder") ? 0 : (mda.stakeholder?.score || 0);
        if (metric === "transparency") return isExcluded(mda, "transparency") ? 0 : (mda.transparency?.score || 0);
        if (metric === "reportGovResolution") return isExcluded(mda, "reportGov") ? 0 : (mda.reportGovResolution?.score || 0);
        if (metric === "monthlyReport") return isExcluded(mda, "reportSubmission") ? 0 : (mda.monthlyReport?.score || 0);
        if (metric === "timeliness") return isExcluded(mda, "timeliness") ? 0 : (mda.timeliness?.score || 0);
        if (metric === "penalties") return isExcluded(mda, "penalties") ? 0 : (mda.penalties?.score || 0);
        if (metric === "efficiency") {
            const slaScore = isExcluded(mda, "sla") ? 0 : (mda.sla?.score || 0);
            const reportScore = isExcluded(mda, "reportSubmission") ? 0 : (mda.monthlyReport?.score || 0);
            const timelinessScore = isExcluded(mda, "timeliness") ? 0 : (mda.timeliness?.score || 0);
            return slaScore + reportScore + timelinessScore;
        }
        if (metric.startsWith("others:")) {
            const itemId = metric.replace("others:", "");
            return isOthersItemExcluded(mda, itemId) ? 0 : (mda.others?.scores?.[itemId] || 0);
        }
        if (metric === "others") return isExcluded(mda, "others") ? 0 : (mda.others?.score || 0);
        return 0;
    };
    const isMdaExcludedForSelectedMetric = (mda: any, metric: string) => {
        if (metric === "totalScore") return false;
        if (metric === "efficiency") {
            return isExcluded(mda, "sla") && isExcluded(mda, "reportSubmission") && isExcluded(mda, "timeliness");
        }
        if (metric === "mysteryShopping") return isExcluded(mda, "mystery");
        if (metric === "sla") return isExcluded(mda, "sla");
        if (metric === "controversial") return isExcluded(mda, "controversial");
        if (metric === "toutingRentseeking") return isExcluded(mda, "toutingRentseeking");
        if (metric === "innovation") return isExcluded(mda, "innovation");
        if (metric === "stakeholder") return isExcluded(mda, "stakeholder");
        if (metric === "transparency") return isExcluded(mda, "transparency");
        if (metric === "reportGovResolution") return isExcluded(mda, "reportGov");
        if (metric === "monthlyReport") return isExcluded(mda, "reportSubmission");
        if (metric === "timeliness") return isExcluded(mda, "timeliness");
        if (metric === "penalties") return isExcluded(mda, "penalties");
        if (metric.startsWith("others:")) return isOthersItemExcluded(mda, metric.replace("others:", ""));
        if (metric === "others") return isExcluded(mda, "others");
        return false;
    };

    if (liveDashboardData === undefined) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <p className="text-gray-500">Loading dashboard data...</p>
            </div>
        );
    }

    return (
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
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SLA (Efficiency)</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mystery Shopping</th>

                                    {dashboardYear < 2026 ? (
                                        <>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Innovation</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stakeholder</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transparency</th>
                                        </>
                                    ) : (
                                        <>
                                            {othersConfig?.map((item: any) => (
                                                <th key={item.itemId} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    {item.itemName}
                                                </th>
                                            ))}
                                        </>
                                    )}

                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Gov Resolution</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Submission</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timeliness</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Score</th>

                                    {dashboardYear < 2026 ? (
                                        <>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Controversial</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Touting & Rentseeking</th>
                                        </>
                                    ) : (
                                        <>
                                            {penaltyConfig?.map((item: any) => (
                                                <th key={item.penaltyId} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    {item.penaltyName}
                                                </th>
                                            ))}
                                        </>
                                    )}

                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final Score</th>
                                </>
                            ) : (
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {getMetricLabel(selectedMetric)} (Overall %)
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
                            const allMdasArray = processDashboardMdaData(mdaFilter, ministryFilter);
                            const metricScopedData = selectedMetric === "totalScore"
                                ? allMdasArray
                                : allMdasArray.filter((mda: any) => !isMdaExcludedForSelectedMetric(mda, selectedMetric));
                            const sortedData = Array.isArray(metricScopedData)
                                ? [...metricScopedData].sort((a: any, b: any) => getMetricScore(b, selectedMetric) - getMetricScore(a, selectedMetric))
                                : [];
                            const rankedByMetric = [...sortedData];

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
                                    score = isExcluded(mda, "mystery") ? 0 : (mda.mysteryShopping?.score || 0);
                                    maxScore = 20;
                                    overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                                } else if (selectedMetric === 'sla') {
                                    score = isExcluded(mda, "sla") ? 0 : (mda.sla?.score || 0);
                                    maxScore = 30;
                                    overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                                } else if (selectedMetric === 'controversial') {
                                    score = isExcluded(mda, "controversial") ? 0 : (mda.controversial?.score || 0);
                                    overallPercentage = score;
                                } else if (selectedMetric === 'toutingRentseeking') {
                                    score = isExcluded(mda, "toutingRentseeking") ? 0 : (mda.toutingRentseeking?.score || 0);
                                    overallPercentage = score;
                                } else if (selectedMetric === 'innovation') {
                                    score = isExcluded(mda, "innovation") ? 0 : (mda.innovation?.score || 0);
                                    maxScore = 5;
                                    overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                                } else if (selectedMetric === 'stakeholder') {
                                    score = isExcluded(mda, "stakeholder") ? 0 : (mda.stakeholder?.score || 0);
                                    maxScore = 10;
                                    overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                                } else if (selectedMetric === 'transparency') {
                                    score = isExcluded(mda, "transparency") ? 0 : (mda.transparency?.score || 0);
                                    maxScore = 5;
                                    overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                                } else if (selectedMetric === 'reportGovResolution') {
                                    score = isExcluded(mda, "reportGov") ? 0 : (mda.reportGovResolution?.score || 0);
                                    maxScore = 15;
                                    overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                                } else if (selectedMetric === 'monthlyReport') {
                                    score = isExcluded(mda, "reportSubmission") ? 0 : (mda.monthlyReport?.score || 0);
                                    maxScore = 3;
                                    overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                                } else if (selectedMetric === 'others') {
                                    if (isExcluded(mda, "others")) {
                                        score = 0;
                                    } else {
                                        const raw = mda.others?.score || 0;
                                        const excludedOthersScore = (othersConfig || []).reduce((sum: number, item: any) => {
                                            if (!isOthersItemExcluded(mda, item.itemId)) return sum;
                                            return sum + (mda.others?.scores?.[item.itemId] || 0);
                                        }, 0);
                                        score = Math.max(0, raw - excludedOthersScore);
                                    }
                                    const othersTotal = 45; // TODO: make dynamic?
                                    maxScore = othersTotal;
                                    overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                                } else if (selectedMetric.startsWith("others:")) {
                                    const itemId = selectedMetric.replace("others:", "");
                                    const item = (othersConfig || []).find((cfg: any) => cfg.itemId === itemId);
                                    score = isOthersItemExcluded(mda, itemId) ? 0 : (mda.others?.scores?.[itemId] || 0);
                                    maxScore = item?.weight || 0;
                                    overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                                } else if (selectedMetric === 'penalties') {
                                    score = isExcluded(mda, "penalties") ? 0 : (mda.penalties?.score || 0);
                                    overallPercentage = score; // Usually negative or points
                                } else if (selectedMetric === 'timeliness') {
                                    score = isExcluded(mda, "timeliness") ? 0 : (mda.timeliness?.score || 0);
                                    maxScore = 2;
                                    overallPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                                } else if (selectedMetric === 'efficiency') {
                                    const slaScore = isExcluded(mda, "sla") ? 0 : (mda.sla?.score || 0);
                                    const reportScore = isExcluded(mda, "reportSubmission") ? 0 : (mda.monthlyReport?.score || 0);
                                    const timelinessScore = isExcluded(mda, "timeliness") ? 0 : (mda.timeliness?.score || 0);
                                    score = slaScore + reportScore + timelinessScore;
                                    maxScore = (mda.sla?.maxPossibleScore || 30) + (mda.monthlyReport?.maxPossibleScore || 3) + (mda.timeliness?.maxPossibleScore || 2);
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
                                                    {isExcluded(mda, "sla") ? (
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Excluded</span>
                                                    ) : mda.sla ? (
                                                        <div>
                                                            <div className="font-semibold">{mda.sla.score.toFixed(1)}/{mda.sla.maxPossibleScore || 30}</div>
                                                            <div className="text-xs text-gray-400">{mda.sla.monthsWithData}/{mda.sla.totalMonths || 12} months</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {isExcluded(mda, "mystery") ? (
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Excluded</span>
                                                    ) : mda.mysteryShopping ? (
                                                        <span className="font-semibold">{mda.mysteryShopping.score.toFixed(1)}/{mda.mysteryShopping.maxPossibleScore || 20}</span>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                                {dashboardYear < 2026 ? (
                                                    <>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {isExcluded(mda, "innovation") ? (
                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Excluded</span>
                                                            ) : mda.innovation ? (
                                                                <span className="font-semibold">{mda.innovation.score.toFixed(1)}/5</span>
                                                            ) : (
                                                                <span className="text-gray-400">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {isExcluded(mda, "stakeholder") ? (
                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Excluded</span>
                                                            ) : mda.stakeholder ? (
                                                                <span className="font-semibold">{mda.stakeholder.score.toFixed(1)}/10</span>
                                                            ) : (
                                                                <span className="text-gray-400">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {isExcluded(mda, "transparency") ? (
                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Excluded</span>
                                                            ) : mda.transparency ? (
                                                                <span className="font-semibold">{mda.transparency.score.toFixed(1)}/5</span>
                                                            ) : (
                                                                <span className="text-gray-400">—</span>
                                                            )}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        {othersConfig?.map((item: any) => {
                                                            const itemScore = mda.others?.scores?.[item.itemId] || 0;
                                                            const itemValue = mda.others?.values?.[item.itemId];
                                                            return (
                                                                <td key={item.itemId} className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    {isOthersItemExcluded(mda, item.itemId) ? (
                                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Excluded</span>
                                                                    ) : (
                                                                        <div>
                                                                            <div className="font-semibold">{itemScore.toFixed(1)}/{item.weight}</div>
                                                                            <div className="text-xs text-gray-400">
                                                                                {typeof itemValue === 'boolean' ? (itemValue ? 'Yes' : 'No') :
                                                                                    typeof itemValue === 'number' ? itemValue : '—'}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {isExcluded(mda, "reportGov") ? (
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Excluded</span>
                                                    ) : mda.reportGovResolution ? (
                                                        <div>
                                                            {mda.reportGovResolution.isSkipped ? (
                                                                <div>
                                                                    <div className="font-semibold text-gray-400 line-through">0/{mda.reportGovResolution?.maxPossibleScore || 15}</div>
                                                                    <div className="text-xs text-yellow-600 mt-1">⚠️ Skipped</div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="font-semibold">{mda.reportGovResolution.score.toFixed(1)}/{mda.reportGovResolution.maxPossibleScore || 15}</div>
                                                                    {dashboardYear < 2026 && mda.reportGovResolution.hasFirstHalf !== undefined && (
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
                                                    {isExcluded(mda, "reportSubmission") ? (
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Excluded</span>
                                                    ) : mda.monthlyReport ? (
                                                        <div>
                                                            <div className="font-semibold">{mda.monthlyReport.score.toFixed(1)}/{mda.monthlyReport.maxPossibleScore || 3}</div>
                                                            <div className="text-xs text-gray-400">{mda.monthlyReport.monthsWithData}/{mda.monthlyReport.totalMonths || 12} months</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {isExcluded(mda, "timeliness") ? (
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Excluded</span>
                                                    ) : mda.timeliness ? (
                                                        <div>
                                                            <div className="font-semibold">{mda.timeliness.score.toFixed(1)}/{mda.timeliness.maxPossibleScore || 2}</div>
                                                            <div className="text-xs text-gray-400">{mda.timeliness.monthsWithData}/{mda.timeliness.totalMonths || 12} months</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-700">
                                                            {(mda.totalGrossScore || 0).toFixed(1)}
                                                        </span>
                                                        {mda.reportGovResolution?.isSkipped && (
                                                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded" title="Report Gov Resolution skipped - points normalized">
                                                                ⚠️ Normalized
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        <span>{(mda.totalGrossScore || 0).toFixed(1)}/{mda.maxPossiblePoints}</span>
                                                    </div>
                                                </td>
                                                {dashboardYear < 2026 ? (
                                                    <>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {isExcluded(mda, "controversial") ? (
                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Excluded</span>
                                                            ) : mda.controversial ? (
                                                                <span className={`font-semibold ${mda.controversial.score < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                                    {mda.controversial.score.toFixed(1)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400">0.0</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {isExcluded(mda, "toutingRentseeking") ? (
                                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Excluded</span>
                                                            ) : mda.toutingRentseeking ? (
                                                                <span className={`font-semibold ${mda.toutingRentseeking.score < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                                    {mda.toutingRentseeking.score.toFixed(1)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-400">0.0</span>
                                                            )}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        {penaltyConfig?.map((item: any) => {
                                                            const hasPenalty = mda.penalties?.values?.[item.penaltyId] === true;
                                                            return (
                                                                <td key={item.penaltyId} className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                    {isExcluded(mda, "penalties") ? (
                                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Excluded</span>
                                                                    ) : (
                                                                        <span className={`font-semibold ${hasPenalty ? 'text-red-600' : 'text-gray-500'}`}>
                                                                            {hasPenalty ? `${item.penaltyValue}` : "0.0"}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                                <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-bold ${mda.totalPercentage >= 90 ? 'text-green-600' :
                                                            mda.totalPercentage >= 80 ? 'text-blue-600' :
                                                                mda.totalPercentage >= 70 ? 'text-yellow-600' :
                                                                    mda.totalPercentage >= 60 ? 'text-orange-600' : 'text-red-600'
                                                            }`}>
                                                            {mda.totalScore.toFixed(1)}
                                                        </span>
                                                    </div>
                                                    <div className={`text-xs mt-1 ${mda.totalPercentage >= 90 ? 'text-green-600' :
                                                        mda.totalPercentage >= 80 ? 'text-blue-600' :
                                                            mda.totalPercentage >= 70 ? 'text-yellow-600' :
                                                                mda.totalPercentage >= 60 ? 'text-orange-600' : 'text-red-600'
                                                        }`}>
                                                        {mda.totalPercentage.toFixed(1)}%
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <td className="px-4 py-4 whitespace-nowrap text-sm">
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
                                        )}
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setViewDetailsMda(mda.mdaName);
                                                        setViewDetailsRow(mda);
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
                                                            const detailedData = await (convex as any).query(
                                                                api.mda_scoring.getMdaDetailedScoringData,
                                                                { mdaName: mda.mdaName, year: dashboardYear }
                                                            ) as any;
                                                            if (detailedData) {
                                                                detailedData.position = rank;
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
        </div >
    );
}
