'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';

interface PastPerformanceInfoProps {
    pastScoringData: {
        pastScores: string | number | null;
        lastScored: number | null;
    } | null;
}

export default function PastPerformanceInfo({
    pastScoringData
}: PastPerformanceInfoProps) {
    if (!pastScoringData) return null;

    return (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Past Performance Data (Used for Averaging)
            </h3>
            <div className="text-xs text-blue-700 space-y-1">
                <p>Previous scoring periods: {pastScoringData.pastScores}</p>
                <p>Last scored: {pastScoringData.lastScored ? new Date(pastScoringData.lastScored).toLocaleDateString() : 'N/A'}</p>
                <p>Current calculation: 70% current score + 30% past average</p>
            </div>
        </div>
    );
}
