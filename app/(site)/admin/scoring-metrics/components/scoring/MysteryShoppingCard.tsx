'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import ScoreActionButtons from './ScoreActionButtons';
import MetricStatusBadge from './MetricStatusBadge';

interface MysteryShoppingCardProps {
    isLoading: boolean;
    isSaved: boolean;
    setShowRanking: (show: boolean) => void;
    setShowModal: (show: boolean) => void;
    score: number;
    handleSave: () => void;
    handleClear?: () => void;
    selectedMda: string;
    hasRatings: boolean;
    maxPoints?: number; // Dynamic max points from config
}

export default function MysteryShoppingCard({
    isLoading,
    isSaved,
    setShowRanking,
    setShowModal,
    score,
    handleSave,
    handleClear,
    selectedMda,
    hasRatings,
    maxPoints = 20 // Default to 20 for 2025
}: MysteryShoppingCardProps) {
    return (
        <div className="bg-gray-100/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Mystery Shopping</h2>
                    <MetricStatusBadge isLoading={isLoading} isSaved={isSaved} />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowRanking(true)}
                        className="inline-flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
                        title="View all MDAs ranked by Mystery Shopping score"
                    >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Rankings
                    </button>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {maxPoints} Points
                    </span>
                </div>
            </div>

            <div className="space-y-3">
                <button
                    onClick={() => setShowModal(true)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Open Mystery Shopping Assessment
                </button>


                <div className="text-center">
                    Score: {score.toFixed(1)}/{maxPoints}
                </div>

                <ScoreActionButtons
                    onSave={handleSave}
                    onClear={handleClear}
                    saveLabel="Save Score"
                    disabled={!selectedMda || (!hasRatings && !isSaved)}
                    isSaved={isSaved}
                />
            </div>
        </div>
    );
}
