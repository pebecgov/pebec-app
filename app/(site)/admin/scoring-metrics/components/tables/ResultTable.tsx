import React from 'react';
import { ResultTableProps } from '../../utils/types';

/**
 * Result Table Component
 * Displays SLA scoring results with performance metrics
 */
export const ResultTable: React.FC<ResultTableProps> = ({ results, overallPercentage }) => {
    if (!results || results.length === 0) return null;

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
                                {Object.keys(results[0]).map((key) => (
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
                            {results.map((row, i) => (
                                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                    {Object.entries(row).map(([key, value], j) => (
                                        <td
                                            key={j}
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
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
