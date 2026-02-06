'use client';

import React from 'react';
import DashboardHeader from '../dashboard/DashboardHeader';
import DashboardTable from '../dashboard/DashboardTable';
import Top10Table from '../dashboard/Top10Table';
import Bottom10Table from '../dashboard/Bottom10Table';
import ViewDetailsModal from '../dashboard/ViewDetailsModal';

interface LiveDashboardTabProps {
    // Data
    liveDashboardData: any[] | undefined;

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
    viewDetailsData,
    setViewDetailsData,
    isLoadingDetails,
    setIsLoadingDetails,
    processDashboardMdaData,
    handleGenerateDashboardPDF,
    convex
}: LiveDashboardTabProps) {
    return (
        <div className="w-full space-y-6">
            {/* Dashboard Header with Filters and Controls */}
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
            />

            {/* Main Dashboard Table */}
            <DashboardTable
                liveDashboardData={liveDashboardData}
                processDashboardMdaData={processDashboardMdaData}
                mdaFilter={mdaFilter}
                ministryFilter={ministryFilter}
                selectedMetric={selectedMetric}
                setViewDetailsMda={setViewDetailsMda}
                setIsLoadingDetails={setIsLoadingDetails}
                dashboardYear={dashboardYear}
                convex={convex}
            />

            {/* Top 10 and Bottom 10 Tables */}
            {liveDashboardData !== undefined && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Top10Table
                        processDashboardMdaData={processDashboardMdaData}
                        mdaFilter={mdaFilter}
                        ministryFilter={ministryFilter}
                        selectedMetric={selectedMetric}
                    />
                    <Bottom10Table
                        processDashboardMdaData={processDashboardMdaData}
                        mdaFilter={mdaFilter}
                        ministryFilter={ministryFilter}
                        selectedMetric={selectedMetric}
                    />
                </div>
            )}

            {/* View Details Modal */}
            <ViewDetailsModal
                viewDetailsMda={viewDetailsMda}
                setViewDetailsMda={setViewDetailsMda}
                viewDetailsData={viewDetailsData}
                setViewDetailsData={setViewDetailsData}
                isLoadingDetails={isLoadingDetails}
                setIsLoadingDetails={setIsLoadingDetails}
                dashboardYear={dashboardYear}
            />
        </div>
    );
}
