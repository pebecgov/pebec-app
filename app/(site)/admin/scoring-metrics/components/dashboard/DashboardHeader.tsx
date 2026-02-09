'use client';

import React from 'react';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
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
    liveDashboardData: any[] | undefined;
    processDashboardMdaData: (filter: 'all' | 'withData', ministryFilter: 'all' | 'ministries-only' | 'without-ministries') => any[];
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
    processDashboardMdaData
}: DashboardHeaderProps) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Live Scoring Dashboard</h2>
                <div className="flex flex-wrap items-center gap-3">
                    <FormControl sx={{ minWidth: 200, flexShrink: 0 }} variant="outlined" size="small">
                        <InputLabel id="metric-label">Select Metric</InputLabel>
                        <Select
                            labelId="metric-label"
                            id="metric-select"
                            value={selectedMetric}
                            onChange={(e) => setSelectedMetric(e.target.value)}
                            label="Select Metric"
                        >
                            <MenuItem value="totalScore">Total Score (All Metrics)</MenuItem>
                            <MenuItem value="mysteryShopping">Mystery Shopping</MenuItem>
                            <MenuItem value="sla">Service Level Agreement</MenuItem>
                            <MenuItem value="controversial">Controversial</MenuItem>
                            <MenuItem value="innovation">Innovation</MenuItem>
                            <MenuItem value="stakeholder">Stakeholder Engagement</MenuItem>
                            <MenuItem value="transparency">Transparency</MenuItem>
                            <MenuItem value="reportGovResolution">Report Gov Resolution</MenuItem>
                            <MenuItem value="monthlyReport">Monthly Report Submission</MenuItem>
                            <MenuItem value="timeliness">Timeliness</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: 160, flexShrink: 0 }} variant="outlined" size="small">
                        <InputLabel id="filter-label">Filter MDAs</InputLabel>
                        <Select
                            labelId="filter-label"
                            id="filter-select"
                            value={mdaFilter}
                            onChange={(e) => setMdaFilter(e.target.value as 'all' | 'withData')}
                            label="Filter MDAs"
                        >
                            <MenuItem value="all">All MDAs</MenuItem>
                            <MenuItem value="withData">MDAs with Data</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: 180, flexShrink: 0 }} variant="outlined" size="small">
                        <InputLabel id="ministry-filter-label">Ministry Filter</InputLabel>
                        <Select
                            labelId="ministry-filter-label"
                            id="ministry-filter-select"
                            value={ministryFilter}
                            onChange={(e) => setMinistryFilter(e.target.value as 'all' | 'ministries-only' | 'without-ministries')}
                            label="Ministry Filter"
                        >
                            <MenuItem value="all">All Organizations</MenuItem>
                            <MenuItem value="ministries-only">Ministries Only</MenuItem>
                            <MenuItem value="without-ministries">Exclude Ministries</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: 120, flexShrink: 0 }} variant="outlined" size="small">
                        <InputLabel id="year-label">Year</InputLabel>
                        <Select
                            labelId="year-label"
                            id="year-select"
                            value={dashboardYear}
                            onChange={(e) => setDashboardYear(Number(e.target.value))}
                            label="Year"
                        >
                            {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                                <MenuItem key={year} value={year}>{year}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <button
                        onClick={handleGenerateDashboardPDF}
                        disabled={liveDashboardData === undefined || !Array.isArray(liveDashboardData) || liveDashboardData.length === 0}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap h-10"
                    >
                        📥 Download PDF
                    </button>
                    <BulkPdfDownloader
                        mdaData={processDashboardMdaData(mdaFilter, ministryFilter)}
                        year={dashboardYear}
                    />
                </div>
            </div>
            <p className="text-sm text-gray-600">
                View {mdaFilter === 'all' ? 'all' : 'MDAs with data'} {
                    ministryFilter === 'ministries-only' ? 'ministries' :
                        ministryFilter === 'without-ministries' ? 'non-ministry organizations' :
                            'organizations'
                } with their saved metric scores. Data is averaged across both halves (1st Half & 2nd Half) for the selected year.
            </p>
        </div>
    );
}
