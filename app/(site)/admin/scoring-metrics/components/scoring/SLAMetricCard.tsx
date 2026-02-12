'use client';

import React from 'react';
import { getMonthsForPeriod } from '../../utils/helpers';
import { MonthlySlaData } from '../../utils/types';

interface SLAMetricCardProps {
    isLoadingSLAData: boolean;
    savedSLAData: boolean;
    setShowSLARanking: (show: boolean) => void;
    scoringPeriod: string;
    currentYear: number;
    monthlySlaData: MonthlySlaData;
    slaScore: {
        totalScore: number;
        monthsWithData: number;
        totalMonths: number;
        maxPossibleScore?: number;
        pointsPerMonth?: number;
    };
    setShowSlaModal: (show: boolean) => void;
    handleSaveSLAData: () => void;
    selectedMda: string;
    periodMonths?: Array<{ month: number; year: number; monthName: string }>;
    useDynamicConfig?: boolean;
    efficiencyConfig?: any;
}

export default function SLAMetricCard({
    isLoadingSLAData,
    savedSLAData,
    setShowSLARanking,
    scoringPeriod,
    currentYear,
    monthlySlaData,
    slaScore,
    setShowSlaModal,
    handleSaveSLAData,
    selectedMda,
    periodMonths,
    useDynamicConfig,
    efficiencyConfig
}: SLAMetricCardProps) {
    const periodYear = scoringPeriod.match(/\d{4}/)?.[0] || String(currentYear);

    // Use dynamic or legacy month calculation
    const months = periodMonths || getMonthsForPeriod(scoringPeriod);
    const maxPoints = slaScore.maxPossibleScore || 30;
    const pointsPerMonth = slaScore.pointsPerMonth || 5;

    return (
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
                        {maxPoints} Points
                    </span>
                </div>
            </div>

            <div className="space-y-3">
                <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                        📅 {scoringPeriod.includes("1st Half") ? `Jan-Jun ${periodYear}` :
                            scoringPeriod.includes("2nd Half") ? `Jul-Dec ${periodYear}` : "All Periods"}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mb-4">
                        {months.map((periodMonth, index) => {
                            const monthName = periodMonth.monthName || new Date(periodMonth.year, periodMonth.month, 1)
                                .toLocaleString('default', { month: 'short' });
                            const monthKey = `${periodMonth.year}-${periodMonth.month}`;
                            const monthData = monthlySlaData[monthKey];
                            const hasData = monthData && (monthData.method === 'file' ? monthData.overallPercentage !== null : monthData.rating > 0);

                            return (
                                <div key={index} className={`p-2 rounded-md text-center border ${hasData
                                    ? 'bg-green-100 text-green-800 border-green-300'
                                    : 'bg-gray-100 text-gray-600 border-gray-300'
                                    }`}>
                                    <div className="font-medium">{monthName}</div>
                                    <div className="text-xs">
                                        {hasData ? `✓ ${pointsPerMonth.toFixed(1)}pts` : '0pts'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="text-center space-y-2">
                        <div className="text-lg font-semibold">
                            Score: {slaScore.totalScore.toFixed(1)}/{maxPoints}
                        </div>
                        <div className="text-sm text-gray-600">
                            {slaScore.monthsWithData}/{slaScore.totalMonths} months completed
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
                                className={`px-4 py-2 rounded-md text-white text-sm font-medium transition-colors duration-300 ${!selectedMda
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
    );
}
