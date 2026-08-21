'use client';

import React from 'react';
import DashboardHeader from '../dashboard/DashboardHeader';
import DashboardTable from '../dashboard/DashboardTable';
import Top10Table from '../dashboard/Top10Table';
import Bottom10Table from '../dashboard/Bottom10Table';
import ViewDetailsModal from '../dashboard/ViewDetailsModal';

interface LiveDashboardTabProps {
    // Data
    liveDashboardData: any | undefined;
    efficiencyConfig: any;
    othersConfig: any;
    penaltyConfig: any;
    bonusConfig: any;
    mysteryConfig: any;

    // Filters & Selection
    selectedMetric: string;
    setSelectedMetric: (metric: string) => void;
    mdaFilter: 'all' | 'withData';
    setMdaFilter: (filter: 'all' | 'withData') => void;
    ministryFilter: 'all' | 'ministries-only' | 'without-ministries';
    setMinistryFilter: (filter: 'all' | 'ministries-only' | 'without-ministries') => void;
    dashboardYear: number;
    setDashboardYear: (year: number) => void;
    currentYear: number;

    // Modal state
    viewDetailsMda: string | null;
    setViewDetailsMda: (mda: string | null) => void;
    viewDetailsRow: any | null;
    setViewDetailsRow: (row: any | null) => void;
    viewDetailsData: any | null;
    setViewDetailsData: (data: any | null) => void;
    isLoadingDetails: boolean;
    setIsLoadingDetails: (loading: boolean) => void;

    // Functions
    processDashboardMdaData: (filter: 'all' | 'withData', ministryFilter: 'all' | 'ministries-only' | 'without-ministries') => any[];
    handleGenerateDashboardPDF: () => void;

    // Convex
    convex: any;
}

export default function LiveDashboardTab({
    liveDashboardData,
    efficiencyConfig,
    othersConfig,
    penaltyConfig,
    bonusConfig,
    mysteryConfig,
    selectedMetric,
    setSelectedMetric,
    mdaFilter,
    setMdaFilter,
    ministryFilter,
    setMinistryFilter,
    dashboardYear,
    setDashboardYear,
    currentYear,
    viewDetailsMda,
    setViewDetailsMda,
    viewDetailsRow,
    setViewDetailsRow,
    viewDetailsData,
    setViewDetailsData,
    isLoadingDetails,
    setIsLoadingDetails,
    processDashboardMdaData,
    handleGenerateDashboardPDF,
    convex
}: LiveDashboardTabProps) {
    const hasData = liveDashboardData?.data !== undefined;

    return (
        <div className="w-full space-y-6">

            <section className="space-y-4">
                <DashboardHeader
                    selectedMetric={selectedMetric}
                    setSelectedMetric={setSelectedMetric}
                    mdaFilter={mdaFilter}
                    setMdaFilter={setMdaFilter}
                    ministryFilter={ministryFilter}
                    setMinistryFilter={setMinistryFilter}
                    dashboardYear={dashboardYear}
                    setDashboardYear={setDashboardYear}
                    currentYear={currentYear}
                    handleGenerateDashboardPDF={handleGenerateDashboardPDF}
                    liveDashboardData={liveDashboardData}
                    processDashboardMdaData={processDashboardMdaData}
                    othersConfig={othersConfig}
                    penaltyConfig={penaltyConfig}
                />

                <DashboardTable
                    liveDashboardData={liveDashboardData?.data}
                    efficiencyConfig={liveDashboardData?.efficiencyConfig || efficiencyConfig}
                    othersConfig={othersConfig}
                    penaltyConfig={penaltyConfig}
                    bonusConfig={bonusConfig}
                    mysteryConfig={mysteryConfig}
                    processDashboardMdaData={processDashboardMdaData}
                    mdaFilter={mdaFilter}
                    ministryFilter={ministryFilter}
                    selectedMetric={selectedMetric}
                    setViewDetailsMda={setViewDetailsMda}
                    setViewDetailsRow={setViewDetailsRow}
                    setIsLoadingDetails={setIsLoadingDetails}
                    dashboardYear={dashboardYear}
                    convex={convex}
                />
            </section>

            {/* Top 10 and Bottom 10 Tables */}
            {hasData && (
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Leaderboard Snapshot</h3>
                        <span className="text-xs sm:text-sm text-gray-500">Top and bottom performers for current filters</span>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <Top10Table
                        processDashboardMdaData={processDashboardMdaData}
                        mdaFilter={mdaFilter}
                        ministryFilter={ministryFilter}
                        selectedMetric={selectedMetric}
                        dashboardYear={dashboardYear}
                    />
                    <Bottom10Table
                        processDashboardMdaData={processDashboardMdaData}
                        mdaFilter={mdaFilter}
                        ministryFilter={ministryFilter}
                        selectedMetric={selectedMetric}
                        dashboardYear={dashboardYear}
                    />
                    </div>
                </section>
            )}

            {/* View Details Modal */}
            <ViewDetailsModal
                viewDetailsMda={viewDetailsMda}
                setViewDetailsMda={setViewDetailsMda}
                viewDetailsRow={viewDetailsRow}
                setViewDetailsRow={setViewDetailsRow}
                viewDetailsData={viewDetailsData}
                setViewDetailsData={setViewDetailsData}
                isLoadingDetails={isLoadingDetails}
                setIsLoadingDetails={setIsLoadingDetails}
                dashboardYear={dashboardYear}
            />
        </div>
    );
}
