'use client';

import React from 'react';
import { getMonthsForPeriod } from '../../utils/helpers';

interface ScoringPeriodInfoProps {
    scoringPeriod: string;
    currentYear: number;
}

export default function ScoringPeriodInfo({
    scoringPeriod,
    currentYear
}: ScoringPeriodInfoProps) {
    const months = getMonthsForPeriod(scoringPeriod);
    const periodYear = scoringPeriod.match(/\d{4}/)?.[0] || String(currentYear);

    return (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="text-sm font-semibold text-green-800 mb-2">
                📅 Scoring Period: {scoringPeriod}
            </h3>
            <div className="text-xs text-green-700 space-y-1">
                <p>Evaluating months: {months.map(m =>
                    new Date(m.year, m.month, 1).toLocaleString('default', { month: 'short' })
                ).join(', ')}</p>
                <p>Total months in period: {months.length}</p>
                <p>Year: {periodYear}</p>
            </div>
        </div>
    );
}
