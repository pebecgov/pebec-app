'use client';

import React from 'react';
import { getMonthsForPeriod } from '../../utils/helpers';

interface MonthlyReportCardProps {
    isLoading: boolean;
    isSaved: boolean;
    useManual: boolean;
    setUseManual: (val: boolean) => void;
    monthlyReportData: {
        submitted: number;
        total: number;
        percentage: number;
        score: number;
    };
    scoringPeriod: string;
    manualMonthlyReports: Record<string, boolean>;
    setManualMonthlyReports: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    realMonthlyReports: any[] | undefined;
    handleSave: () => void;
    selectedMda: string;
}

export default function MonthlyReportCard({
    isLoading,
    isSaved,
    useManual,
    setUseManual,
    monthlyReportData,
    scoringPeriod,
    manualMonthlyReports,
    setManualMonthlyReports,
    realMonthlyReports,
    handleSave,
    selectedMda
}: MonthlyReportCardProps) {
    return (
        <div className="w-full md:w-1/2 flex flex-col items-center bg-gray-100/50 p-4 rounded-lg">
            <div className="flex justify-between items-center gap-2 w-full mb-4">
                <div className="flex items-center gap-2">
                    <div>
                        <h2 className="text-lg font-semibold">Monthly Report Submission</h2>
                        <p className="text-sm text-gray-600">Track submission of monthly reports</p>
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
                    3 Points
                </span>
            </div>

            {/* Toggle between automatic and manual */}
            <div className="flex gap-4 mb-3 w-full">
                <label className="flex items-center">
                    <input
                        type="radio"
                        name="monthly-mode"
                        checked={!useManual}
                        onChange={() => setUseManual(false)}
                        className="mr-2"
                    />
                    Automatic
                </label>
                <label className="flex items-center">
                    <input
                        type="radio"
                        name="monthly-mode"
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

                    if (useManual) {
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
                                            monthReport = {
                                                deadline: new Date().getTime(), // value doesn't matter much for display
                                                submitted: true,
                                                onTime: false, // will be ignored for submission check
                                                submittedDate: matchingReport.submittedAt,
                                                reports: [matchingReport]
                                            } as any;
                                        } else {
                                            monthReport = reportGroup;
                                        }
                                        break;
                                    }
                                }
                            }
                        }

                        const isSubmitted = monthReport?.submitted || false;

                        return (
                            <div key={index} className={`p-2 rounded-md text-center ${isSubmitted
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
                    value={useManual ?
                        (Object.values(manualMonthlyReports).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 100 :
                        monthlyReportData.percentage}
                    readOnly
                    className="flex-1 accent-green-500 border-none"
                />
                <div className="w-20 flex items-center justify-center">
                    <span className="text-sm text-gray-500 font-semibold">
                        {useManual ?
                            ((Object.values(manualMonthlyReports).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 100).toFixed(0) :
                            monthlyReportData.percentage.toFixed(0)}%
                    </span>
                </div>
                <div className="bg-gray-100 px-3 py-1 text-center rounded-md text-sm">
                    {useManual ?
                        ((Object.values(manualMonthlyReports).filter(Boolean).length / getMonthsForPeriod(scoringPeriod).length) * 3).toFixed(1) :
                        monthlyReportData.score.toFixed(1)}/3
                </div>
            </div>
            <button
                onClick={handleSave}
                disabled={!selectedMda}
                className={`w-full mb-4 py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors ${!selectedMda
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                    }`}
            >
                💾 Save Monthly Report Data
            </button>
        </div>
    );
}
