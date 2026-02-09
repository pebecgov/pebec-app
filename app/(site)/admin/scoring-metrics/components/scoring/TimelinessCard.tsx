'use client';

import React from 'react';
import { getMonthsForPeriod } from '../../utils/helpers';

interface TimelinessCardProps {
    isLoading: boolean;
    isSaved: boolean;
    useManual: boolean;
    setUseManual: (val: boolean) => void;
    timelinessData: {
        onTime: number;
        total: number;
        percentage: number;
        score: number;
    };
    scoringPeriod: string;
    manualTimeliness: Record<string, boolean>;
    setManualTimeliness: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    realMonthlyReports: any[] | undefined;
    handleSave: () => void;
    selectedMda: string;
}

export default function TimelinessCard({
    isLoading,
    isSaved,
    useManual,
    setUseManual,
    timelinessData,
    scoringPeriod,
    manualTimeliness,
    setManualTimeliness,
    realMonthlyReports,
    handleSave,
    selectedMda
}: TimelinessCardProps) {
    return (
        <div className="w-full md:w-1/2 flex flex-col items-center bg-gray-100/50 p-4 rounded-lg">
            <div className="flex justify-between items-center gap-2 w-full mb-4">
                <div className="flex items-center gap-2">
                    <div>
                        <h2 className="text-lg font-semibold">Deadline Compliance</h2>
                        <p className="text-sm text-gray-600">Track on-time submissions</p>
                    </div>
                    {isLoading && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                            🔄 Loading...
                        </span>
                    )}
                    {!isLoading && isSaved && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            💾 Saved
                        </span>
                    )}
                </div>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    2 Points
                </span>
            </div>

            {/* Timelines Toggle */}
            <div className="flex gap-4 mb-3 w-full">
                <label className="flex items-center">
                    <input
                        type="radio"
                        name="timeliness-mode"
                        checked={!useManual}
                        onChange={() => setUseManual(false)}
                        className="mr-2"
                    />
                    Automatic
                </label>
                <label className="flex items-center">
                    <input
                        type="radio"
                        name="timeliness-mode"
                        checked={useManual}
                        onChange={() => setUseManual(true)}
                        className="mr-2"
                    />
                    Manual
                </label>
            </div>

            <div className="w-full bg-gray-50 p-4 rounded-md mb-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Progress:</span>
                    <span className="text-sm font-semibold">{timelinessData.onTime}/{timelinessData.total} On Time</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${timelinessData.percentage}%` }}
                    ></div>
                </div>
            </div>

            <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-4">
                {getMonthsForPeriod(scoringPeriod).map((periodMonth, index) => {
                    const monthName = new Date(periodMonth.year, periodMonth.month, 1)
                        .toLocaleString('default', { month: 'short' });
                    const monthKey = `${periodMonth.year}-${periodMonth.month}`;

                    if (useManual) {
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
                        // Find report for this month
                        const monthReport = realMonthlyReports?.find(report => {
                            const reportDate = new Date(report.deadline);
                            return reportDate.getMonth() === periodMonth.month &&
                                reportDate.getFullYear() === periodMonth.year;
                        });

                        const isOnTime = monthReport?.onTime || false;
                        const isSubmitted = monthReport?.submitted || false;

                        return (
                            <div key={index} className={`p-2 rounded-md text-center ${isOnTime
                                ? 'bg-green-100 text-green-800'
                                : isSubmitted
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                <div className="font-medium">{monthName}</div>
                                <div className="text-xs">
                                    {isOnTime ? 'Early/On Time' : (isSubmitted ? 'Late' : 'Not Submitted')}
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
                    value={useManual ?
                        (Object.values(manualTimeliness).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 100 :
                        timelinessData.percentage}
                    readOnly
                    className="flex-1 accent-blue-500 border-none"
                />
                <div className="w-20 flex items-center justify-center">
                    <span className="text-sm text-gray-500 font-semibold">
                        {useManual ?
                            ((Object.values(manualTimeliness).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 100).toFixed(0) :
                            timelinessData.percentage.toFixed(0)}%
                    </span>
                </div>
                <div className="bg-gray-100 px-3 py-1 text-center rounded-md text-sm">
                    {useManual ?
                        ((Object.values(manualTimeliness).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 2).toFixed(1) :
                        timelinessData.score.toFixed(1)}/2
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={!selectedMda}
                className={`w-full py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors ${!selectedMda
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                    }`}
            >
                💾 Save Timeliness Data
            </button>
        </div>
    );
}
