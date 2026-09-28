'use client';

import React from 'react';
import { AlertTriangle, Ban, CheckCircle2 } from 'lucide-react';

interface MDAStatusDisplayProps {
    selectedMda: string;
    mdasList: any[];
    mdasWithScores: any[] | undefined;
    mdaScoringStatus: {
        hasScore: boolean;
        existingScore: any;
    } | undefined;
}

export default function MDAStatusDisplay({
    selectedMda,
    mdasList,
    mdasWithScores,
    mdaScoringStatus
}: MDAStatusDisplayProps) {
    if (!selectedMda) return null;

    // Find the matching MDA in the database
    const selectedMdaFromList = mdasList.find(m => m.name === selectedMda);
    const isActive = mdasWithScores?.find(m =>
        m.name === selectedMda ||
        (selectedMdaFromList && m.name === `${selectedMdaFromList.abbreviation} - ${selectedMda}`) ||
        m.name.includes(selectedMda) ||
        (selectedMdaFromList && selectedMda.includes(m.name.replace(/^[^-]+ - /, '')))
    );

    // Check if this MDA already has a score for the current period
    const hasScoreForPeriod = mdaScoringStatus?.hasScore || false;
    const existingScore = mdaScoringStatus?.existingScore;

    return (
        <div className={`p-4 rounded-lg border ${hasScoreForPeriod
            ? 'bg-red-50 border-red-200'
            : isActive
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}>
            <h3 className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${hasScoreForPeriod
                ? 'text-red-800'
                : isActive
                    ? 'text-green-800'
                    : 'text-yellow-800'
                }`}>
                {hasScoreForPeriod
                    ? <><Ban className="h-4 w-4" />MDA Already Scored for This Period</>
                    : isActive
                        ? <><CheckCircle2 className="h-4 w-4" />MDA Active on Platform</>
                        : <><AlertTriangle className="h-4 w-4" />MDA Not Active on Platform</>
                }
            </h3>
            <div className={`text-xs space-y-1 ${hasScoreForPeriod
                ? 'text-red-700'
                : isActive
                    ? 'text-green-700'
                    : 'text-yellow-700'
                }`}>
                <p>Selected MDA: {selectedMda}</p>
                {hasScoreForPeriod && existingScore && (
                    <>
                        <p>Existing Score: {existingScore.totalPercentage.toFixed(1)}%</p>
                        <p>Grade: {existingScore.grade}</p>
                        <p>Status: {existingScore.status}</p>
                        <p>Scored on: {new Date(existingScore.scoredAt).toLocaleDateString()}</p>
                    </>
                )}
                {!hasScoreForPeriod && isActive && (
                    <p>Database Name: {isActive.name}</p>
                )}
                {!hasScoreForPeriod && (
                    isActive
                        ? <p>Live data available - automatic scoring enabled</p>
                        : <p>Manual scoring only - no live ticket/report data available</p>
                )}
            </div>
        </div>
    );
}
