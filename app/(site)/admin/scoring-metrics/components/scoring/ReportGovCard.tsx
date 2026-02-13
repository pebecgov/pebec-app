'use client';

import React from 'react';
import { Save } from 'lucide-react';

interface ReportGovCardProps {
    isLoading: boolean;
    isSaved: boolean;
    setShowRanking: (show: boolean) => void;
    skip: boolean;
    setSkip: (val: boolean) => void;
    scoringPeriod: string;
    currentYear: number;
    ticketResolutionData: any;
    reportgovRate: number;
    setReportgovRate: (val: number) => void;

    handleSave: () => void;
    selectedMda: string;
    mdasList: any[];
    mdasWithScores: any[] | undefined;
    periodTicketData: any;
    maxPoints: number;
}

export default function ReportGovCard({
    isLoading,
    isSaved,
    setShowRanking,
    skip,
    setSkip,
    scoringPeriod,
    currentYear,
    ticketResolutionData,
    reportgovRate,
    setReportgovRate,
    handleSave,
    selectedMda,
    mdasList,
    mdasWithScores,
    periodTicketData,
    maxPoints = 15 // Default to 15 for backward compatibility
}: ReportGovCardProps) {
    // Local state for toggling manual input (removed)
    const [useManual, setUseManual] = React.useState(false);
    const periodYear = scoringPeriod.match(/\d{4}/)?.[0] || String(currentYear);

    // Logic to determine data source text
    const getDataSourceText = () => {
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
    };

    const getPeriodDataText = () => {
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
            : 'No data found';
    };

    return (
        <div className="bg-gray-100/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Report Gov Resolution</h2>
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
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowRanking(true)}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
                        title="View all MDAs ranked by Report Gov Resolution score"
                    >
                        📊 Rankings
                    </button>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {maxPoints} Points
                    </span>
                </div>
            </div>

            {/* Toggle between automatic and skip */}
            <div className="flex gap-4 mb-3">
                <label className="flex items-center">
                    <input
                        type="radio"
                        name="reportgov-mode"
                        checked={!skip}
                        onChange={() => {
                            setUseManual(false);
                            setSkip(false);
                        }}
                        className="mr-2"
                    />
                    Automatic
                </label>
                <label className="flex items-center">
                    <input
                        type="radio"
                        name="reportgov-mode"
                        checked={skip}
                        onChange={() => {
                            setSkip(true);
                            setUseManual(false);
                        }}
                        className="mr-2"
                    />
                    Skip (0 points)
                </label>
            </div>

            <div className="text-sm mb-3">
                <p className="text-xs text-blue-600 mb-2">
                    📅 Evaluating: {scoringPeriod.includes("1st Half") ? `Jan-Jun ${periodYear}` :
                        scoringPeriod.includes("2nd Half") ? `Jul-Dec ${periodYear}` : "All Periods"}
                </p>
                <p>Total Tickets: {ticketResolutionData?.totalTickets || 0}</p>
                <p>Resolved: {ticketResolutionData?.resolvedTickets || 0}</p>
                <p>Resolution Rate: {(ticketResolutionData?.resolutionRate || 0).toFixed(1)}%</p>
                <p className="text-xs text-gray-500">
                    Data Source: {getDataSourceText()}
                </p>
                <p className="text-xs text-gray-500">
                    Period Data: {getPeriodDataText()}
                </p>
                <p>Avg Response Time: {(ticketResolutionData?.averageResponseTime || 0).toFixed(1)} hours</p>
                <p>Avg Resolution Time: {(ticketResolutionData?.averageResolutionTime || 0).toFixed(1)} hours</p>
                <p className="text-xs text-gray-500 mt-2">
                    <strong>Score Breakdown (Total: {maxPoints} pts):</strong><br />
                    • Resolution Rate ({(maxPoints * 0.4667).toFixed(1)} pts)<br />
                    • Response Time ({(maxPoints * 0.20).toFixed(1)} pts)<br />
                    • Resolution Time ({(maxPoints * 0.3333).toFixed(1)} pts)
                </p>
            </div>

            <div className="flex justify-center w-full mt-4">
                <button
                    onClick={handleSave}
                    disabled={!selectedMda}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-white text-sm font-medium transition-all duration-300 shadow-sm ${!selectedMda
                        ? 'bg-gray-400 cursor-not-allowed opacity-70'
                        : 'bg-green-600 hover:bg-green-700 hover:shadow-md active:scale-[0.99]'
                        }`}
                >
                    <Save className="w-4 h-4" />
                    Save Report Gov Data
                </button>
            </div>

            <div className="text-center mt-3">
                Score: {reportgovRate.toFixed(2)}/{maxPoints}
            </div>
        </div>
    );
}
