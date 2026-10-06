'use client';

import React from 'react';
import { BarChart3, CalendarDays } from 'lucide-react';
import ScoreActionButtons from './ScoreActionButtons';
import MetricStatusBadge from './MetricStatusBadge';

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
    scoreBreakdown: { resolutionRate: number; responseTime: number; resolutionTime: number };

    handleSave: () => void;
    handleClear?: () => void;
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
    scoreBreakdown,
    handleSave,
    handleClear,
    selectedMda,
    mdasList,
    mdasWithScores,
    periodTicketData,
    maxPoints = 15 // Default to 15 for backward compatibility
}: ReportGovCardProps) {
    // Local state for toggling manual input (removed)
    const [useManual, setUseManual] = React.useState(false);
    const periodYear = scoringPeriod.match(/\d{4}/)?.[0] || String(currentYear);
    const adjustedResolutionRate: number | null = ticketResolutionData?.adjustedResolutionRate ?? null;
    const totalTickets: number = ticketResolutionData?.totalTickets || 0;
    const resolvedTickets: number = ticketResolutionData?.resolvedTickets || 0;
    const averageResponseTime: number = ticketResolutionData?.averageResponseTime || 0;
    const averageResolutionTime: number = ticketResolutionData?.averageResolutionTime || 0;

    const selectedMdaFromList = mdasList.find(m => m.name === selectedMda);
    const isActiveOnPlatform = !!mdasWithScores?.find(m =>
        m.name === selectedMda ||
        (selectedMdaFromList && m.name === `${selectedMdaFromList.abbreviation} - ${selectedMda}`) ||
        m.name.includes(selectedMda) ||
        (selectedMdaFromList && selectedMda.includes(m.name.replace(/^[^-]+ - /, '')))
    );

    const formatMonth = (timestamp: number) =>
        new Date(timestamp).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    const periodLabel = periodTicketData?.startDate && periodTicketData?.endDate
        ? `${formatMonth(periodTicketData.startDate)} – ${formatMonth(periodTicketData.endDate)}`
        : scoringPeriod.includes("1st Half") ? `Jan – Jun ${periodYear}`
            : scoringPeriod.includes("2nd Half") ? `Jul – Dec ${periodYear}`
                : scoringPeriod;

    const formatHours = (hours: number) => (hours > 0 ? `${hours.toFixed(1)} hrs` : '—');

    const rows = [
        {
            label: 'Resolution Rate',
            value: `${(adjustedResolutionRate ?? ticketResolutionData?.resolutionRate ?? 0).toFixed(1)}%`,
            points: scoreBreakdown.resolutionRate,
            max: maxPoints * 0.4667,
        },
        { label: 'Avg Response Time', value: formatHours(averageResponseTime), points: scoreBreakdown.responseTime, max: maxPoints * 0.20 },
        { label: 'Avg Resolution Time', value: formatHours(averageResolutionTime), points: scoreBreakdown.resolutionTime, max: maxPoints * 0.3333 },
    ];

    return (
        <div className="bg-gray-100/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Report Gov Resolution</h2>
                    <MetricStatusBadge isLoading={isLoading} isSaved={isSaved} />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowRanking(true)}
                        className="inline-flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
                        title="View all MDAs ranked by Report Gov Resolution score"
                    >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Rankings
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

            <div className="text-sm mb-3 space-y-3">
                <div className="flex justify-between text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {periodLabel}
                    </span>
                    <span>{totalTickets} tickets · {resolvedTickets} resolved</span>
                </div>

                {selectedMda && !isActiveOnPlatform && (
                    <p className="text-xs text-amber-700">This MDA is not active on the platform, so it has no tickets.</p>
                )}

                <table className="w-full text-sm">
                    <tbody>
                        {rows.map(row => (
                            <tr key={row.label} className="border-b border-gray-200 last:border-0">
                                <td className="py-1.5">{row.label}</td>
                                <td className="py-1.5 text-right text-gray-600">{row.value}</td>
                                <td className="py-1.5 text-right font-medium w-28">
                                    {row.points.toFixed(2)} / {row.max.toFixed(1)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ScoreActionButtons
                onSave={handleSave}
                onClear={handleClear}
                saveLabel="Save Score"
                disabled={!selectedMda}
                isSaved={isSaved}
            />

            <div className="text-center mt-3 font-semibold">
                Score: {reportgovRate.toFixed(2)} / {maxPoints}
            </div>
        </div>
    );
}
