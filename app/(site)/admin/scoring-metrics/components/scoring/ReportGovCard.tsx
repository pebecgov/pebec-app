'use client';

import React from 'react';

interface ReportGovCardProps {
    isLoading: boolean;
    isSaved: boolean;
    setShowRanking: (show: boolean) => void;
    useManual: boolean;
    setUseManual: (val: boolean) => void;
    skip: boolean;
    setSkip: (val: boolean) => void;
    scoringPeriod: string;
    currentYear: number;
    ticketResolutionData: any;
    reportgovRate: number;
    setReportgovRate: (val: number) => void;

    // Manual inputs
    manualTotalTickets: number;
    setManualTotalTickets: (val: number) => void;
    manualResolvedTickets: number;
    setManualResolvedTickets: (val: number) => void;
    manualAverageResponseTime: number;
    setManualAverageResponseTime: (val: number) => void;
    manualAverageResolutionTime: number;
    setManualAverageResolutionTime: (val: number) => void;

    calculateManualRate: () => number;
    manualRate: number;
    setManualRate: (val: number) => void;

    handleSave: () => void;
    selectedMda: string;
    mdasList: any[];
    mdasWithScores: any[] | undefined;
    periodTicketData: any;
}

export default function ReportGovCard({
    isLoading,
    isSaved,
    setShowRanking,
    useManual,
    setUseManual,
    skip,
    setSkip,
    scoringPeriod,
    currentYear,
    ticketResolutionData,
    reportgovRate,
    setReportgovRate,
    manualTotalTickets,
    setManualTotalTickets,
    manualResolvedTickets,
    setManualResolvedTickets,
    manualAverageResponseTime,
    setManualAverageResponseTime,
    manualAverageResolutionTime,
    setManualAverageResolutionTime,
    calculateManualRate,
    manualRate,
    setManualRate,
    handleSave,
    selectedMda,
    mdasList,
    mdasWithScores,
    periodTicketData
}: ReportGovCardProps) {
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
            : 'Use manual input below';
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
                        15 Points
                    </span>
                </div>
            </div>

            {/* Toggle between automatic, manual, and skip */}
            <div className="flex gap-4 mb-3">
                <label className="flex items-center">
                    <input
                        type="radio"
                        name="reportgov-mode"
                        checked={!useManual && !skip}
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
                        checked={useManual && !skip}
                        onChange={() => {
                            setUseManual(true);
                            setSkip(false);
                        }}
                        className="mr-2"
                    />
                    Manual
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

            {!useManual ? (
                <>
                    <div className="text-sm mb-3">
                        <p className="text-xs text-blue-600 mb-2">
                            📅 Evaluating: {scoringPeriod.includes("1st Half") ? `Jan-Jun ${periodYear}` :
                                scoringPeriod.includes("2nd Half") ? `Jul-Dec ${periodYear}` : "All Periods"}
                        </p>
                        <p>Total Tickets: {ticketResolutionData.totalTickets}</p>
                        <p>Resolved: {ticketResolutionData.resolvedTickets}</p>
                        <p>Resolution Rate: {ticketResolutionData.resolutionRate.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">
                            Data Source: {getDataSourceText()}
                        </p>
                        <p className="text-xs text-gray-500">
                            Period Data: {getPeriodDataText()}
                        </p>
                        <p>Avg Response Time: {ticketResolutionData.averageResponseTime.toFixed(1)} hours</p>
                        <p>Avg Resolution Time: {ticketResolutionData.averageResolutionTime.toFixed(1)} hours</p>
                        <p className="text-xs text-gray-500">
                            Scoring: Resolution Rate (7pts) + Response Time (3pts) + Resolution Time (5pts)
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setReportgovRate(ticketResolutionData.score)}
                            className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
                        >
                            Calculate Score
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!selectedMda}
                            className={`px-4 py-2 rounded text-white text-sm font-medium transition-colors duration-300 ${!selectedMda
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                        >
                            💾 Save
                        </button>
                    </div>
                </>
            ) : (
                <div className="space-y-3">
                    <div className="text-sm mb-3">
                        <p className="text-xs text-blue-600 mb-2">
                            📅 Manual Input for: {scoringPeriod.includes("1st Half") ? `Jan-Jun ${periodYear}` :
                                scoringPeriod.includes("2nd Half") ? `Jul-Dec ${periodYear}` : "All Periods"}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Total Tickets</label>
                            <input
                                type="number"
                                min="0"
                                value={manualTotalTickets}
                                onChange={(e) => setManualTotalTickets(Number(e.target.value))}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Resolved Tickets</label>
                            <input
                                type="number"
                                min="0"
                                max={manualTotalTickets}
                                value={manualResolvedTickets}
                                onChange={(e) => {
                                    const value = Number(e.target.value);
                                    if (value > manualTotalTickets) {
                                        setManualResolvedTickets(manualTotalTickets);
                                    } else {
                                        setManualResolvedTickets(value);
                                    }
                                }}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Avg Response Time (hours)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={manualAverageResponseTime}
                                onChange={(e) => setManualAverageResponseTime(Number(e.target.value))}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Avg Resolution Time (hours)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={manualAverageResolutionTime}
                                onChange={(e) => setManualAverageResolutionTime(Number(e.target.value))}
                                className="w-full border rounded px-3 py-2"
                            />
                        </div>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                        <p>Resolution Rate: {manualTotalTickets > 0 ? ((manualResolvedTickets / manualTotalTickets) * 100).toFixed(1) : 0}%</p>
                        <p>Scoring: Resolution Rate (7pts) + Response Time (3pts) + Resolution Time (5pts)</p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setManualRate(calculateManualRate())}
                            className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600"
                        >
                            Calculate Manual Score
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!selectedMda}
                            className={`px-4 py-2 rounded text-white text-sm font-medium transition-colors duration-300 ${!selectedMda
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-500 hover:bg-blue-600'
                                }`}
                        >
                            💾 Save
                        </button>
                    </div>
                </div>
            )}

            <div className="text-center mt-3">
                Score: {useManual ? manualRate.toFixed(1) : reportgovRate.toFixed(1)}/15
            </div>
        </div>
    );
}
