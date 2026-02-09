'use client';

import React from 'react';
import { MenuItem, Select } from '@mui/material';

interface BooleanMetricCardProps {
    title: string;
    isLoading: boolean;
    isSaved: boolean;
    points: number; // The score value if Yes is selected
    pointsLabel: string;
    value: boolean;
    setValue: (val: boolean) => void;
    handleSave: () => void;
    selectedMda: string;
    maxPossibleScore?: number; // Optional, for display like "5/5" instead of just "5 points"
}

export default function BooleanMetricCard({
    title,
    isLoading,
    isSaved,
    points,
    pointsLabel,
    value,
    setValue,
    handleSave,
    selectedMda,
    maxPossibleScore
}: BooleanMetricCardProps) {
    const currentScore = value ? points : 0;

    return (
        <div className="bg-gray-100/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    {isLoading && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                            🔄 Loading...
                        </span>
                    )}
                    {!isLoading && isSaved && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            💾 Saved
                        </span>
                    )}
                </div>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {pointsLabel}
                </span>
            </div>

            <Select
                value={value ? 'yes' : 'no'}
                onChange={(e) => setValue(e.target.value === 'yes')}
                className="w-full mb-3 bg-white"
                size="small"
            >
                <MenuItem value="no">No</MenuItem>
                <MenuItem value="yes">Yes</MenuItem>
            </Select>

            <div className="text-center mb-3">
                Score: {currentScore.toFixed(1)}{maxPossibleScore ? `/${maxPossibleScore}` : ' points'}
            </div>

            <button
                onClick={handleSave}
                disabled={!selectedMda}
                className={`w-full py-2 px-4 rounded-lg text-white text-sm font-medium transition-colors ${!selectedMda
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                    }`}
            >
                💾 Save
            </button>
        </div>
    );
}
