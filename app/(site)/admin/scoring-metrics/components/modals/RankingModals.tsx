import React from 'react';

/**
 * Props for Ranking Modal Components
 */
interface RankingModalProps {
    showModal: boolean;
    onClose: () => void;
    scoringPeriod: string;
    currentYear: number;
}

interface MysteryRankingModalProps extends RankingModalProps {
    mysteryRankings: any[] | undefined;
}

interface SLARankingModalProps extends RankingModalProps {
    slaRankings: any[] | undefined;
}

interface ReportGovRankingModalProps extends RankingModalProps {
    reportGovRankings: any[] | undefined;
}

/**
 * Mystery Shopping Ranking Modal Component
 * Displays ranked list of MDAs by mystery shopping scores
 */
export const MysteryShoppingRankingModal: React.FC<MysteryRankingModalProps> = ({
    showModal,
    onClose,
    mysteryRankings,
    scoringPeriod,
    currentYear
}) => {
    if (!showModal) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl max-h-screen overflow-y-auto bg-white rounded-lg shadow-xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
                >
                    &times;
                </button>

                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4 text-center">Mystery Shopping Rankings</h2>
                    <p className="text-center text-gray-600 mb-6">Year {scoringPeriod.match(/\d{4}/)?.[0] || currentYear} - Averaged across both halves</p>

                    {mysteryRankings && Array.isArray(mysteryRankings) && mysteryRankings.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MDA Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Score</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mystery Type</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {(mysteryRankings || []).map((item: any, index: number) => (
                                        <tr key={item.mdaName} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                #{index + 1}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.mdaName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className="font-semibold">{item.totalScore.toFixed(1)}/20</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`font-semibold ${item.percentage >= 90 ? 'text-green-600' :
                                                    item.percentage >= 80 ? 'text-blue-600' :
                                                        item.percentage >= 70 ? 'text-yellow-600' :
                                                            'text-red-600'
                                                    }`}>
                                                    {item.percentage.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.mysteryType === 'hasReportGov' ? 'Has Report.gov' : 'No Report.gov'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <p>No mystery shopping rankings available for this period.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * SLA Ranking Modal Component
 * Displays ranked list of MDAs by SLA scores
 */
export const SLARankingModal: React.FC<SLARankingModalProps> = ({
    showModal,
    onClose,
    slaRankings,
    scoringPeriod,
    currentYear
}) => {
    if (!showModal) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl max-h-screen overflow-y-auto bg-white rounded-lg shadow-xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
                >
                    &times;
                </button>

                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4 text-center">SLA Rankings</h2>
                    <p className="text-center text-gray-600 mb-6">Year {scoringPeriod.match(/\d{4}/)?.[0] || currentYear} - Averaged across both halves</p>

                    {slaRankings && Array.isArray(slaRankings) && slaRankings.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MDA Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Score</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Months Completed</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {(slaRankings || []).map((item: any, index: number) => (
                                        <tr key={item.mdaName} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                #{index + 1}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.mdaName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className="font-semibold">{item.totalScore.toFixed(1)}/30</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`font-semibold ${item.percentage >= 90 ? 'text-green-600' :
                                                    item.percentage >= 80 ? 'text-blue-600' :
                                                        item.percentage >= 70 ? 'text-yellow-600' :
                                                            'text-red-600'
                                                    }`}>
                                                    {item.percentage.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.monthsWithData}/{item.totalMonths}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <p>No SLA rankings available for this period.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Report Gov Resolution Ranking Modal Component
 * Displays ranked list of MDAs by Report Gov Resolution performance
 */
export const ReportGovRankingModal: React.FC<ReportGovRankingModalProps> = ({
    showModal,
    onClose,
    reportGovRankings,
    scoringPeriod,
    currentYear
}) => {
    if (!showModal) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-5xl max-h-screen overflow-y-auto bg-white rounded-lg shadow-xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
                >
                    &times;
                </button>

                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4 text-center">Report Gov Resolution Rankings</h2>
                    <p className="text-center text-gray-600 mb-6">Year {scoringPeriod.match(/\d{4}/)?.[0] || currentYear} - Averaged across both halves</p>

                    {reportGovRankings && Array.isArray(reportGovRankings) && reportGovRankings.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MDA Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resolution Rate</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Response Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Resolution Time</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {(reportGovRankings || []).map((item: any, index: number) => (
                                        <tr key={item.mdaName} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                #{index + 1}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {item.mdaName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`font-semibold ${item.score >= 13.5 ? 'text-green-600' :
                                                    item.score >= 12 ? 'text-blue-600' :
                                                        item.score >= 10.5 ? 'text-yellow-600' :
                                                            'text-red-600'
                                                    }`}>
                                                    {item.score.toFixed(1)}/15
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.resolutionRate.toFixed(1)}% ({item.resolvedTickets}/{item.totalTickets})
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.averageResponseTime.toFixed(1)}h
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {item.averageResolutionTime.toFixed(1)}h
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <p>No Report Gov Resolution rankings available for this period.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
