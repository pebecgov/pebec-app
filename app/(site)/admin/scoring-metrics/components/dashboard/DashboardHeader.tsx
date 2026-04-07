'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BulkPdfDownloader } from '@/components/Admin/BulkPdfDownloader';

interface DashboardHeaderProps {
    selectedMetric: string;
    setSelectedMetric: (metric: string) => void;
    mdaFilter: 'all' | 'withData';
    setMdaFilter: (filter: 'all' | 'withData') => void;
    ministryFilter: 'all' | 'ministries-only' | 'without-ministries';
    setMinistryFilter: (filter: 'all' | 'ministries-only' | 'without-ministries') => void;
    dashboardYear: number;
    setDashboardYear: (year: number) => void;
    currentYear: number;
    handleGenerateDashboardPDF: () => void;
    liveDashboardData: any | undefined;
    processDashboardMdaData: (filter: 'all' | 'withData', ministryFilter: 'all' | 'ministries-only' | 'without-ministries') => any[];
    othersConfig: any;
    penaltyConfig: any;
}

export default function DashboardHeader({
    selectedMetric,
    setSelectedMetric,
    mdaFilter,
    setMdaFilter,
    ministryFilter,
    setMinistryFilter,
    dashboardYear,
    setDashboardYear,
    currentYear,
    handleGenerateDashboardPDF,
    liveDashboardData,
    processDashboardMdaData,
    othersConfig,
    penaltyConfig
}: DashboardHeaderProps) {
    return (
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">Dashboard Controls</h2>
                <p className="text-xs sm:text-sm text-gray-600 mb-4">Filter and compare scoring performance by metric, organization type, and year.</p>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="w-[240px]">
                        <p className="text-xs text-gray-500 mb-1">Select Metric</p>
                        <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select metric" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="totalScore">Total Score (All Metrics)</SelectItem>
                                <SelectItem value="mysteryShopping">Mystery Shopping</SelectItem>
                                {dashboardYear < 2026 && (
                                    <SelectItem value="sla">Service Level Agreement</SelectItem>
                                )}

                                {dashboardYear < 2026 ? [
                                    <SelectItem key="controversial" value="controversial">Controversial</SelectItem>,
                                    <SelectItem key="innovation" value="innovation">Innovation</SelectItem>,
                                    <SelectItem key="stakeholder" value="stakeholder">Stakeholder Engagement</SelectItem>,
                                    <SelectItem key="transparency" value="transparency">Transparency</SelectItem>,
                                    <SelectItem key="toutingRentseeking" value="toutingRentseeking">Touting & Rentseeking</SelectItem>
                                ] : [
                                    <SelectItem key="efficiency" value="efficiency">Efficiency (SLA + Reporting + Timeliness)</SelectItem>,
                                    ...(Array.isArray(othersConfig)
                                        ? othersConfig.map((item: any) => (
                                            <SelectItem key={`others:${item.itemId}`} value={`others:${item.itemId}`}>
                                                {item.itemName}
                                            </SelectItem>
                                        ))
                                        : []),
                                    <SelectItem key="penalties" value="penalties">Penalties (Dynamic)</SelectItem>
                                ]}

                                <SelectItem value="reportGovResolution">Report Gov Resolution</SelectItem>
                                {dashboardYear < 2026 && (
                                    <>
                                        <SelectItem value="monthlyReport">Monthly Report Submission</SelectItem>
                                        <SelectItem value="timeliness">Timeliness</SelectItem>
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-[180px]">
                        <p className="text-xs text-gray-500 mb-1">Filter MDAs</p>
                        <Select value={mdaFilter} onValueChange={(value) => setMdaFilter(value as 'all' | 'withData')}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filter MDAs" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All MDAs</SelectItem>
                                <SelectItem value="withData">MDAs with Data</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-[200px]">
                        <p className="text-xs text-gray-500 mb-1">Ministry Filter</p>
                        <Select value={ministryFilter} onValueChange={(value) => setMinistryFilter(value as 'all' | 'ministries-only' | 'without-ministries')}>
                            <SelectTrigger>
                                <SelectValue placeholder="Ministry Filter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Organizations</SelectItem>
                                <SelectItem value="ministries-only">Ministries Only</SelectItem>
                                <SelectItem value="without-ministries">Exclude Ministries</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="w-[120px]">
                        <p className="text-xs text-gray-500 mb-1">Year</p>
                        <Select value={String(dashboardYear)} onValueChange={(value) => setDashboardYear(Number(value))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <button
                        onClick={handleGenerateDashboardPDF}
                        disabled={!liveDashboardData?.data || !Array.isArray(liveDashboardData.data) || liveDashboardData.data.length === 0}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap h-10"
                    >
                        📥 Download PDF
                    </button>
                    <BulkPdfDownloader
                        mdaData={processDashboardMdaData(mdaFilter, ministryFilter)}
                        year={dashboardYear}
                    />
                </div>
            </div>
         
        </div>
    );
}
