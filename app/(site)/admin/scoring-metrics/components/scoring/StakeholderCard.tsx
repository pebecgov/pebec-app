'use client';

import React from 'react';
import { MenuItem, Select } from '@mui/material';
import ScoreActionButtons from './ScoreActionButtons';
import MetricStatusBadge from './MetricStatusBadge';

interface StakeholderCardProps {
    isLoading: boolean;
    isSaved: boolean;
    rate: number;
    setRate: (val: number) => void;
    handleSave: () => void;
    handleClear?: () => void;
    selectedMda: string;
}

export default function StakeholderCard({
    isLoading,
    isSaved,
    rate,
    setRate,
    handleSave,
    handleClear,
    selectedMda
}: StakeholderCardProps) {
    return (
        <div className="bg-gray-100/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Stakeholder Engagement</h2>
                    <MetricStatusBadge isLoading={isLoading} isSaved={isSaved} />
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

            <ScoreActionButtons
                onSave={handleSave}
                onClear={handleClear}
                saveLabel="Save Score"
                disabled={!selectedMda}
                isSaved={isSaved}
            />
        </div>
    );
}
