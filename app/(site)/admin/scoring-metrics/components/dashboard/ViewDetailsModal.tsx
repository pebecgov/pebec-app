'use client';

import React, { useEffect } from 'react';
import { useConvex, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface ViewDetailsModalProps {
    viewDetailsMda: string | null;
    setViewDetailsMda: (mda: string | null) => void;
    viewDetailsRow: any | null;
    setViewDetailsRow: (row: any | null) => void;
    viewDetailsData: any | null;
    setViewDetailsData: (data: any | null) => void;
    isLoadingDetails: boolean;
    setIsLoadingDetails: (loading: boolean) => void;
    dashboardYear: number;
}

export default function ViewDetailsModal({
    viewDetailsMda,
    setViewDetailsMda,
    viewDetailsRow,
    setViewDetailsRow,
    viewDetailsData,
    setViewDetailsData,
    isLoadingDetails,
    setIsLoadingDetails,
    dashboardYear
}: ViewDetailsModalProps) {
    const convex = useConvex();
    const allConfigs = useQuery(api.scoring_config.getAllConfigurationsForYear, { year: dashboardYear });
    const othersItems = allConfigs?.othersItems || [];
    const penaltyItems = allConfigs?.penaltyItems || [];
    const bonusItems = allConfigs?.bonusItems || [];

    const formatScore = (value: unknown, digits = 1) =>
        typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "N/A";
    const formatNumericOrZero = (value: unknown, digits = 1) =>
        typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : (0).toFixed(digits);
    const formatText = (value: unknown) => {
        if (value === null || value === undefined) return "N/A";
        if (typeof value === "boolean") return value ? "Yes" : "No";
        return String(value);
    };
    const hasAnyData = (...items: any[]) => items.some((item) => item && typeof item === "object");
    const pickTotal = (metric: any) => {
        if (dashboardYear >= 2026) return metric?.fullYear || null;
        return metric?.fullYear || metric?.secondHalf || metric?.firstHalf || null;
    };
    const normalizeMdaKey = (name: string) =>
        String(name || "")
            .toLowerCase()
            .replace(/[–—]/g, "-")
            .replace(/\s+/g, " ")
            .trim();
    const splitMdaNameForMatch = (name: string) => {
        const normalized = normalizeMdaKey(name);
        const parts = normalized.split(" - ").map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
            return { abbr: parts[0], fullName: parts.slice(1).join(" - ") };
        }
        return { fullName: normalized };
    };
    const excludedMetrics = React.useMemo(() => {
        if (!viewDetailsMda || !allConfigs?.metricExclusions) return new Set<string>();
        const rows = allConfigs.metricExclusions as Array<{ mdaName: string; excludedMetrics: string[] }>;
        const lookup = new Map<string, Set<string>>();
        rows.forEach((row) => {
            const set = new Set(row.excludedMetrics || []);
            const normalized = normalizeMdaKey(row.mdaName);
            const parts = splitMdaNameForMatch(row.mdaName);
            lookup.set(normalized, set);
            if (parts.fullName) lookup.set(parts.fullName, set);
            if (parts.abbr) lookup.set(parts.abbr, set);
        });
        const normalized = normalizeMdaKey(viewDetailsMda);
        const parts = splitMdaNameForMatch(viewDetailsMda);
        return lookup.get(normalized) || lookup.get(parts.fullName) || (parts.abbr ? lookup.get(parts.abbr) : undefined) || new Set<string>();
    }, [viewDetailsMda, allConfigs]);
    const isExcluded = (metric: string) => excludedMetrics.has(metric);
    const isOthersItemExcluded = (itemId: string) =>
        excludedMetrics.has("others") || excludedMetrics.has(`others:${itemId}`);
    const dashboardRow = viewDetailsRow;
    const cardClass = "rounded-xl border border-slate-200 bg-white shadow-sm p-4";

    // Fetch detailed data when MDA is selected
    useEffect(() => {
        if (viewDetailsMda && isLoadingDetails) {
            (async () => {
                try {
                    const detailedData = await convex.query(
                        api.mda_scoring.getMdaDetailedScoringData,
                        { mdaName: viewDetailsMda, year: dashboardYear }
                    );
                    setViewDetailsData(detailedData);
                } catch (error) {
                    console.error('Error fetching detailed data:', error);
                    setViewDetailsData(null);
                } finally {
                    setIsLoadingDetails(false);
                }
            })();
        }
    }, [viewDetailsMda, isLoadingDetails, dashboardYear, convex, setViewDetailsData, setIsLoadingDetails]);

    if (!viewDetailsMda) return null;

    const closeModal = () => {
        setViewDetailsMda(null);
        setViewDetailsRow(null);
        setViewDetailsData(null);
        setIsLoadingDetails(false);
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4"
            onClick={closeModal}
        >
            <div
                className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-50 rounded-2xl shadow-2xl border border-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={closeModal}
                    className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 text-2xl font-bold z-10"
                >
                    &times;
                </button>
                <div className="p-6">
                    {isLoadingDetails ? (
                        <div className="text-center py-8">
                            <p className="text-gray-500">Loading detailed data...</p>
                        </div>
                    ) : viewDetailsData ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-5 md:col-span-2 shadow-sm">
                                    <h2 className="text-xl sm:text-2xl font-bold">
                                        {viewDetailsData.mdaName || viewDetailsMda}
                                    </h2>
                                    <p className="text-sm text-emerald-50 mt-1">Detailed Scoring Report - {dashboardYear}</p>
                                </div>
                                <div className={`${cardClass} flex flex-col justify-center`}>
                                    <p className="text-xs text-slate-500">Year</p>
                                    <p className="font-semibold text-slate-800">{dashboardYear}</p>
                                    <p className="text-xs text-slate-500 mt-3">Mode</p>
                                    <p className="font-semibold text-slate-800">{dashboardYear >= 2026 ? "Full-Year Metrics" : "Legacy Metrics"}</p>
                                </div>
                            </div>

                            {(() => {
                                const sla = pickTotal(viewDetailsData.sla);
                                const mystery = pickTotal(viewDetailsData.mysteryShopping);
                                const reportGov = pickTotal(viewDetailsData.reportGovResolution);
                                const monthlyReport = pickTotal(viewDetailsData.monthlyReport);
                                const timeliness = pickTotal(viewDetailsData.timeliness);
                                const innovation = pickTotal(viewDetailsData.innovation);
                                const stakeholder = pickTotal(viewDetailsData.stakeholder);
                                const transparency = pickTotal(viewDetailsData.transparency);
                                const controversial = pickTotal(viewDetailsData.controversial);
                                const touting = pickTotal(viewDetailsData.toutingRentseeking);
                                const others = pickTotal(viewDetailsData.others);
                                const penalties = pickTotal(viewDetailsData.penalties);
                                const bonuses = pickTotal(viewDetailsData.bonuses);
                                const efficiencyConfig = (allConfigs?.efficiencyPeriod ?? null) as
                                    | {
                                        slaPoints?: number;
                                        reportGovPoints?: number;
                                        reportSubmissionPoints?: number;
                                        timelinessPoints?: number;
                                    }
                                    | null;

                                const safeNumber = (value: unknown) =>
                                    typeof value === "number" && Number.isFinite(value) ? value : 0;

                                return (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {!isExcluded("sla") && (
                                    <div className={cardClass}>
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900">SLA (Efficiency)</h3>
                                            <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                Max 30
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Score</p>
                                                <p className="text-base font-semibold text-slate-900">{formatScore(dashboardRow?.sla?.score ?? sla?.totalScore)}</p>
                                            </div>
                                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Months With Data</p>
                                                <p className="text-base font-semibold text-slate-900">{formatText(dashboardRow?.sla?.monthsWithData ?? sla?.monthsWithData)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isExcluded("mystery") && (
                                    <div className={cardClass}>
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900">Mystery Shopping</h3>
                                            <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                                                Max 20
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Score</p>
                                                <p className="text-base font-semibold text-slate-900">
                                                    {formatScore(dashboardRow?.mysteryShopping?.score ?? mystery?.totalScore)}
                                                </p>
                                            </div>
                                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Percentage</p>
                                                <p className="text-base font-semibold text-slate-900">
                                                    {typeof (dashboardRow?.mysteryShopping?.percentage ?? mystery?.percentage) === "number"
                                                        ? `${formatScore(dashboardRow?.mysteryShopping?.percentage ?? mystery?.percentage)}%`
                                                        : "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isExcluded("reportGov") && (
                                    <div className={cardClass}>
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900">Report Gov Resolution</h3>
                                            <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                                                Max 15
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Score</p>
                                                <p className="text-base font-semibold text-slate-900">{formatScore(dashboardRow?.reportGovResolution?.score ?? reportGov?.score)}</p>
                                            </div>
                                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Skipped</p>
                                                <p className="text-base font-semibold text-slate-900">{formatText(Boolean(reportGov?.isSkipped))}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isExcluded("reportSubmission") && (
                                    <div className={cardClass}>
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900">Monthly Report Submission</h3>
                                            <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                                Max 3
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Score</p>
                                                <p className="text-base font-semibold text-slate-900">{formatScore(dashboardRow?.monthlyReport?.score ?? monthlyReport?.score)}</p>
                                            </div>
                                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Months With Data</p>
                                                <p className="text-base font-semibold text-slate-900">{formatText(dashboardRow?.monthlyReport?.monthsWithData ?? monthlyReport?.monthsWithData)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isExcluded("timeliness") && (
                                    <div className={cardClass}>
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900">Timeliness</h3>
                                            <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                Max 2
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Score</p>
                                                <p className="text-base font-semibold text-slate-900">{formatScore(dashboardRow?.timeliness?.score ?? timeliness?.score)}</p>
                                            </div>
                                            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Months With Data</p>
                                                <p className="text-base font-semibold text-slate-900">{formatText(dashboardRow?.timeliness?.monthsWithData ?? timeliness?.monthsWithData)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {dashboardYear === 2025 && (
                                    <div className={cardClass}>
                                        <h3 className="font-semibold text-gray-900 mb-3">Legacy Metrics (2025)</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {!isExcluded("innovation") && <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"><p className="text-[11px] uppercase tracking-wide text-slate-500">Innovation</p><p className="text-base font-semibold text-slate-900">{formatScore(innovation?.score)} / 5</p></div>}
                                            {!isExcluded("stakeholder") && <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"><p className="text-[11px] uppercase tracking-wide text-slate-500">Stakeholder</p><p className="text-base font-semibold text-slate-900">{formatScore(stakeholder?.score)} / 10</p></div>}
                                            {!isExcluded("transparency") && <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"><p className="text-[11px] uppercase tracking-wide text-slate-500">Transparency</p><p className="text-base font-semibold text-slate-900">{formatScore(transparency?.score)} / 5</p></div>}
                                            {!isExcluded("controversial") && <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"><p className="text-[11px] uppercase tracking-wide text-slate-500">Controversial</p><p className="text-base font-semibold text-slate-900">{formatScore(controversial?.score)}</p></div>}
                                            {!isExcluded("toutingRentseeking") && <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"><p className="text-[11px] uppercase tracking-wide text-slate-500">Touting & Rentseeking</p><p className="text-base font-semibold text-slate-900">{formatScore(touting?.score)}</p></div>}
                                        </div>
                                    </div>
                                )}

                                {dashboardYear >= 2026 && (
                                    <div className={`${cardClass} lg:col-span-2`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900">Others (Independent Items)</h3>
                                            <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                                Dynamic
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {othersItems.map((item: any) => {
                                                if (isOthersItemExcluded(item.itemId)) return null;
                                                const itemScore = others?.scores?.[item.itemId];
                                                const itemValue = others?.values?.[item.itemId];
                                                return (
                                                    <div key={item.itemId} className="rounded-xl border border-slate-200 p-3 bg-gradient-to-b from-white to-slate-50 shadow-sm">
                                                        <div className="flex items-center justify-between gap-2 mb-2">
                                                            <p className="text-sm font-semibold text-gray-900">{item.itemName}</p>
                                                            <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                                                Weight {formatText(item.weight)}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Score</p>
                                                                <p className="text-sm font-semibold text-slate-900">{formatNumericOrZero(itemScore)} / {formatText(item.weight)}</p>
                                                            </div>
                                                            <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                                                <p className="text-[11px] uppercase tracking-wide text-slate-500">Value</p>
                                                                <p className="text-sm font-semibold text-slate-900">{itemValue === null || itemValue === undefined ? "Not set" : formatText(itemValue)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {othersItems.length === 0 && (
                                                <p className="text-sm text-gray-500">No Others items configured.</p>
                                            )}
                                        </div>
                                        <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Others Score</p>
                                            <p className="text-base font-semibold text-slate-900">{formatNumericOrZero(dashboardRow?.others?.score ?? others?.totalScore)}</p>
                                        </div>
                                    </div>
                                )}

                                {dashboardYear >= 2026 && !isExcluded("penalties") && (
                                    <div className={`${cardClass} lg:col-span-2`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900">Penalties</h3>
                                            <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                                Deductions
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {penaltyItems.map((item: any) => {
                                                const active = penalties?.values?.[item.penaltyId] === true;
                                                return (
                                                    <div key={item.penaltyId} className="rounded-xl border border-slate-200 p-3 bg-gradient-to-b from-white to-rose-50/40 shadow-sm">
                                                        <div className="flex items-center justify-between gap-2 mb-2">
                                                            <p className="text-sm font-semibold text-gray-900">{item.penaltyName}</p>
                                                            <span className={`text-[11px] font-medium px-2 py-1 rounded-full border ${active ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                                                                {active ? "Applied" : "Not Applied"}
                                                            </span>
                                                        </div>
                                                        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Penalty Value</p>
                                                            <p className={`text-sm font-semibold ${active ? "text-rose-700" : "text-slate-900"}`}>
                                                                {active ? formatText(item.penaltyValue) : "0"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {penaltyItems.length === 0 && (
                                                <p className="text-sm text-gray-500">No penalty items configured.</p>
                                            )}
                                        </div>
                                        <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Penalty</p>
                                            <p className="text-base font-semibold text-slate-900">{formatNumericOrZero(dashboardRow?.penalties?.score ?? penalties?.totalPenalty)}</p>
                                        </div>
                                    </div>
                                )}

                                {dashboardYear >= 2026 && !isExcluded("bonuses") && (
                                    <div className={`${cardClass} lg:col-span-2`}>
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900">Bonuses</h3>
                                            <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                Extra Points
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {bonusItems.map((item: any) => {
                                                const active = bonuses?.values?.[item.bonusId] === true;
                                                return (
                                                    <div key={item.bonusId} className="rounded-xl border border-slate-200 p-3 bg-gradient-to-b from-white to-emerald-50/40 shadow-sm">
                                                        <div className="flex items-center justify-between gap-2 mb-2">
                                                            <p className="text-sm font-semibold text-gray-900">{item.bonusName}</p>
                                                            <span className={`text-[11px] font-medium px-2 py-1 rounded-full border ${active ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                                                                {active ? "Applied" : "Not Applied"}
                                                            </span>
                                                        </div>
                                                        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                                                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Bonus Value</p>
                                                            <p className={`text-sm font-semibold ${active ? "text-emerald-700" : "text-slate-900"}`}>
                                                                {active ? `+${formatText(item.bonusValue)}` : "0"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {bonusItems.length === 0 && (
                                                <p className="text-sm text-gray-500">No bonus items configured.</p>
                                            )}
                                        </div>
                                        <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                            <p className="text-[11px] uppercase tracking-wide text-slate-500">Total Bonus</p>
                                            <p className="text-base font-semibold text-emerald-700">{formatNumericOrZero(dashboardRow?.bonuses?.score ?? bonuses?.totalBonus)}</p>
                                        </div>
                                    </div>
                                )}

                                <div className={`${cardClass} lg:col-span-2`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-semibold text-gray-900">Score Summary</h3>
                                        <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            Final Computation
                                        </span>
                                    </div>
                                    {(() => {
                                        let grossScore = 0;
                                        let maxPossiblePoints = 0;
                                        let penaltyDeduction = 0;
                                        let bonusAddition = 0;

                                        if (dashboardYear >= 2026) {
                                            const slaPoints = safeNumber(efficiencyConfig?.slaPoints) || 30;
                                            const reportGovPoints = safeNumber(efficiencyConfig?.reportGovPoints) || 15;
                                            const reportSubmissionPoints = safeNumber(efficiencyConfig?.reportSubmissionPoints) || 3;
                                            const timelinessPoints = safeNumber(efficiencyConfig?.timelinessPoints) || 2;
                                            const mysteryPoints = 20;
                                            const othersTotalPoints = (othersItems || []).reduce(
                                                (sum: number, item: any) => sum + (safeNumber(item?.weight) || 0),
                                                0
                                            );

                                            if (!isExcluded("sla")) {
                                                grossScore += safeNumber(sla?.totalScore);
                                                maxPossiblePoints += slaPoints;
                                            }
                                            if (!isExcluded("mystery")) {
                                                grossScore += safeNumber(mystery?.totalScore);
                                                maxPossiblePoints += mysteryPoints;
                                            }
                                            if (!isExcluded("reportGov")) {
                                                grossScore += safeNumber(reportGov?.score);
                                                maxPossiblePoints += reportGovPoints;
                                            }
                                            if (!isExcluded("reportSubmission")) {
                                                grossScore += safeNumber(monthlyReport?.score);
                                                maxPossiblePoints += reportSubmissionPoints;
                                            }
                                            if (!isExcluded("timeliness")) {
                                                grossScore += safeNumber(timeliness?.score);
                                                maxPossiblePoints += timelinessPoints;
                                            }
                                            if (!isExcluded("others")) {
                                                grossScore += safeNumber(others?.totalScore);
                                                maxPossiblePoints += othersTotalPoints;
                                            }

                                            penaltyDeduction = isExcluded("penalties")
                                                ? 0
                                                : Math.abs(safeNumber(penalties?.totalPenalty));
                                            bonusAddition = isExcluded("bonuses")
                                                ? 0
                                                : Math.abs(safeNumber(bonuses?.totalBonus));
                                        } else {
                                            if (!isExcluded("sla")) {
                                                grossScore += safeNumber(sla?.totalScore);
                                                maxPossiblePoints += 30;
                                            }
                                            if (!isExcluded("mystery")) {
                                                grossScore += safeNumber(mystery?.totalScore);
                                                maxPossiblePoints += 20;
                                            }
                                            if (!isExcluded("innovation")) {
                                                grossScore += safeNumber(innovation?.score);
                                                maxPossiblePoints += 5;
                                            }
                                            if (!isExcluded("stakeholder")) {
                                                grossScore += safeNumber(stakeholder?.score);
                                                maxPossiblePoints += 10;
                                            }
                                            if (!isExcluded("transparency")) {
                                                grossScore += safeNumber(transparency?.score);
                                                maxPossiblePoints += 5;
                                            }
                                            if (!isExcluded("reportGov")) {
                                                grossScore += safeNumber(reportGov?.score);
                                                maxPossiblePoints += 15;
                                            }
                                            if (!isExcluded("reportSubmission")) {
                                                grossScore += safeNumber(monthlyReport?.score);
                                                maxPossiblePoints += 3;
                                            }
                                            if (!isExcluded("timeliness")) {
                                                grossScore += safeNumber(timeliness?.score);
                                                maxPossiblePoints += 2;
                                            }

                                            const controversialPenalty = isExcluded("controversial")
                                                ? 0
                                                : Math.abs(Math.min(0, safeNumber(controversial?.score)));
                                            const toutingPenalty = isExcluded("toutingRentseeking")
                                                ? 0
                                                : Math.abs(Math.min(0, safeNumber(touting?.score)));
                                            penaltyDeduction = controversialPenalty + toutingPenalty;
                                        }

                                        const finalScore = grossScore + bonusAddition - penaltyDeduction;
                                        const percentage = maxPossiblePoints > 0 ? (finalScore / maxPossiblePoints) * 100 : 0;

                                        const tableGross = safeNumber(dashboardRow?.totalGrossScore);
                                        const tableFinal = safeNumber(dashboardRow?.totalScore);
                                        const tableMax = safeNumber(dashboardRow?.maxPossiblePoints);
                                        const tablePct = safeNumber(dashboardRow?.totalPercentage);
                                        const beforePenalty = dashboardRow ? tableGross : grossScore;
                                        const afterPenalty = dashboardRow ? tableFinal : finalScore;
                                        const maxPointsDisplay = dashboardRow ? tableMax : maxPossiblePoints;
                                        const percentDisplay = dashboardRow ? tablePct : percentage;
                                        const penaltyDisplay = dashboardRow
                                            ? Math.abs(safeNumber(dashboardRow?.penalties?.score))
                                            : penaltyDeduction;
                                        const bonusDisplay = dashboardRow
                                            ? Math.abs(safeNumber(dashboardRow?.bonuses?.score))
                                            : bonusAddition;

                                        return (
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Metrics Total</p>
                                                    <p className="text-base font-semibold text-slate-900">{formatNumericOrZero(beforePenalty)}</p>
                                                </div>
                                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Bonus</p>
                                                    <p className="text-base font-semibold text-emerald-700">+{formatNumericOrZero(bonusDisplay)}</p>
                                                </div>
                                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Penalty</p>
                                                    <p className="text-base font-semibold text-rose-700">-{formatNumericOrZero(penaltyDisplay)}</p>
                                                </div>
                                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Final Score</p>
                                                    <p className="text-base font-semibold text-slate-900">
                                                        {formatNumericOrZero(afterPenalty)} / {formatNumericOrZero(maxPointsDisplay)}
                                                    </p>
                                                </div>
                                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Percentage</p>
                                                    <p className="text-base font-semibold text-emerald-700">{formatNumericOrZero(percentDisplay)}%</p>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                    </div>
                                );
                            })()}

                            {!hasAnyData(
                                !isExcluded("sla") ? pickTotal(viewDetailsData.sla) : null,
                                !isExcluded("mystery") ? pickTotal(viewDetailsData.mysteryShopping) : null,
                                !isExcluded("reportGov") ? pickTotal(viewDetailsData.reportGovResolution) : null,
                                !isExcluded("reportSubmission") ? pickTotal(viewDetailsData.monthlyReport) : null,
                                !isExcluded("timeliness") ? pickTotal(viewDetailsData.timeliness) : null,
                                !isExcluded("others") ? pickTotal(viewDetailsData.others) : null,
                                !isExcluded("penalties") ? pickTotal(viewDetailsData.penalties) : null,
                                !isExcluded("bonuses") ? pickTotal(viewDetailsData.bonuses) : null,
                                dashboardYear === 2025 && !isExcluded("innovation") ? pickTotal(viewDetailsData.innovation) : null,
                                dashboardYear === 2025 && !isExcluded("stakeholder") ? pickTotal(viewDetailsData.stakeholder) : null,
                                dashboardYear === 2025 && !isExcluded("transparency") ? pickTotal(viewDetailsData.transparency) : null,
                                dashboardYear === 2025 && !isExcluded("controversial") ? pickTotal(viewDetailsData.controversial) : null,
                                dashboardYear === 2025 && !isExcluded("toutingRentseeking") ? pickTotal(viewDetailsData.toutingRentseeking) : null
                            ) && (
                                <div className="text-center py-4 border rounded-lg bg-gray-50 text-gray-500">
                                    No metric entries found for this MDA in {dashboardYear}.
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-gray-500">No data available for this MDA</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
