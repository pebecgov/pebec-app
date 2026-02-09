'use client';

import React, { useState } from 'react';
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { MenuItem, Select } from "@mui/material";
import * as XLSX from "xlsx";
import { getMonthsForPeriod } from '../../utils/helpers';
import { MonthlySlaData } from '../../utils/types';
import { ResultTable } from '../tables/ResultTable';

interface MonthlySLAModalProps {
    show: boolean;
    onHide: () => void;
    scoringPeriod: string;
    monthlySlaData: MonthlySlaData;
    setMonthlySlaData: React.Dispatch<React.SetStateAction<MonthlySlaData>>;
    currentYear: number;
}

export default function MonthlySLAModal({
    show,
    onHide,
    scoringPeriod,
    monthlySlaData,
    setMonthlySlaData,
    currentYear
}: MonthlySLAModalProps) {
    const [processingMonthlyFiles, setProcessingMonthlyFiles] = useState<Record<string, boolean>>({});
    const [showResultModal, setShowResultModal] = useState(false);
    const [viewResults, setViewResults] = useState<any[]>([]);
    const [viewOverallPercentage, setViewOverallPercentage] = useState<number | null>(null);

    const matchHeaders = useAction(api.ai_helper_scoring.matchHeaders);
    const processSlaData = useAction(api.ai_helper_scoring.processSlaData);

    const calculateStats = () => {
        const months = getMonthsForPeriod(scoringPeriod);
        const totalMonths = months.length;
        let monthsWithData = 0;
        let totalScore = 0;

        months.forEach(month => {
            const key = `${month.year}-${month.month}`;
            const data = monthlySlaData[key];
            if (data && (data.method === 'file' ? data.overallPercentage !== null : data.rating > 0)) {
                monthsWithData++;
                totalScore += data.score;
            }
        });

        const percentage = totalMonths > 0 ? (totalScore / (totalMonths * 5)) * 100 : 0;

        return { totalScore, monthsWithData, totalMonths, percentage };
    };

    const stats = calculateStats();

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-6xl max-h-screen overflow-y-auto bg-white rounded-lg shadow-xl">
                <button
                    onClick={onHide}
                    className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
                >
                    &times;
                </button>

                <div className="p-6">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Monthly SLA Scoring</h1>
                        <p className="text-gray-600">{scoringPeriod} - 5 points per month</p>
                    </div>

                    {/* Monthly SLA Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {getMonthsForPeriod(scoringPeriod).map((periodMonth, index) => {
                            const monthName = new Date(periodMonth.year, periodMonth.month, 1)
                                .toLocaleString('default', { month: 'long' });
                            const monthKey = `${periodMonth.year}-${periodMonth.month}`;
                            const monthData = monthlySlaData[monthKey] || {
                                method: 'file',
                                file: null,
                                rating: 0,
                                score: 0,
                                results: [],
                                overallPercentage: null
                            };

                            return (
                                <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-semibold text-lg">{monthName}</h3>
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                                            5 Points
                                        </span>
                                    </div>

                                    {!processingMonthlyFiles[monthKey] && (
                                        <div className="flex gap-2 mb-3">
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name={`sla-method-${monthKey}`}
                                                    value="file"
                                                    checked={monthData.method === 'file'}
                                                    onChange={() => {
                                                        setMonthlySlaData(prev => ({
                                                            ...prev,
                                                            [monthKey]: {
                                                                ...prev[monthKey] || {},
                                                                method: 'file',
                                                                rating: 0,
                                                                score: 0 // Reset score on switch? The original code implies reset explicitly or implicitly
                                                            }
                                                        } as any));
                                                    }}
                                                    className="mr-1"
                                                />
                                                File
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name={`sla-method-${monthKey}`}
                                                    value="rating"
                                                    checked={monthData.method === 'rating'}
                                                    onChange={() => {
                                                        setMonthlySlaData(prev => ({
                                                            ...prev,
                                                            [monthKey]: {
                                                                ...prev[monthKey] || {},
                                                                method: 'rating',
                                                                file: null,
                                                                results: [],
                                                                overallPercentage: null
                                                            }
                                                        } as any));
                                                    }}
                                                    className="mr-1"
                                                />
                                                Rating
                                            </label>
                                        </div>
                                    )}

                                    {monthData.method === 'file' ? (
                                        <div className="space-y-2">
                                            <input
                                                type="file"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setProcessingMonthlyFiles(prev => ({ ...prev, [monthKey]: true }));

                                                        const reader = new FileReader();
                                                        reader.onload = async (event) => {
                                                            try {
                                                                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                                                                const workbook = XLSX.read(data, { type: 'array' });
                                                                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                                                                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                                                                if (jsonData.length === 0) {
                                                                    toast.error("No data found in the Excel file");
                                                                    setProcessingMonthlyFiles(prev => ({ ...prev, [monthKey]: false }));
                                                                    return;
                                                                }

                                                                const headers = Object.keys(jsonData[0] as Record<string, any>);
                                                                const headerResult = await matchHeaders({ headers, data: jsonData });
                                                                if (!headerResult.success) toast.warning("⚠️ AI header matching failed");

                                                                const processResult = await processSlaData({
                                                                    data: jsonData,
                                                                    headerMapping: headerResult.headerMapping as any
                                                                });

                                                                if (processResult.success) {
                                                                    setMonthlySlaData(prev => ({
                                                                        ...prev,
                                                                        [monthKey]: {
                                                                            method: 'file',
                                                                            file: file,
                                                                            rating: 0,
                                                                            overallPercentage: processResult.overallPercentage,
                                                                            results: processResult.processedData,
                                                                            score: processResult.overallPercentage ? (processResult.overallPercentage / 100) * 5 : 0
                                                                        }
                                                                    }));
                                                                    toast.success(`✅ ${monthName} processed`);
                                                                } else {
                                                                    toast.error(`Processing failed: ${processResult.error}`);
                                                                }
                                                            } catch (error) {
                                                                toast.error(`Error: ${(error as Error).message}`);
                                                            } finally {
                                                                setProcessingMonthlyFiles(prev => ({ ...prev, [monthKey]: false }));
                                                            }
                                                        };
                                                        reader.readAsArrayBuffer(file);
                                                    }
                                                }}
                                                accept=".xlsx, .xls"
                                                className="w-full text-sm"
                                            />
                                            <div className="text-xs text-gray-500">Excel files only</div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Select
                                                value={monthData.rating || 0}
                                                onChange={(e) => {
                                                    const rating = Number(e.target.value);
                                                    setMonthlySlaData(prev => ({
                                                        ...prev,
                                                        [monthKey]: {
                                                            ...prev[monthKey] || {},
                                                            method: 'rating',
                                                            rating: rating,
                                                            score: (rating / 10) * 5
                                                        } as any
                                                    }));
                                                }}
                                                className="w-full"
                                                size="small"
                                            >
                                                {[...Array(11)].map((_, i) => (
                                                    <MenuItem key={i} value={i}>{i}</MenuItem>
                                                ))}
                                            </Select>
                                        </div>
                                    )}

                                    <div className="mt-3 p-2 bg-gray-100 rounded text-center">
                                        {processingMonthlyFiles[monthKey] ? (
                                            <div className="flex flex-col items-center space-y-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                                <div className="text-xs text-gray-600">Processing...</div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-sm font-medium">
                                                    Score: {monthData.method === 'file'
                                                        ? (monthData.overallPercentage !== null ? `${monthData.overallPercentage.toFixed(1)}%` : 'N/A')
                                                        : `${((monthData.rating / 10) * 5).toFixed(1)}/5`
                                                    }
                                                </div>
                                                {monthData.method === 'file' && monthData.results && monthData.results.length > 0 && (
                                                    <>
                                                        <div className="text-xs text-gray-600 mt-1">
                                                            {monthData.results.length} rows
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setViewResults(monthData.results);
                                                                setViewOverallPercentage(monthData.overallPercentage);
                                                                setShowResultModal(true);
                                                            }}
                                                            className="mt-2 bg-green-500 px-2 py-1 rounded text-white hover:bg-green-600 text-xs"
                                                        >
                                                            View Results
                                                        </button>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Overall Score Summary */}
                    <div className="bg-blue-50 p-4 rounded-lg mb-6">
                        <h3 className="font-semibold text-blue-800 mb-2">Overall SLA Score Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="font-medium">Total Score:</span>
                                <div className="text-lg font-bold text-blue-600">
                                    {stats.totalScore.toFixed(1)}/30
                                </div>
                            </div>
                            <div>
                                <span className="font-medium">Months Completed:</span>
                                <div className="text-lg font-bold text-blue-600">
                                    {stats.monthsWithData}/{stats.totalMonths}
                                </div>
                            </div>
                            <div>
                                <span className="font-medium">Percentage:</span>
                                <div className="text-lg font-bold text-blue-600">
                                    {stats.percentage.toFixed(1)}%
                                </div>
                            </div>
                            <div>
                                <span className="font-medium">Status:</span>
                                <div className={`text-lg font-bold ${stats.percentage >= 80 ? 'text-green-600' :
                                    stats.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                    {stats.percentage >= 80 ? 'Excellent' :
                                        stats.percentage >= 60 ? 'Good' : 'Needs Improvement'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4">
                        <button
                            onClick={onHide}
                            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-lg"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Nested Result Modal */}
            {showResultModal && (
                <div className="fixed inset-0 z-[60] bg-black bg-opacity-40 flex items-center justify-center px-4">
                    <div className="relative w-full max-w-6xl max-h-screen overflow-y-auto bg-white p-6 rounded-lg shadow-xl">
                        <button
                            onClick={() => setShowResultModal(false)}
                            className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold z-10"
                        >
                            &times;
                        </button>
                        <ResultTable
                            results={viewResults}
                            overallPercentage={viewOverallPercentage}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
