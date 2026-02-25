import React from 'react';
import { ResultTableProps } from '../../utils/types';

/**
 * Result Table Component
 * Displays SLA scoring results with performance metrics
 */
export const ResultTable: React.FC<ResultTableProps> = ({ results, overallPercentage }) => {
    if (!results || results.length === 0) return null;

    const allKeys = Object.keys(results[0]);
    const ignoredKeys = ['__EMPTY']; // Add more if needed

    // Define preferred order
    const columnOrder = [
        'SN',
        'S/N',
        'CUSTOMER NAME',
        'CUSTOMERS NAME',
        'SERVICE PROVIDED',
        'DATE OF SUBMISSION',
        'DATE OF COMPLETION',
        'EXPECTED TIMELINE',
        'ACTUAL WORKING DAYS',
        'STATUS',
        'PERFORMANCE %',
        'COST',
        'APPROVED/REJECTED',
        'RESOLUTION DECISION',
        'EMAIL ADDRESS',
        'PHONE NO',
        'HOUSE ADDRESS',
        'ANY ISSUE (GRIEVANCE /COMPLAINT/OTHERS'
    ];

    // Filter and sort keys
    const sortedKeys = allKeys
        .filter(key => !key.startsWith('__EMPTY') && !ignoredKeys.includes(key))
        .sort((a, b) => {
            const indexA = columnOrder.indexOf(a);
            const indexB = columnOrder.indexOf(b);

            // Valid columns come first in specific order
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            // Remaining columns alphabetically
            return a.localeCompare(b);
        });

    // Sort the rows by SN or S/N
    const sortedResults = [...results].sort((a, b) => {
        const snA = a['SN'] || a['S/N'];
        const snB = b['SN'] || b['S/N'];

        // Try numeric sort first
        const numA = parseFloat(String(snA));
        const numB = parseFloat(String(snB));

        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }

        // Fallback to string sort
        return String(snA || '').localeCompare(String(snB || ''));
    });

    return (
        <div className="container mx-auto p-4 max-w-6xl">
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <div className="flex items-center justify-end mb-4">
                    {overallPercentage !== null && (
                        <div className="bg-blue-100 px-4 py-2 rounded-lg mr-4">
                            <span className="font-bold">Overall Performance: </span>
                            <span className="text-blue-800 font-bold text-lg">
                                {overallPercentage.toFixed(2)}%
                            </span>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto shadow rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {sortedKeys.map((key) => (
                                    <th
                                        key={key}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                    >
                                        {key}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedResults.map((row, i) => {
                                return (
                                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                        {sortedKeys.map((key) => {
                                            const value = row[key];
                                            return (
                                                <td
                                                    key={key}
                                                    className={`px-6 py-4 whitespace-nowrap text-sm ${key === "STATUS"
                                                        ? value === "Delayed"
                                                            ? "text-red-600 font-bold"
                                                            : "text-green-600 font-bold"
                                                        : key === "PERFORMANCE %"
                                                            ? String(value).includes("N/A")
                                                                ? "text-gray-500"
                                                                : parseFloat(String(value)) >= 90
                                                                    ? "text-green-600 font-bold"
                                                                    : parseFloat(String(value)) >= 80
                                                                        ? "text-yellow-600 font-bold"
                                                                        : "text-red-600 font-bold"
                                                            : "text-gray-700"
                                                        }`}
                                                >
                                                    {value === null ? "N/A" : String(value)}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
