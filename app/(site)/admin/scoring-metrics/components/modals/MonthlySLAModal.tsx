'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { MenuItem, Select } from "@mui/material";
import {
    isLikelyNonSpreadsheetFile,
    nonSpreadsheetFileMessage,
    processExcelBufferFull,
    sanitizeRowsForConvex,
} from '@/lib/mdaReportProcessing';
import { formatFailureType } from '@/lib/ingestionMatrix';
import { getMonthsForPeriod } from '../../utils/helpers';
import { MonthlySlaData, SlaFileCheck } from '../../utils/types';
import { ResultTable } from '../tables/ResultTable';

type FileCheckOutcome =
    | { ok: true; results: any[]; overallPercentage: number | null; check: SlaFileCheck }
    | { ok: false; check: SlaFileCheck };

// ... imports
interface MonthlySLAModalProps {
    show: boolean;
    onHide: () => void;
    scoringPeriod: string;
    monthlySlaData: MonthlySlaData;
    setMonthlySlaData: React.Dispatch<React.SetStateAction<MonthlySlaData>>;
    currentYear: number;
    periodMonths?: Array<{ month: number; year: number; monthName: string }>;
    pointsPerMonth?: number;
    maxPoints?: number;
    mdaName?: string; // Add mdaName prop
}

export default function MonthlySLAModal({
    show,
    onHide,
    scoringPeriod,
    monthlySlaData,
    setMonthlySlaData,
    currentYear,
    periodMonths,
    pointsPerMonth = 5,
    maxPoints = 30,
    mdaName = "" // Default
}: MonthlySLAModalProps) {
    const [processingMonthlyFiles, setProcessingMonthlyFiles] = useState<Record<string, boolean>>({});
    const [isAutoProcessing, setIsAutoProcessing] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [viewResults, setViewResults] = useState<any[]>([]);
    const [viewOverallPercentage, setViewOverallPercentage] = useState<number | null>(null);

    const processMonthlyReportFromDB = useAction(api.ai_helper_scoring.processMonthlyReportFromDB);

    // Files that fail the date check are not scored
    const toMonthEntry = (outcome: FileCheckOutcome, file: File | null): MonthlySlaData[string] => ({
        method: 'file',
        file,
        rating: 0,
        results: outcome.ok ? outcome.results : [],
        overallPercentage: outcome.ok ? outcome.overallPercentage : null,
        score: outcome.ok && outcome.overallPercentage ? (outcome.overallPercentage / 100) * pointsPerMonth : 0,
        check: outcome.check,
    });

    const checkUploadedFile = async (file: File): Promise<FileCheckOutcome> => {
        if (isLikelyNonSpreadsheetFile(file.name)) {
            return {
                ok: false,
                check: { status: 'failed', failureType: 'unsupported_format', message: nonSpreadsheetFileMessage(file.name) },
            };
        }
        const parsed = processExcelBufferFull(await file.arrayBuffer(), file.name);
        if (!parsed.ok) {
            return {
                ok: false,
                check: {
                    status: 'failed',
                    failureType: parsed.failureType,
                    message: parsed.failureDetail,
                    validRows: parsed.validRowCount,
                    totalRows: parsed.totalRowCount,
                },
            };
        }
        return {
            ok: true,
            results: sanitizeRowsForConvex(parsed.processedData),
            overallPercentage: parsed.overallPercentage,
            check: { status: parsed.processingQuality === 'partial_success' ? 'partial_success' : 'success', validRows: parsed.validRowCount, totalRows: parsed.totalRowCount },
        };
    };

    const handleFileUpload = async (file: File, monthKey: string, monthName: string) => {
        setProcessingMonthlyFiles(prev => ({ ...prev, [monthKey]: true }));
        try {
            const outcome = await checkUploadedFile(file);
            setMonthlySlaData(prev => ({ ...prev, [monthKey]: toMonthEntry(outcome, file) }));
            if (outcome.ok) {
                toast.success(`${monthName} processed`);
            } else {
                toast.error(`${monthName}: file failed the check and was not scored`);
            }
        } catch (error) {
            toast.error(`Error: ${(error as Error).message}`);
        } finally {
            setProcessingMonthlyFiles(prev => ({ ...prev, [monthKey]: false }));
        }
    };

    const handleAutoProcess = async () => {
        if (!mdaName) {
            toast.error("MDA Name is missing");
            return;
        }

        setIsAutoProcessing(true);
        const months = periodMonths || getMonthsForPeriod(scoringPeriod);
        let processedCount = 0;
        let skippedCount = 0;
        let failCount = 0;

        toast.info(`Starting auto-process for ${months.length} months...`);

        // Process sequentially to avoid overwhelming the server or client
        for (const month of months) {
            const monthKey = `${month.year}-${month.month}`;

            // Visual feedback
            setProcessingMonthlyFiles(prev => ({ ...prev, [monthKey]: true }));

            try {
                const result = await processMonthlyReportFromDB({
                    mdaName,
                    month: month.month,
                    year: month.year
                });

                if (result.success) {
                    const outcome: FileCheckOutcome = {
                        ok: true,
                        results: result.results ?? [],
                        overallPercentage: result.overallPercentage ?? null,
                        check: {
                            status: result.processingQuality === 'partial_success' ? 'partial_success' : 'success',
                            validRows: result.validRowCount,
                            totalRows: result.totalRowCount,
                        },
                    };
                    setMonthlySlaData(prev => ({ ...prev, [monthKey]: toMonthEntry(outcome, null) }));
                    processedCount++;
                } else if (result.reason === 'not_found' || result.reason === 'no_file') {
                    skippedCount++;
                } else {
                    const outcome: FileCheckOutcome = {
                        ok: false,
                        check: {
                            status: 'failed',
                            failureType: result.reason,
                            message: result.message,
                            validRows: result.validRowCount,
                            totalRows: result.totalRowCount,
                        },
                    };
                    setMonthlySlaData(prev => ({ ...prev, [monthKey]: toMonthEntry(outcome, null) }));
                    failCount++;
                }
            } catch (error) {
                console.error(`Error processing ${month.monthName}:`, error);
                failCount++;
            } finally {
                setProcessingMonthlyFiles(prev => ({ ...prev, [monthKey]: false }));
            }
        }

        setIsAutoProcessing(false);
        if (processedCount > 0) {
            toast.success(`Auto-process complete: ${processedCount} processed, ${skippedCount} skipped, ${failCount} failed.`);
        } else if (failCount > 0) {
            toast.error(`Auto-process finished with errors: ${failCount} failed.`);
        } else {
            toast.info(`Auto-process complete: No reports found to process.`);
        }
    };

    // ... calculateStats ...

    const calculateStats = () => {
        const months = periodMonths || getMonthsForPeriod(scoringPeriod);
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

        const percentage = maxPoints > 0 ? (totalScore / maxPoints) * 100 : 0;

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
                    <div className="text-center mb-6 relative">
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">Monthly SLA Scoring</h1>
                        <p className="text-gray-600">{scoringPeriod} - {pointsPerMonth.toFixed(1)} points per month</p>

                        {/* Auto Process Button */}
                        <div className="absolute right-0 top-0 hidden md:block">
                            <button
                                onClick={handleAutoProcess}
                                disabled={isAutoProcessing}
                                className={`flex items-center gap-2 px-4 py-2 rounded text-white text-sm font-medium transition-colors ${isAutoProcessing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                            >
                                {isAutoProcessing ? (
                                    <>
                                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="h-4 w-4" />
                                        Auto-Process All
                                    </>
                                )}
                            </button>
                        </div>
                        {/* Mobile button visible below title */}
                        <div className="mt-2 md:hidden">
                            <button
                                onClick={handleAutoProcess}
                                disabled={isAutoProcessing}
                                className={`flex items-center justify-center gap-2 w-full px-4 py-2 rounded text-white text-sm font-medium transition-colors ${isAutoProcessing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                            >
                                {isAutoProcessing ? 'Processing...' : <><Zap className="h-4 w-4" />Auto-Process All</>}
                            </button>
                        </div>
                    </div>

                    {/* Monthly SLA Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {(periodMonths || getMonthsForPeriod(scoringPeriod)).map((periodMonth, index) => {
                            const monthName = periodMonth.monthName || new Date(periodMonth.year, periodMonth.month, 1)
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
                                            {pointsPerMonth.toFixed(1)} Points
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
                                                                overallPercentage: null,
                                                                check: undefined
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
                                                    e.target.value = '';
                                                    if (file) void handleFileUpload(file, monthKey, monthName);
                                                }}
                                                accept=".xlsx, .xls, .xlsm, .csv"
                                                className="w-full text-sm"
                                            />
                                            <div className="text-xs text-gray-500">Excel or CSV files only</div>
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
                                                            score: (rating / 10) * pointsPerMonth
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
                                                        ? (monthData.overallPercentage !== null
                                                            ? `${monthData.overallPercentage.toFixed(1)}%`
                                                            : monthData.check?.status === 'failed' ? 'Not scored' : 'N/A')
                                                        : `${((monthData.rating / 10) * pointsPerMonth).toFixed(1)}/${pointsPerMonth.toFixed(1)}`
                                                    }
                                                </div>
                                                {monthData.method === 'file' && monthData.check && (
                                                    <FileCheckSummary check={monthData.check} />
                                                )}
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
                                    {stats.totalScore.toFixed(1)}/{maxPoints}
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

function FileCheckSummary({ check }: { check: SlaFileCheck }) {
    const rowsText = check.totalRows ? `${check.validRows ?? 0}/${check.totalRows} rows with valid dates` : null;

    if (check.status === 'failed') {
        return (
            <div className="mt-2 text-left text-xs text-red-700 space-y-1">
                <div className="flex items-center gap-1 font-medium">
                    <XCircle className="h-3.5 w-3.5 shrink-0" />
                    Failed: {formatFailureType(check.failureType ?? 'unknown')}
                </div>
                {rowsText && <div>{rowsText}</div>}
                {check.message && (
                    <details>
                        <summary className="cursor-pointer text-red-600">Why?</summary>
                        <p className="mt-1 max-h-32 overflow-y-auto break-words text-gray-700">{check.message}</p>
                    </details>
                )}
            </div>
        );
    }

    const isPartial = check.status === 'partial_success';
    return (
        <div className={`mt-2 flex items-center justify-center gap-1 text-xs ${isPartial ? 'text-amber-700' : 'text-green-700'}`}>
            {isPartial ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
            {isPartial ? 'Partial' : 'Dates OK'}{rowsText ? ` · ${rowsText}` : ''}
        </div>
    );
}
