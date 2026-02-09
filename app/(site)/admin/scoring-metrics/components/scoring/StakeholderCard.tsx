'use client';

import React from 'react';
import { MenuItem, Select } from '@mui/material';

interface StakeholderCardProps {
    isLoading: boolean;
    isSaved: boolean;
    rate: number;
    setRate: (val: number) => void;
    handleSave: () => void;
    selectedMda: string;
}

export default function StakeholderCard({
    isLoading,
    isSaved,
    rate,
    setRate,
    handleSave,
    selectedMda
}: StakeholderCardProps) {
    return (
        <div className="bg-gray-100/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Stakeholder Engagement</h2>
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
                    10 Points
                </span>
            </div>

            <Select
                value={rate || 0}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full mb-3 bg-white"
                size="small"
            >
                {[...Array(11)].map((_, i) => (
                    <MenuItem key={i} value={i}>{i}</MenuItem>
                ))}
            </Select>

            <div className="text-center mb-3">
                Score: {rate.toFixed(1)}/10
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
